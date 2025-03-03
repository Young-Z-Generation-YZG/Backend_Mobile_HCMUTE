const productModel = require('../domain/models/product.model');
const reviewModel = require('../domain/models/review.model');
const invoiceModel = require('../domain/models/invoice.model');

const {
   minimumCloudinaryImg,
} = require('../infrastructure/utils/minimum-cloudinary-img');

class ProductService {
   // [GET] /api/v1/products
   getAll = async (req) => {
      const {
         _page = 1,
         _limit = 10,
         _sort = 'asc',
         _sortBy = 'createdAt',
      } = req.query;

      // Validate inputs
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

      // Build sort object
      const sortObj = { [sortField]: sortDirection };

      // Get total count for pagination metadata
      const totalItems = await productModel.countDocuments();

      // Fetch products with pagination, sorting, and population
      const products = await productModel
         .find()
         .populate({
            path: 'product_category',
            select: 'category_name category_slug',
         })
         .populate({
            path: 'product_promotion.promotion_id',
            model: 'Promotion',
            match: {
               promotion_start_date: { $lte: new Date() },
               promotion_end_date: { $gt: new Date() },
            },
            select:
               'promotion_name promotion_value promotion_start_date promotion_end_date is_active',
         })
         .sort(sortObj)
         .skip(skip)
         .limit(limit)
         .lean(); // Better performance with plain objects

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

   // [GET] /api/v1/products/best-sellers
   getBestSellers = async (limit = 10) => {
      try {
         // Đầu tiên lấy thống kê số lượng bán từ invoices
         const salesStats = await invoiceModel.aggregate([
            { $match: { invoice_status: 'paid' } },
            { $unwind: '$invoice_products' },
            {
               $group: {
                  _id: '$invoice_products._id',
                  totalSold: { $sum: '$invoice_products.product_quantity' },
               },
            },
         ]);

         // Tạo map để lưu số lượng bán của từng sản phẩm
         const salesMap = new Map(
            salesStats.map((item) => [item._id.toString(), item.totalSold]),
         );

         // Lấy tất cả sản phẩm
         const products = await productModel
            .find()
            .populate('product_category')
            .populate({
               path: 'product_promotion.promotion_id',
               model: 'Promotion',
               match: {
                  promotion_start_date: { $lte: new Date() },
                  promotion_end_date: { $gt: new Date() },
               },
            });

         // Thêm thông tin số lượng bán vào mỗi sản phẩm và sắp xếp
         const productsWithSales = products.map((product) => ({
            ...product.toObject(),
            total_sold: salesMap.get(product._id.toString()) || 0,
         }));

         // Sắp xếp theo số lượng bán giảm dần
         productsWithSales.sort((a, b) => b.total_sold - a.total_sold);

         return productsWithSales;
      } catch (error) {
         console.error('Error getting best sellers:', error);
         return [];
      }
   };
}

module.exports = new ProductService();
