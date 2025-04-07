const promotionModel = require('../domain/models/promotion.model');
const productModel = require('../domain/models/product.model');
const categoryModel = require('../domain/models/category.model');
const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const mongoose = require('mongoose');

class PromotionService {
   // Create new promotion
   async createPromotion({ name, value, startDate, endDate, categoryId }) {
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
         throw new BadRequestError('End date must be after start date');
      }

      // Validate value
      if (value < 0 || value > 100) {
         throw new BadRequestError('Promotion value must be between 0 and 100');
      }

      // Validate category
      const category = await categoryModel.findById(categoryId);
      if (!category) {
         throw new NotFoundError('Category not found');
      }

      // Use a transaction to ensure consistency
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         // Create promotion
         const promotion = await promotionModel.create(
            [
               {
                  promotion_name: name,
                  promotion_value: value,
                  promotion_start_date: start,
                  promotion_end_date: end,
                  category_id: categoryId,
               },
            ],
            { session },
         );

         // Update category with promotion
         await categoryModel.findByIdAndUpdate(
            categoryId,
            {
               category_promotion: promotion[0]._id,
            },
            { session },
         );

         // Update all products in this category and its subcategories
         await this.updateProductsPromotions(promotion[0], categoryId, session);

         await session.commitTransaction();
         return promotion[0];
      } catch (error) {
         await session.abortTransaction();
         console.error('Error creating promotion:', error);
         throw new BadRequestError(
            error.message || 'Failed to create promotion',
         );
      } finally {
         session.endSession();
      }
   }

   // Get promotions with pagination and filters
   async getPromotions({ page = 1, limit = 10, startDate, endDate, active }) {
      const skip = (page - 1) * limit;

      // Build query
      let query = {};
      if (startDate) query.promotion_start_date = { $gte: new Date(startDate) };
      if (endDate) query.promotion_end_date = { $lte: new Date(endDate) };

      // Filter active promotions
      if (active === 'true') {
         const now = new Date();
         query.promotion_start_date = { $lte: now };
         query.promotion_end_date = { $gt: now };
      }

      // Get total count
      const total = await promotionModel.countDocuments(query);

      // Get promotions with populated category
      const promotions = await promotionModel
         .find(query)
         .populate({
            path: 'category_id',
            select: 'category_name category_parentId category_slug',
            model: 'Category',
         })
         .sort({ promotion_end_date: -1 })
         .skip(skip)
         .limit(limit);

      // Transform data with category info
      const transformedPromotions = promotions.map((promotion) => {
         const promotionObj = promotion.toObject({ virtuals: true });

         return {
            _id: promotionObj._id,
            promotion_name: promotionObj.promotion_name,
            promotion_value: promotionObj.promotion_value,
            promotion_start_date: promotionObj.promotion_start_date,
            promotion_end_date: promotionObj.promotion_end_date,
            is_active: promotionObj.is_active,
            category: promotionObj.category_id
               ? {
                    id: promotionObj.category_id._id,
                    name: promotionObj.category_id.category_name,
                    parent_id: promotionObj.category_id.category_parentId,
                    slug: promotionObj.category_id.category_slug,
                 }
               : null,
            createdAt: promotionObj.createdAt,
            updatedAt: promotionObj.updatedAt,
         };
      });

      return {
         data: transformedPromotions,
         pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
         },
      };
   }

   // Get promotion by ID
   async getPromotionById(id) {
      const promotion = await promotionModel
         .findById(id)
         .populate(
            'category_id',
            'category_name category_parentId category_slug',
         );

      if (!promotion) {
         throw new NotFoundError('Promotion not found');
      }

      const promotionObj = promotion.toObject({ virtuals: true });

      // Get count of products using this promotion
      const productCount = await productModel.countDocuments({
         'product_promotion.promotion_id': promotion._id,
      });

      return {
         _id: promotionObj._id,
         promotion_name: promotionObj.promotion_name,
         promotion_value: promotionObj.promotion_value,
         promotion_start_date: promotionObj.promotion_start_date,
         promotion_end_date: promotionObj.promotion_end_date,
         is_active: promotionObj.is_active,
         product_count: productCount,
         category: promotionObj.category_id
            ? {
                 id: promotionObj.category_id._id,
                 name: promotionObj.category_id.category_name,
                 parent_id: promotionObj.category_id.category_parentId,
                 slug: promotionObj.category_id.category_slug,
              }
            : null,
         createdAt: promotionObj.createdAt,
         updatedAt: promotionObj.updatedAt,
      };
   }

   // Update promotion
   async updatePromotion(updateData) {
      const { id, name, value, startDate, endDate, categoryId } = updateData;

      // Validate required fields
      if (!id) {
         throw new BadRequestError('Promotion ID is required');
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
         throw new BadRequestError('End date must be after start date');
      }

      // Validate value
      if (value < 0 || value > 100) {
         throw new BadRequestError('Promotion value must be between 0 and 100');
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         // Find existing promotion
         const promotion = await promotionModel.findById(id);
         if (!promotion) {
            throw new NotFoundError('Promotion not found');
         }

         // If category is changing, remove promotion from old category
         if (categoryId !== promotion.category_id.toString()) {
            await categoryModel.findByIdAndUpdate(
               promotion.category_id,
               { $unset: { category_promotion: '' } },
               { session },
            );

            // Remove promotion from products of old category
            await productModel.updateMany(
               { 'product_promotion.promotion_id': promotion._id },
               { $unset: { product_promotion: '' } },
               { session },
            );
         }

         // Update all fields
         promotion.promotion_name = name;
         promotion.promotion_value = value;
         promotion.promotion_start_date = start;
         promotion.promotion_end_date = end;
         promotion.category_id = categoryId;

         await promotion.save({ session });

         // Update category with promotion
         await categoryModel.findByIdAndUpdate(
            categoryId,
            { category_promotion: promotion._id },
            { session },
         );

         // Update all products in this category
         await this.updateProductsPromotions(promotion, categoryId, session);

         await session.commitTransaction();

         // Return updated promotion
         const updatedPromotion = await promotionModel
            .findById(id)
            .populate(
               'category_id',
               'category_name category_parentId category_slug',
            );

         const promotionObj = updatedPromotion.toObject({ virtuals: true });

         // Get count of products using this promotion
         const productCount = await productModel.countDocuments({
            'product_promotion.promotion_id': updatedPromotion._id,
         });

         return {
            _id: promotionObj._id,
            promotion_name: promotionObj.promotion_name,
            promotion_value: promotionObj.promotion_value,
            promotion_start_date: promotionObj.promotion_start_date,
            promotion_end_date: promotionObj.promotion_end_date,
            is_active: promotionObj.is_active,
            product_count: productCount,
            category: promotionObj.category_id
               ? {
                    id: promotionObj.category_id._id,
                    name: promotionObj.category_id.category_name,
                    parent_id: promotionObj.category_id.category_parentId,
                    slug: promotionObj.category_id.category_slug,
                 }
               : null,
            createdAt: promotionObj.createdAt,
            updatedAt: promotionObj.updatedAt,
         };
      } catch (error) {
         await session.abortTransaction();
         console.error('Error updating promotion:', error);
         throw new BadRequestError(
            error.message || 'Failed to update promotion',
         );
      } finally {
         session.endSession();
      }
   }

   // Delete promotion
   async deletePromotion(id) {
      const promotion = await promotionModel.findById(id);
      if (!promotion) {
         throw new NotFoundError('Promotion not found');
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         // Remove promotion from category
         await categoryModel.findByIdAndUpdate(
            promotion.category_id,
            { $unset: { category_promotion: '' } },
            { session },
         );

         // Remove promotion from all affected products
         await productModel.updateMany(
            { 'product_promotion.promotion_id': promotion._id },
            { $unset: { product_promotion: '' } },
            { session },
         );

         await promotionModel.findByIdAndDelete(id, { session });

         await session.commitTransaction();
         return { success: true };
      } catch (error) {
         await session.abortTransaction();
         console.error('Error deleting promotion:', error);
         throw new BadRequestError(
            error.message || 'Failed to delete promotion',
         );
      } finally {
         session.endSession();
      }
   }

   // Update products promotions
   async updateProductsPromotions(promotion, categoryId, session) {
      // Get all subcategories of this category
      const allCategories = await this.getAllSubcategories(categoryId);
      allCategories.push(categoryId); // Include the parent category

      // Update all products in the category and its subcategories
      await productModel.updateMany(
         { product_category: { $in: allCategories } },
         {
            product_promotion: {
               promotion_id: promotion._id,
               current_discount: promotion.promotion_value,
               start_date: promotion.promotion_start_date,
               end_date: promotion.promotion_end_date,
            },
         },
         { session },
      );

      return true;
   }

   // Helper method to get all subcategories recursively
   async getAllSubcategories(categoryId) {
      const subcategories = await categoryModel
         .find({
            category_parentId: categoryId,
         })
         .select('_id');

      let allSubcategories = subcategories.map((c) => c._id.toString());

      // Recursively get subcategories of subcategories
      for (const subcategory of subcategories) {
         const nestedSubcategories = await this.getAllSubcategories(
            subcategory._id,
         );
         allSubcategories = [...allSubcategories, ...nestedSubcategories];
      }

      return allSubcategories;
   }

   // Update promotion status
   async cleanupExpiredPromotions() {
      const now = new Date();

      // Find expired promotions
      const expiredPromotions = await promotionModel.find({
         promotion_end_date: { $lte: now },
      });

      // Remove expired promotions from products
      for (const promotion of expiredPromotions) {
         await productModel.updateMany(
            { 'product_promotion.promotion_id': promotion._id },
            { $unset: { product_promotion: '' } },
         );
      }

      return { cleaned: expiredPromotions.length };
   }
}

module.exports = new PromotionService();
