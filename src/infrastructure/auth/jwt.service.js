'use strict';

const jwt = require('jsonwebtoken');

const {
   jwt: { JWT_SECRET, JWT_AT_EXPIRED_IN, JWT_RT_EXPIRED_IN },
   mailer: { MAILER_TOKEN_EXPIRED_IN },
} = require('../configs/env.config');

class JwtService {
   generateTokenPair = (payload) => {
      const accessToken = jwt.sign(payload, JWT_SECRET, {
         expiresIn: JWT_AT_EXPIRED_IN,
      });

      const refreshToken = jwt.sign(payload, JWT_SECRET, {
         expiresIn: JWT_RT_EXPIRED_IN,
      });

      return {
         accessToken,
         refreshToken,
      };
   };

   verifyJwtToken = (token) => {
      try {
         return jwt.verify(token, JWT_SECRET);
      } catch (error) {
         return null;
      }
   };

   generateJwtMailToken = (payload) => {
      const mailToken = jwt.sign(payload, JWT_SECRET, {
         expiresIn: MAILER_TOKEN_EXPIRED_IN,
      });

      return mailToken;
   };

   decode = (token) => {
      try {
         const decoded = jwt.verify(token, JWT_SECRET);

         return decoded;
      } catch (err) {
         console.log('Verify token failed');

         return null;
      }
   };
}

module.exports = new JwtService();
