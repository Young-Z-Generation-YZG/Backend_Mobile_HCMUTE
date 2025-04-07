const { OK, CREATED } = require('../domain/core/success.response');
const ReviewService = require('../services/review.service');

class ReviewController {
   async getAllByProductId(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await ReviewService.getAllByProductId(req),
      }).send(res);
   }

   async create(req, res) {
      new CREATED({
         message: 'CREATED',
         statusCode: 201,
         data: await ReviewService.create(req),
      }).send(res);
   }

   async update(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await ReviewService.update(req),
      }).send(res);
   }

   async delete(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await ReviewService.delete(req),
      }).send(res);
   }
}

module.exports = new ReviewController();
