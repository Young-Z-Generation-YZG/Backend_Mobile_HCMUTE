const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const invoiceModel = require('../domain/models/invoice.model');
const reviewModel = require('../domain/models/review.model');
const userModel = require('../domain/models/user.model');
const productModel = require('../domain/models/product.model');
const { INVOICE_STATUS } = require('../domain/constants/domain');
const mongoose = require('mongoose');

class ReviewService {
   async getAllByProductId(req) {
      const { productId } = req.params;

      // Validate product ID format
      if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
         throw new BadRequestError('Invalid product ID');
      }

      // Find all reviews for this product and populate user information
      const reviews = await reviewModel
         .find({ review_product: productId })
         .populate({
            path: 'review_user',
            select: 'email profile_firstName profile_lastName profile_img',
         })
         .sort({ createdAt: -1 }); // Sort by newest first

      // Calculate average rating
      const totalReviews = reviews.length;
      const averageRating =
         totalReviews > 0
            ? reviews.reduce((sum, review) => sum + review.review_rating, 0) /
              totalReviews
            : 0;

      // Format the response
      return {
         reviews,
         metadata: {
            total: totalReviews,
            averageRating: parseFloat(averageRating.toFixed(1)),
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
         invoice_status: INVOICE_STATUS.DELIVERED, // Assuming you only want to allow reviews for delivered products
      });

      if (!userInvoices || userInvoices.length === 0) {
         throw new BadRequestError(
            'You can only review products you have purchased',
         );
      }

      // 3. Check if user has already reviewed this product
      const existingReview = await reviewModel.findOne({
         review_user: user._id,
         review_product: productId,
      });

      if (existingReview) {
         throw new BadRequestError('You have already reviewed this product');
      }

      // 4. Create the review using the invoice ID from the most recent purchase
      const latestInvoice = userInvoices[userInvoices.length - 1];

      // Use a session to ensure both operations (review creation and product update) succeed or fail together
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         // Create the review
         const newReview = await reviewModel.create(
            [
               {
                  review_user: user._id,
                  review_product: productId,
                  review_invoice: latestInvoice._id,
                  review_content: content,
                  review_rating: review_rating,
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
