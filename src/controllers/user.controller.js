const { OK, CREATED } = require('../domain/core/success.response');

const UserService = require('../services/user.service');

class UserController {
   async getProfile(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await UserService.getProfile(req),
      }).send(res);
   }

   async getAddress(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await UserService.getAddress(req),
      }).send(res);
   }

   async updateAddresses(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await UserService.updateAddresses(req),
      }).send(res);
   }

   async updateProfile(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await UserService.updateProfile(req),
      }).send(res);
   }

   async changeCurrentPassword(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await UserService.changeCurrentPassword(req),
      }).send(res);
   }

   async changeEmailOrPhone(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await UserService.changeEmailOrPhone(req),
      }).send(res);
   }

   async changePhoneNumber(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await UserService.changePhoneNumber(req),
      }).send(res);
   }
}

module.exports = new UserController();
