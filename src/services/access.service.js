const bcrypt = require('bcrypt');

const {
   BadRequestError,
   AuthenticationError,
} = require('../domain/core/error.response');

const {
   generateEncodedUrl,
} = require('../infrastructure/utils/generate-encoded-url');

const JwtService = require('../infrastructure/auth/jwt.service');
const OtpService = require('../infrastructure/utils/otp.service');
const UserService = require('./user.service');
const MailerService = require('../infrastructure/mailer/mailer.service');
const RedisService = require('../infrastructure/redis');

const userModel = require('../domain/models/user.model');
const { VERIFY_TYPE } = require('../common/constants');

class AccessService {
   // [POST] /auth/register [DONE]
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
         verified: newUser.verified,
         verify_type: VERIFY_TYPE.EMAIL,
      };

      const jwtMailToken = JwtService.generateJwtMailToken(payload);

      const params = {
         _q: jwtMailToken,
         _verify_type: VERIFY_TYPE.EMAIL,
      };

      const encodedUrl = generateEncodedUrl('/api/v1/auth/otp-verify', params);

      return {
         redirect: encodedUrl,
      };
   }

   // [POST] /auth/login [DONE]
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
            verify_type: VERIFY_TYPE.EMAIL,
         };

         const jwtMailToken = JwtService.generateJwtMailToken(payload);

         const params = {
            _q: jwtMailToken,
            _verify_type: VERIFY_TYPE.EMAIL,
         };

         const encodedUrl = generateEncodedUrl(
            '/api/v1/auth/otp-verify',
            params,
         );

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

   // [GET] /verify?_q=&_verify_type= [DONE]
   async verifyOtpPage(req) {
      // _q is a jwt token
      const { _q, _verify_type } = req.query;

      if (!_q) {
         throw new AuthenticationError('Not permitted to access');
      }

      const decodedToken = JwtService.decode(_q);

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      const { verify_type, able_to_verify } = decodedToken;

      if (_verify_type !== verify_type) {
         throw new AuthenticationError('Not permitted to access');
      }

      // Reset password situation
      if (verify_type === VERIFY_TYPE.RESET_PASSWORD && !able_to_verify) {
         throw new AuthenticationError('Not permitted to access');
      }

      return {
         message: 'Token valid in 5 minutes',
      };
   }

   // [GET] /send-mail-otp?_q=&_verify_type= [DONE]
   async sendMailOtp(req) {
      // q is a jwt token
      const { _q, _verify_type } = req.query;

      console.log({ _verify_type });

      if (!_q) {
         throw new AuthenticationError('Not permitted to access');
      }

      const decodedToken = JwtService.decode(_q);

      console.log({ decodedToken });

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      const { email: emailPayload } = decodedToken;

      const mailOtp = OtpService.generateOtp(6);

      if (
         _verify_type === VERIFY_TYPE.EMAIL &&
         decodedToken.verify_type == _verify_type
      ) {
         await MailerService.sendEmailVerify({
            to: emailPayload,
            receiverEmail: emailPayload,
            mailOtp: mailOtp,
         });

         await RedisService.set(
            `${emailPayload}:${VERIFY_TYPE.EMAIL}`,
            mailOtp,
         );
      } else if (
         _verify_type === VERIFY_TYPE.CHANGE_PHONE_NUMBER &&
         decodedToken.verify_type == _verify_type
      ) {
         await MailerService.sendEmailChangePhoneNumber({
            to: emailPayload,
            receiverEmail: emailPayload,
            mailOtp: mailOtp,
         });

         await RedisService.set(
            `${emailPayload}:${VERIFY_TYPE.CHANGE_PHONE_NUMBER}`,
            mailOtp,
         );
      } else if (
         _verify_type === VERIFY_TYPE.RESET_PASSWORD &&
         decodedToken.verify_type == _verify_type
      ) {
         await MailerService.sendEmailResetPasswordWithOtp({
            to: emailPayload,
            receiverEmail: emailPayload,
            mailOtp: mailOtp,
         });

         await RedisService.set(
            `${emailPayload}:${VERIFY_TYPE.RESET_PASSWORD}`,
            mailOtp,
         );
      } else {
         throw new BadRequestError('Invalid verify type');
      }

      return {
         message: `OTP sent to your email: ${emailPayload}`,
      };
   }

   // [POST] /verify-email [DONE]
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
      const { email: emailPayload } = decodedToken;

      const redisMailOtp = await RedisService.get(
         `${emailPayload}:${VERIFY_TYPE.EMAIL}`,
      );

      if (otp != redisMailOtp) {
         throw new BadRequestError('OTP not match');
      }

      const updatedStatus = await UserService.updateVerify(emailPayload);

      return updatedStatus;
   }

   // [POST] /verify-change-phone-number [DONE]
   async verifyEmailChangePhoneNumber(req) {
      const { q, otp } = req.body;

      if (!q && !otp) {
         throw new BadRequestError('Password not match');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      // Compare otp with token in redis
      const { email: emailPayload } = decodedToken;

      const redisMailOtp = await RedisService.get(
         `${emailPayload}:${VERIFY_TYPE.CHANGE_PHONE_NUMBER}`,
      );

      const changedPhoneNumber = await RedisService.get(
         `${emailPayload}:changedPhoneNumber`,
      );

      console.log({ changedPhoneNumber });

      if (otp != redisMailOtp) {
         throw new BadRequestError('OTP not match');
      }

      const updatedStatus = await UserService.updatePhoneNumber({
         email: emailPayload,
         changedPhoneNumber: changedPhoneNumber,
      });

      return updatedStatus;
   }

   // [POST] /email-reset-password [DONE]
   async emailResetPassword(req) {
      const { email } = req.body;

      if (!email) {
         throw new BadRequestError('Email missing');
      }

      const user = await UserService.findOneByEmail(email);

      if (!user) {
         throw new BadRequestError('User not found');
      }

      const payload = {
         email: user.email,
         verify_type: VERIFY_TYPE.RESET_PASSWORD,
         update_field: 'confirmPassword',
      };

      const jwtMailToken = JwtService.generateJwtMailToken(payload);

      const params = {
         _q: jwtMailToken,
         _verify_type: VERIFY_TYPE.RESET_PASSWORD,
      };

      const encodedUrl = generateEncodedUrl(
         '/api/v1/auth/reset-password-verify',
         params,
      );

      return {
         redirect: encodedUrl,
      };
   }

   // [GET] /reset-password?q=&verify_type= [DONE]
   async resetPasswordPage(req) {
      // q is a jwt token
      const { _q, _verify_type } = req.query;

      if (!_q) {
         throw new AuthenticationError('Not permitted to access');
      }

      const decodedToken = JwtService.decode(_q);

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      if (decodedToken.verify_type !== _verify_type) {
         throw new BadRequestError('Invalid verify type');
      }

      return {
         message: 'Token valid in 5 minutes',
      };
   }

   // [POST] /reset-new-password?_q=
   async resetNewPassword(req) {
      const { _q } = req.query;
      const { password, confirmPassword } = req.body;

      if (!_q) {
         throw new BadRequestError('Token missing');
      }

      const decodedToken = JwtService.decode(_q);

      if (!decodedToken) {
         throw new AuthenticationError('Token invalid');
      }

      if (password !== confirmPassword) {
         throw new BadRequestError('Password not match');
      }

      const { email: emailPayload, update_field } = decodedToken;

      await RedisService.set(
         `${emailPayload}:${update_field}`,
         confirmPassword,
      );

      const payload = {
         email: emailPayload,
         verify_type: VERIFY_TYPE.RESET_PASSWORD,
         update_field: update_field,
         able_to_verify: true,
      };

      const newJwtMail = JwtService.generateJwtMailToken(payload);

      const params = {
         _q: newJwtMail,
         verify_type: VERIFY_TYPE.RESET_PASSWORD,
      };

      const encodedUrl = generateEncodedUrl('api/v1/auth/otp-verify', params);

      return {
         redirect: encodedUrl,
      };
   }

   async verifyResetPassword(req) {
      const { q, otp } = req.body;

      if (!q && !otp) {
         throw new BadRequestError('Something went wrong');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Token invalid');
      }

      const { email, update_field } = decodedToken;

      const redisOtp = await RedisService.get(
         `${email}:${VERIFY_TYPE.RESET_PASSWORD}`,
      );
      const confirmPassword = await RedisService.get(
         `${email}:${update_field}`,
      );

      if (otp !== redisOtp) {
         throw new BadRequestError('OTP not match');
      }

      const hashPassword = await bcrypt.hash(confirmPassword, 10);

      const updateResult = await UserService.updatePassword(
         email,
         hashPassword,
      );

      return !!updateResult;
   }
}

module.exports = new AccessService();
