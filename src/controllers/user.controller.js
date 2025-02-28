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
}

module.exports = new UserController();
