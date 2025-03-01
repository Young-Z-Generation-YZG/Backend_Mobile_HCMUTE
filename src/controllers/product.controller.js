const { OK, CREATED } = require('../domain/core/success.response');
const productService = require('../services/product.service');

class ProductController {
   async getAll(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await productService.getAll(),
      }).send(res);
   }

   async getBestSellers(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await productService.getBestSellers(req.query.limit),
      }).send(res);
   }
}

module.exports = new ProductController();
