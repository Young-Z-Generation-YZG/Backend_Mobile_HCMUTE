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

   async refreshToken(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.refreshToken(req),
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

   async sendMailOtp(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.sendMailOtp(req),
      }).send(res);
   }

   async verifyEmail(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.verifyEmail(req),
      }).send(res);
   }

   async verifyEmailChangePhoneNumber(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.verifyEmailChangePhoneNumber(req),
      }).send(res);
   }

   async emailResetPassword(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.emailResetPassword(req),
      }).send(res);
   }

   async resetNewPassword(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.resetNewPassword(req),
      }).send(res);
   }

   async verifyResetPassword(req, res) {
      return new OK({
         message: 'OK',
         statusCode: 200,
         data: await AccessService.verifyResetPassword(req),
      }).send(res);
   }
}

module.exports = new AccessController();
