const { OK, CREATED } = require('../domain/core/success.response');

const AccessService = require('../services/access.service');

class AccessController {
   async register(req, res) {
      new CREATED({
         message: 'CREATED',
         statusCode: 201,
         data: await AccessService.register(req),
      }).send(res);
   }

   async login(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.login(req),
      }).send(res);
   }

   async verify(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.verify(req),
      }).send(res);
   }

   async sendMailToken(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.sendMailToken(req),
      }).send(res);
   }

   async verifyEmail(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.verifyEmail(req),
      }).send(res);
   }
}

module.exports = new AccessController();
