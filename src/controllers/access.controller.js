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

   async verifyOtpPage(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.verifyOtpPage(req),
      }).send(res);
   }

   async resetPasswordPage(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.resetPasswordPage(req),
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

   // async recoverUrl(req, res) {
   //    return new OK({
   //       message: 'OK',
   //       statusCode: 200,
   //       data: await AccessService.recoverUrl(req),
   //    }).send(res);
   // }

   async recoverOtp(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.recoverOtp(req),
      }).send(res);
   }

   async resetPassword(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.resetPassword(req),
      }).send(res);
   }

   async verifyResetPasswordOtp(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.verifyResetPasswordOtp(req),
      }).send(res);
   }
}

module.exports = new AccessController();
