const { OK, CREATED } = require('../domain/core/success.response');

const InvoiceService = require('../services/invoice.service');

class InvoiceController {
   async getAll(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await InvoiceService.getAll(req),
      }).send(res);
   }

   async create(req, res) {
      new CREATED({
         message: 'OK',
         statusCode: 201,
         data: await InvoiceService.create(req),
      }).send(res);
   }

   async updateStatus(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await InvoiceService.updateStatus(req),
      }).send(res);
   }

   async cancelOrder(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await InvoiceService.cancelOrder(req),
      }).send(res);
   }
}

module.exports = new InvoiceController();
