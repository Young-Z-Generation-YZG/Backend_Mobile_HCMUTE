const bcrypt = require('bcrypt');

const {
   BadRequestError,
   AuthenticationError,
} = require('../domain/core/error.response');

const {
   getValuesOfObject,
} = require('../infrastructure/utils/get-values-object');

const {
   generateEncodedUrl,
} = require('../infrastructure/utils/generate-encoded-url');

const JwtService = require('../infrastructure/auth/jwt.service');
const OtpService = require('../infrastructure/utils/otp.service');
const UserService = require('./user.service');
const MailerService = require('../infrastructure/mailer/mailer.service');
const RedisService = require('../infrastructure/redis');

const userModel = require('../domain/models/user.model');

class AccessService {
   // [POST] /auth/register
   async register(req) {
      const { firstName = '', lastName = '', email, password } = req.body;

      // 1. checking email exists
      const existedUser = await UserService.findOneByEmail(email);

      if (existedUser) {
         throw new BadRequestError('User already registered');
      }

      // 2. hashing password
      const hashPassword = await bcrypt.hash(password, 10);

      // 3. create user'model
      const newUser = await UserService.createUser({
         email: email,
         password: hashPassword,
         firstName: firstName,
         lastName: lastName,
      });

      if (!newUser) {
         throw new BadRequestError('Something went wrong');
      }

      // 4. redirect /verify?q=
      const payload = {
         email: email,
         firstName: firstName,
         lastName: lastName,
         verified: newUser.verified,
      };

      const jwtMailToken = JwtService.generateJwtMailToken(payload);

      const params = {
         q: jwtMailToken,
         verify_type: 'email',
      };

      const encodedUrl = generateEncodedUrl('/api/v1/auth/verify', params);

      //5. return page success
      return {
         redirect: encodedUrl,
      };
   }

   // [POST] /auth/login
   async login(req) {
      const { email, password } = req.body;
      // 1. check exist user
      const existUser = await UserService.findOneByEmail(email);

      if (!existUser) {
         throw new BadRequestError('User not found');
      }

      // 2. compare password
      const isMatched = await bcrypt.compare(password, existUser.password);
      if (!isMatched) {
         throw new BadRequestError('Wrong password');
      }

      // 3. check is verified
      if (!existUser.verified) {
         const payload = {
            email: existUser.email,
         };

         const jwtMailToken = JwtService.generateJwtMailToken(payload);

         const params = {
            q: jwtMailToken,
         };

         const encodedUrl = generateEncodedUrl('/api/v1/auth/verify', params);

         return {
            redirect: encodedUrl,
         };
      }

      // 3. generate tokens
      const payload = {
         email: existUser.email,
      };

      const { accessToken, refreshToken } =
         JwtService.generateTokenPair(payload);

      return {
         accessToken,
         refreshToken,
      };
   }

