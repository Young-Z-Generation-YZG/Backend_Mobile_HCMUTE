const { OK, CREATED } = require('../domain/core/success.response');
const CategoryService = require('../services/category.service');

class CategoryController {
   // async create(req, res) {
   //   new CREATED({
   //     message: "Create successfully",
   //     statusCode: 200,
   //     data: await CategoryService.create(req.body),
   //   }).send(res);
   // }

   // async update(req, res) {
   //   new OK({
   //     message: "Update successfully",
   //     statusCode: 200,
   //     data: await CategoryService.update(req.params.id, req.body),
   //   }).send(res);
   // }

   // async remove(req, res) {
   //   new OK({
   //     message: "Remove successfully",
   //     statusCode: 200,
   //     data: await CategoryService.remove(req.params.id),
   //   }).send(res);
   // }

   async getAll(req, res) {
      new CREATED({
         message: 'OK',
         statusCode: 200,
         data: await CategoryService.getAll(),
      }).send(res);
   }

   async getProductsByCategory(req, res) {
      new CREATED({
         message: 'OK',
         statusCode: 200,
         data: await CategoryService.getProductsByCategory(req),
      }).send(res);
   }

   // async withChildren(req, res) {
   //   new CREATED({
   //     message: "OK",
   //     statusCode: 200,
   //     data: await CategoryService.withChildren(),
   //   }).send(res);
   // }
}

module.exports = new CategoryController();
