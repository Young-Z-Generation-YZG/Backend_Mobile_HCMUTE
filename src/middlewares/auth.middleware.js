'use strict';

const { AuthenticationError } = require('../domain/core/error.response');

const passport = require('passport');
const AccessControl = require('accesscontrol');

const authenticationMiddleware = (req, res, next) => {
   passport.authenticate('jwt', { session: false }, async (err, user, info) => {
      if (err || !user || Object.keys(user).length === 0) {
         return next(new AuthenticationError('Unauthorized'));
      } else {
         req.user = user;
         return next();
      }
   })(req, res, next);
};

module.exports = {
   authenticationMiddleware,
};