   // [GET] /verify?q=&verify_type=
   async verifyOtpPage(req) {
      // q is a jwt token
      const { q, verify_type } = req.query;

      if (!q) {
         throw new AuthenticationError('Not permitted to access');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      if (verify_type === 'email') {
         const { verified } = decodedToken;

         if (verified) {
            throw new AuthenticationError(
               'Your are verified or not permitted to access',
            );
         }
      }

      return {
         message: 'Token valid in 5 minutes',
      };
   }

   // [GET] /send-mail-token?q=&verify_type=
   async sendMailToken(req) {
      // q is a jwt token
      const { q, verify_type } = req.query;

      if (!q) {
         throw new AuthenticationError('Not permitted to access');
      }

      if (verify_type !== 'email') {
         throw new BadRequestError('Invalid verify type');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      const { email, firstName, lastName } = decodedToken;
      const fullName = `${firstName} ${lastName}`;

      const mailOtp = OtpService.generateOtp(6);

      await MailerService.sendEmail({
         to: email,
         name: fullName,
         mailOtp: mailOtp,
      });

      await RedisService.set(`${email}:otp`, mailOtp);

      return {
         message: `OTP sent to your email: ${email}`,
      };
   }

   // [POST] /verify-email
   async verifyEmail(req) {
      const { q, otp } = req.body;

      if (!q && !otp) {
         throw new BadRequestError('Something went wrong');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      // Compare otp with token in redis
      const { email } = decodedToken;

      const redisMailOtp = await RedisService.get(`${email}:otp`);

      if (otp != redisMailOtp) {
         throw new BadRequestError('OTP not match');
      }

      const user = await UserService.findOneByEmail(email);

      await UserService.updateVerify(email);

      const payload = {
         firstName: user.firstName,
         lastName: user.lastName,
         email: user.email,
      };

      const { accessToken, refreshToken } =
         JwtService.generateTokenPair(payload);

      return {
         accessToken,
         refreshToken,
      };
   }

   // // [POST] /recover-url
   // async recoverUrl(body) {
   //    const { email } = body;

   //    // 1. check exist user
   //    const existUser = await UserService.findOneByEmail(email);

   //    if (!existUser) {
   //       throw new BadRequestError('User not found');
   //    }

   //    // 3. generate tokens
   //    const payload = {
   //       email,
   //    };

   //    const jwtMailToken = JwtService.generateJwtMailToken(payload);

   //    const params = {
   //       q: jwtMailToken,
   //    };

   //    const encodedUrl = generateEncodedUrl('/api/v1/auth/verify', params);

   //    MailerService.sendEmailResetPassword({
   //       to: email,
   //       resetUrl: encodedUrl,
   //    });

   //    return {
   //       redirect: encodedUrl,
   //    };
   // }

   // [POST] /recover-otp
   async recoverOtp(req) {
      const { email } = req.body;

      // 1. check exist user
      const existUser = await UserService.findOneByEmail(email);

      if (!existUser) {
         throw new BadRequestError('User not found');
      }

      // 3. generate tokens
      const payload = {
         email,
         verify_type: 'resetPassword',
      };

      const jwtMailToken = JwtService.generateJwtMailToken(payload);

      const params = {
         q: jwtMailToken,
         verify_type: 'resetPassword',
      };

      const encodedUrl = generateEncodedUrl('/reset-password', params);

      return {
         redirect: encodedUrl,
      };
   }

   // [GET] /reset-password?q=&verify_type=
   async resetPasswordPage(req) {
      // q is a jwt token
      const { q, verify_type } = req.query;

      if (!q) {
         throw new AuthenticationError('Not permitted to access');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      if (decodedToken.verify_type !== verify_type) {
         throw new BadRequestError('Invalid verify type');
      }

      return {
         message: 'Token valid in 5 minutes',
      };
   }

   // [POST] /reset-password?q=
   async resetPassword(req) {
      const { q } = req.query;
      const { password, confirmPassword } = req.body;

      if (!q) {
         throw new BadRequestError('Token missing');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Token invalid');
      }

      if (password !== confirmPassword) {
         throw new BadRequestError('Password not match');
      }

      const { email } = decodedToken;

      const existUser = await UserService.findOneByEmail(email);

      if (!existUser) {
         throw new BadRequestError('User not found');
      }

      const resetPasswordOtp = OtpService.generateOtp(6);

      MailerService.sendEmailResetPasswordWithOtp({
         to: email,
         name: email,
         resetPasswordOtp: resetPasswordOtp,
      });

      await RedisService.set(`${email}:resetPasswordOtp`, resetPasswordOtp);
      await RedisService.set(`${email}:confirmPassword`, confirmPassword);

      const params = {
         q: q,
         verify_type: 'resetPassword',
      };

      const encodedUrl = generateEncodedUrl('/verify-otp', params);

      return {
         redirect: encodedUrl,
      };
   }

   async verifyResetPasswordOtp(req) {
      const { q, otp } = req.body;

      if (!q && !otp) {
         throw new BadRequestError('Something went wrong');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Token invalid');
      }

      const { email } = decodedToken;

      const resetPasswordOtp = await RedisService.get(
         `${email}:resetPasswordOtp`,
      );
      const confirmPassword = await RedisService.get(
         `${email}:confirmPassword`,
      );

      if (otp !== resetPasswordOtp) {
         throw new BadRequestError('OTP not match');
      }

      const hashPassword = await bcrypt.hash(confirmPassword, 10);

      await UserService.updatePassword(email, hashPassword);

      return {
         message: 'Reset password success',
      };
   }
}

module.exports = new AccessService();
