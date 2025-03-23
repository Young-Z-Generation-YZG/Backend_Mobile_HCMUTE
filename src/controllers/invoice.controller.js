const { OK, CREATED } = require('../domain/core/success.response');

const InvoiceService = require('../services/invoice.service');

class InvoiceController {
   async create(req, res) {
      new CREATED({
         message: 'OK',
         statusCode: 201,
         data: await InvoiceService.create(req),
      }).send(res);
   }
}

module.exports = new InvoiceController();
