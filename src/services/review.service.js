const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const invoiceModel = require('../domain/models/invoice.model');
const reviewModel = require('../domain/models/review.model');
const userModel = require('../domain/models/user.model');
const productModel = require('../domain/models/product.model');
const VoucherService = require('./voucher.service');
const { INVOICE_STATUS } = require('../domain/constants/domain');
const mongoose = require('mongoose');
const crypto = require('crypto');

class ReviewService {
   async getAllByProductId(req) {
      const { productId } = req.params;
      const {
         _page = 1,
         _limit = 10,
         _star,
         _sortBy = 'createdAt',
      } = req.query;

      // Validate product ID format
      if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
         throw new BadRequestError('Invalid product ID');
      }

      // Convert pagination params to numbers
      const page = parseInt(_page);
      const limit = parseInt(_limit);
      const skip = (page - 1) * limit;

      // Validate pagination params
      if (isNaN(page) || page < 1) {
         throw new BadRequestError('Page must be a positive number');
      }

      if (isNaN(limit) || limit < 1) {
         throw new BadRequestError('Limit must be a positive number');
      }

      // Build query
      const query = { review_product: productId };

      // Add star filter if specified
      if (_star && !isNaN(parseInt(_star))) {
         const star = parseInt(_star);
         if (star >= 1 && star <= 5) {
            query.review_rating = star;
         }
      }

      // Set sort options based on _sortBy parameter
      let sortOptions = {};
      if (_sortBy === 'star' || _sortBy === 'review_rating') {
         sortOptions = { review_rating: -1, createdAt: -1 }; // Sort by rating (high to low) then by date
      } else {
         sortOptions = { createdAt: -1 }; // Default: sort by newest first
      }

      // Find all reviews for this product and populate user information
      const reviews = await reviewModel
         .find(query)
         .populate({
            path: 'review_user',
            select: 'email profile_firstName profile_lastName profile_img',
         })
         .sort(sortOptions) // Use dynamic sort options
         .skip(skip)
         .limit(limit)
         .lean();

      // Calculate average rating
      const totalReviews = reviews.length;

      const totalPages = Math.ceil(totalReviews / limit);

