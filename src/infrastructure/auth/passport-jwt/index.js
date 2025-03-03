const ExtractJwt = require('passport-jwt').ExtractJwt;
const JwtStrategy = require('passport-jwt').Strategy;

const UserService = require('../../../services/user.service');

const {
   jwt: { JWT_SECRET },
} = require('../../configs/env.config');

const opts = {
   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
   secretOrKey: JWT_SECRET || 'mobile_hcmute',
};

module.exports = (passport) => {
   passport.use(
      'jwt',
      new JwtStrategy(opts, async (jwtPayload, next) => {
         console.log('jwtPayload', jwtPayload);
         const user = await UserService.findOneAuth(jwtPayload.email);

         return next(null, user);
      }),
   );
};
