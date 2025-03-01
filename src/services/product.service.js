const productModel = require('../domain/models/product.model');
const reviewModel = require('../domain/models/review.model');
const invoiceModel = require('../domain/models/invoice.model');

class ProductService {
   // [GET] /api/v1/products
   getAll = async () => {
      const products = await productModel
         .find()
         .populate('product_category')
         .populate({
            path: 'product_promotion.promotion_id',
            model: 'Promotion',
            match: {
               start_date: { $lte: new Date() },
               end_date: { $gt: new Date() },
            },
         });

      return products;
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
