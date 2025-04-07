'use strict';

const productModel = require('../domain/models/product.model');
const {
   minimumCloudinaryImg,
} = require('../infrastructure/utils/minimum-cloudinary-img');
const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const InventoryService = require('../services/inventory.service');

class ProductService {
   // [GET] /api/v1/products
   getAll = async (req) => {
      const {
         _q, // Full-text search query
         _page = 1, // Page number
         _limit = 10, // Items per page
         _sort = 'asc', // Sort direction
         _sortBy = 'createdAt', // Sort field
         _product_sizes, // e.g., "S,M,L"
         _product_colors, // e.g., "Red,Yellow"
         _product_type, // e.g., "Clothe"
         _product_category, // e.g., ObjectId
         _product_gender, // e.g., "Man"
         _product_brand, // e.g., "Nike"
         _min_price, // e.g., 10
         _max_price, // e.g., 50
         _has_promotion, // e.g., true/false
      } = req.query;

      // Validate pagination inputs
      const page = parseInt(_page, 10);
      const limit = parseInt(_limit, 10);
      const sortDirection = _sort.toLowerCase() === 'desc' ? -1 : 1;
      const sortField = _sortBy || 'createdAt';

      if (isNaN(page) || page < 1) {
         throw new BadRequestError('Invalid page number');
      }
      if (isNaN(limit) || limit < 1 || limit > 100) {
         throw new BadRequestError('Invalid limit value (1-100)');
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build the query object
      let query = {};

      // Full-text search
      if (_q) {
         query.$text = { $search: _q };
      }

      // Filter by _product_sizes (array)
      if (_product_sizes) {
         const sizesArray = _product_sizes
            .split(',')
            .map((size) => size.trim());
         query.product_sizes = { $in: sizesArray };
      }

      // Filter by _product_colors (array)
      if (_product_colors) {
         const colorsArray = _product_colors
            .split(',')
            .map((color) => color.trim());
         query.product_colors = { $in: colorsArray };
      }

      // Filter by _product_type
      if (_product_type) {
         query.product_type = _product_type.trim();
      }

      // Filter by _product_category (ObjectId)
      if (_product_category) {
         const mongoose = require('mongoose');
         if (!mongoose.Types.ObjectId.isValid(_product_category)) {
            throw new BadRequestError('Invalid _product_category ID');
         }
         query.product_category = _product_category;
      }

      // Filter by _product_gender
      if (_product_gender) {
         query.product_gender = _product_gender.trim();
      }

      // Filter by _product_brand
      if (_product_brand) {
         query.product_brand = _product_brand.trim();
      }

      // Filter by product_price range
      if (_min_price || _max_price) {
         query.product_price = {};
         if (_min_price) {
            const min = parseFloat(_min_price);
            if (isNaN(min) || min < 0)
               throw new BadRequestError('Invalid _min_price');
            query.product_price.$gte = min;
         }
         if (_max_price) {
            const max = parseFloat(_max_price);
            if (isNaN(max) || max < 0)
               throw new BadRequestError('Invalid _max_price');
            query.product_price.$lte = max;
         }
      }

      // Filter products by active promotions
      if (_has_promotion === 'true') {
         const now = new Date();
         query['product_promotion.promotion_id'] = { $ne: null };
         query['product_promotion.start_date'] = { $lte: now };
         query['product_promotion.end_date'] = { $gt: now };
      }

      try {
         // Get total count for pagination metadata
         const totalItems = await productModel.countDocuments(query);

         // Build sort object
         let sortObj = { [sortField]: sortDirection };
         if (_q) {
            sortObj = { score: { $meta: 'textScore' }, ...sortObj }; // Relevance first
         }

         // Fetch products with filters, full-text search, pagination, sorting, and population
         const products = await productModel
            .find(query)
            .select(_q ? { score: { $meta: 'textScore' } } : {}) // Include relevance score if searching
            .populate({
               path: 'product_category',
               select: 'category_name category_slug',
            })
            .populate({
               path: 'product_promotion.promotion_id',
               select:
                  'promotion_name promotion_value promotion_start_date promotion_end_date',
            })
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean();

         // Calculate pagination metadata
         const totalPages = Math.ceil(totalItems / limit);

         // Process images and handle promotions
         const now = new Date();
         const finalData = products.map((p) => {
            const images = minimumCloudinaryImg(p.product_imgs);

            // Check if promotion is active
            let hasActivePromotion = false;
            let discountedPrice = p.product_price;

            if (p.product_promotion && p.product_promotion.promotion_id) {
               const { start_date, end_date, current_discount } =
                  p.product_promotion;

               if (
                  start_date &&
                  end_date &&
                  start_date <= now &&
                  end_date > now
               ) {
                  hasActivePromotion = true;
                  const discountAmount =
                     (p.product_price * current_discount) / 100;
                  discountedPrice = p.product_price - discountAmount;
               }
            }

            return {
               ...p,
               product_imgs: images,
               has_promotion: hasActivePromotion,
               final_price: hasActivePromotion
                  ? discountedPrice
                  : p.product_price,
            };
         });

         return {
            items: finalData,
            meta: {
               totalItems,
               totalPages,
               currentPage: page,
               itemsPerPage: limit,
            },
         };
      } catch (error) {
         console.error('Error fetching products:', error);
         throw new BadRequestError(error.message || 'Error fetching products');
      }
   };

   // [GET] /api/v1/products/:slug
   getBySlug = async (req) => {
      const { slug } = req.params;

      let product = await productModel
         .findOne({ product_slug: slug })
         .populate('product_category')
         .populate({
            path: 'product_promotion.promotion_id',
            select:
               'promotion_name promotion_value promotion_start_date promotion_end_date',
         });

      if (!product) {
         throw new NotFoundError('Product not found');
      }

      product.product_imgs = minimumCloudinaryImg(product.product_imgs);

      // Check if promotion is active
      const now = new Date();
      let hasActivePromotion = false;
      let discountedPrice = product.product_price;
      let promotionInfo = null;

      if (product.product_promotion && product.product_promotion.promotion_id) {
         const { start_date, end_date, current_discount } =
            product.product_promotion;

         if (start_date && end_date && start_date <= now && end_date > now) {
            hasActivePromotion = true;
            const discountAmount =
               (product.product_price * current_discount) / 100;
            discountedPrice = product.product_price - discountAmount;

            promotionInfo = {
               name: product.product_promotion.promotion_id.promotion_name,
               discount_percentage: current_discount,
               discount_amount: discountAmount,
               start_date,
               end_date,
            };
         }
      }

      const filtersInventory = {
         'sku.sku_size': 1,
         'sku.sku_color': 1,
         'sku.quantity': 1,
         _id: 0,
      };

      const productInventory = await InventoryService.getByProductId(
         product._id,
         filtersInventory,
      );

      const flat = productInventory.map((item) => {
         var { sku } = item.toObject();
         return {
            ...sku,
         };
      });

      const result = {
         ...product.toObject(),
         skus: [...flat],
         has_promotion: hasActivePromotion,
         final_price: hasActivePromotion
            ? discountedPrice
            : product.product_price,
         promotion: promotionInfo,
      };

      return result;
   };

   // [GET] /api/v1/products/best-sellers (unchanged)
   getBestSellers = async (limit = 10) => {
      // Your existing code remains unchanged
   };
}

module.exports = new ProductService();
