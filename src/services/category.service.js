'use strict';
const {
   minimumCloudinaryImg,
} = require('../infrastructure/utils/minimum-cloudinary-img');

const BadRequestError = require('../domain/core/error.response');
const categoryModel = require('../domain/models/category.model');
const productModel = require('../domain/models/product.model');

class CategoryService {
   // [GET] /api/v1/categories
   getAll = async () => {
      try {
         const categories = await categoryModel.find(
            {},
            {
               category_name: 1,
               category_parentId: 1,
               category_slug: 1,
            },
         );

         return categories;
      } catch (err) {
         console.error(err);
      }

      return null;
   };

   // [GET] /api/v1/categories/{slug}/products
   getProductsByCategory = async (req) => {
      const { slug } = req.params;
      const {
         _page = 1,
         _limit = 10,
         _sort = 'asc',
         _sortBy = 'createdAt',
      } = req.query;

      // Validate inputs
      if (!slug) {
         throw new BadRequestError('Invalid category slug');
      }

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

      // Find current category
      const currentCategory = await categoryModel.findOne({
         category_slug: slug,
      });

      if (!currentCategory) {
         throw new BadRequestError('Category not found');
      }

      // Find all child categories
      const childCategories = await categoryModel.find({
         category_parentId: currentCategory._id,
      });

      // Array of category IDs (parent + children)
      const categoryIds = [
         currentCategory._id,
         ...childCategories.map((c) => c._id),
      ];

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sortObj = { [sortField]: sortDirection };

      // Get total count for pagination metadata
      const totalItems = await productModel.countDocuments({
         product_category: { $in: categoryIds },
      });

      // Fetch products with pagination and sorting
      const products = await productModel
         .find({
            product_category: { $in: categoryIds },
         })
         .populate({
            path: 'product_category',
            select: 'category_name category_slug',
         })
         .sort(sortObj)
         .skip(skip)
         .limit(limit)
         .lean(); // Use lean() for better performance

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / limit);

      const finalData = products.map((p) => {
         const images = minimumCloudinaryImg(p.product_imgs);

         return {
            ...p,
            product_imgs: images,
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
   };
}

module.exports = new CategoryService();