      // Format the response
      return {
         reviews,
         meta: {
            totalItems: totalReviews,
            totalPages,
            currentPage: page,
            itemsPerPage: limit,
         },
      };
   }

   async create(req) {
      const { email } = req.user;
      const { productId } = req.params;
      const { content, review_rating } = req.body;

      // Validate rating
      if (!review_rating || review_rating < 1 || review_rating > 5) {
         throw new BadRequestError('Rating must be between 1 and 5');
      }

      // 1. Get user ID from email
      const user = await userModel.findOne({ email });
      if (!user) {
         throw new NotFoundError('User not found');
      }

      // 2. Check if user has bought the product by looking through their invoices
      const userInvoices = await invoiceModel.find({
         invoice_user: user._id,
         'invoice_products.product_id': productId,
         invoice_status: INVOICE_STATUS.DELIVERED, // Allow reviews only for delivered products
      });

      if (!userInvoices || userInvoices.length === 0) {
         throw new BadRequestError(
            'You can only review products you have purchased',
         );
      }

      // Find invoices that have not been reviewed yet
      const reviewedInvoices = await reviewModel
         .find({
            review_user: user._id,
            review_product: productId,
         })
         .select('review_invoice');

      const reviewedInvoiceIds = reviewedInvoices.map((review) =>
         review.review_invoice.toString(),
      );

      const availableInvoices = userInvoices.filter(
         (invoice) => !reviewedInvoiceIds.includes(invoice._id.toString()),
      );

      if (availableInvoices.length === 0) {
         throw new BadRequestError(
            'You have already reviewed this product for all your purchases',
         );
      }

      // 4. Create the review using the invoice ID from the oldest non-reviewed purchase
      const invoiceToReview = availableInvoices[0];

      // Use a session to ensure all operations succeed or fail together
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         // Create the review
         const newReview = await reviewModel.create(
            [
               {
                  review_user: user._id,
                  review_product: productId,
                  review_invoice: invoiceToReview._id,
                  review_content: content,
                  review_rating: review_rating,
                  voucher_generated: false,
               },
            ],
            { session },
         );

         // 5. Update product average_rating and rating_star
         // Get all reviews for this product to calculate new average
         const productReviews = await reviewModel.find(
            {
               review_product: productId,
            },
            null,
            { session },
         );

         const totalReviews = productReviews.length;
         const averageRating =
            totalReviews > 0
               ? productReviews.reduce(
                    (sum, review) => sum + review.review_rating,
                    0,
                 ) / totalReviews
               : 0;

         // Count occurrences of each star rating
         const starCounts = [0, 0, 0, 0, 0]; // Index 0 = 1 star, index 4 = 5 stars
         productReviews.forEach((review) => {
            const ratingIndex = review.review_rating - 1; // Convert 1-5 to 0-4 index
            starCounts[ratingIndex]++;
         });

         // Update product with new rating data
         await productModel.findByIdAndUpdate(
            productId,
            {
               $set: {
                  'average_rating.average_value': parseFloat(
                     averageRating.toFixed(1),
                  ),
                  'average_rating.rating_count': totalReviews,
                  rating_star: [
                     { star: 1, star_count: starCounts[0] },
                     { star: 2, star_count: starCounts[1] },
                     { star: 3, star_count: starCounts[2] },
                     { star: 4, star_count: starCounts[3] },
                     { star: 5, star_count: starCounts[4] },
                  ],
               },
            },
            { session },
         );

         // 6. Generate a voucher for the user as a reward for the review using VoucherService
         const voucher = await VoucherService.generateReviewVoucher(
            user,
            newReview[0]._id,
         );

         // Update the review to reference the generated voucher
         await reviewModel.findByIdAndUpdate(
            newReview[0]._id,
            {
               $set: {
                  voucher_generated: true,
                  voucher_id: voucher._id,
               },
            },
            { session },
         );

         // Commit the transaction
         await session.commitTransaction();
         session.endSession();

         return true;
      } catch (error) {
         // If anything fails, abort the transaction
         await session.abortTransaction();
         session.endSession();
         console.error('Error creating review:', error);
         throw new BadRequestError(error.message || 'Failed to create review');
      }
   }

   async update(req) {
      const { email } = req.user;
      const { reviewId } = req.params;
      const { content, review_rating } = req.body;

      // 1. Check if review ID is valid
      if (!reviewId || !reviewId.match(/^[0-9a-fA-F]{24}$/)) {
         throw new BadRequestError('Invalid review ID');
      }

      // Validate rating
      if (review_rating && (review_rating < 1 || review_rating > 5)) {
         throw new BadRequestError('Rating must be between 1 and 5');
      }

      // 2. Get user ID from email
      const user = await userModel.findOne({ email });
      if (!user) {
         throw new NotFoundError('User not found');
      }

      // 3. Find the review and check if it belongs to the user
      const review = await reviewModel.findById(reviewId);

      if (!review) {
         throw new NotFoundError('Review not found');
      }

      // 4. Verify the review belongs to the user
      if (review.review_user.toString() !== user._id.toString()) {
         throw new BadRequestError('You can only update your own reviews');
      }

      // Use a session to ensure both operations succeed or fail together
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         // 5. Update the review
         const updatedReview = await reviewModel.findByIdAndUpdate(
            reviewId,
            {
               $set: {
                  review_content: content || review.review_content,
                  review_rating: review_rating || review.review_rating,
               },
            },
            { new: true, session },
         );

         // 6. Update product ratings
         const productId = review.review_product;

         // Get all reviews for this product to recalculate
         const productReviews = await reviewModel.find(
            {
               review_product: productId,
            },
            null,
            { session },
         );

         const totalReviews = productReviews.length;
         const averageRating =
            totalReviews > 0
               ? productReviews.reduce(
                    (sum, rev) => sum + rev.review_rating,
                    0,
                 ) / totalReviews
               : 0;

         // Count occurrences of each star rating
         const starCounts = [0, 0, 0, 0, 0]; // Index 0 = 1 star, index 4 = 5 stars
         productReviews.forEach((rev) => {
            const ratingIndex = rev.review_rating - 1; // Convert 1-5 to 0-4 index
            starCounts[ratingIndex]++;
         });

         // Update product with new rating data
         await productModel.findByIdAndUpdate(
            productId,
            {
               $set: {
                  'average_rating.average_value': parseFloat(
                     averageRating.toFixed(1),
                  ),
                  'average_rating.rating_count': totalReviews,
                  rating_star: [
                     { star: 1, star_count: starCounts[0] },
                     { star: 2, star_count: starCounts[1] },
                     { star: 3, star_count: starCounts[2] },
                     { star: 4, star_count: starCounts[3] },
                     { star: 5, star_count: starCounts[4] },
                  ],
               },
            },
            { session, new: true },
         );

         await session.commitTransaction();
         session.endSession();

         return !!updatedReview;
      } catch (error) {
         await session.abortTransaction();
         session.endSession();
         console.error('Error updating review:', error);
         throw new BadRequestError(error.message || 'Failed to update review');
      }
   }

   async delete(req) {
      const { email } = req.user;
      const { reviewId } = req.params;

      // 1. Check if review ID is valid
      if (!reviewId || !reviewId.match(/^[0-9a-fA-F]{24}$/)) {
         throw new BadRequestError('Invalid review ID');
      }

      // 2. Get user ID from email
      const user = await userModel.findOne({ email });
      if (!user) {
         throw new NotFoundError('User not found');
      }

      // 3. Find the review and check if it belongs to the user
      const review = await reviewModel.findById(reviewId);

      if (!review) {
         throw new NotFoundError('Review not found');
      }

      // 4. Verify the review belongs to the user
      if (review.review_user.toString() !== user._id.toString()) {
         throw new BadRequestError('You can only delete your own reviews');
      }

      // Use a session for transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         // Store the product ID before deleting the review
         const productId = review.review_product;

         // 5. Delete the review
         await reviewModel.findByIdAndDelete(reviewId, { session });

         // 6. Update product ratings
         // Get remaining reviews for this product
         const productReviews = await reviewModel.find(
            {
               review_product: productId,
            },
            null,
            { session },
         );

         const totalReviews = productReviews.length;
         const averageRating =
            totalReviews > 0
               ? productReviews.reduce(
                    (sum, rev) => sum + rev.review_rating,
                    0,
                 ) / totalReviews
               : 0;

         // Count occurrences of each star rating
         const starCounts = [0, 0, 0, 0, 0]; // Index 0 = 1 star, index 4 = 5 stars
         productReviews.forEach((rev) => {
            const ratingIndex = rev.review_rating - 1; // Convert 1-5 to 0-4 index
            starCounts[ratingIndex]++;
         });

         // Update product with new rating data
         await productModel.findByIdAndUpdate(
            productId,
            {
               $set: {
                  'average_rating.average_value': parseFloat(
                     averageRating.toFixed(1),
                  ),
                  'average_rating.rating_count': totalReviews,
                  rating_star: [
                     { star: 1, star_count: starCounts[0] },
                     { star: 2, star_count: starCounts[1] },
                     { star: 3, star_count: starCounts[2] },
                     { star: 4, star_count: starCounts[3] },
                     { star: 5, star_count: starCounts[4] },
                  ],
               },
            },
            { session, new: true },
         );

         await session.commitTransaction();
         session.endSession();

         return true;
      } catch (error) {
         await session.abortTransaction();
         session.endSession();
         console.error('Error deleting review:', error);
         throw new BadRequestError(error.message || 'Failed to delete review');
      }
   }
}

module.exports = new ReviewService();
