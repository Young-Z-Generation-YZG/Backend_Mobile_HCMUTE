const VoucherService = require('../services/voucher.service');
const { CREATED, OK } = require('../domain/core/success.response');

class VoucherController {
   // Get all voucher with id user
   async getVouchers(req, res) {
      new OK({
         message: '',
         statusCode: 200,
         data: await VoucherService.getVouchers(req),
      }).send(res);
   }
}

module.exports = new VoucherController();
