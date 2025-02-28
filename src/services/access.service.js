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

         const mailJwtToken = JwtService.generateJwtMailToken(payload);

         const params = {
            q: mailJwtToken,
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

   // [GET] /verify?q=
   async verify(req) {
      // q is a jwt token
      const { q } = req.query;

      if (!q) {
         throw new AuthenticationError('Not permitted to access');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      const { verified } = decodedToken;

      if (verified) {
         throw new AuthenticationError(
            'Your are verified or not permitted to access',
         );
      }

      return {
         message: 'Token valid in 5 minutes',
      };
   }

   // [GET] /sendMailToken?q=
   async sendMailToken(req) {
      // q is a jwt token
      const { q } = req.query;

      if (!q) {
         throw new AuthenticationError('Not permitted to access');
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

   // [POST] /verifyEmail
   async verifyEmail(req) {
      const { q, mailOtp } = req.body;

      if (!q && !mailOtp) {
         throw new BadRequestError('Something went wrong');
      }

      const decodedToken = JwtService.decode(q);

      if (!decodedToken) {
         throw new AuthenticationError('Not permitted to access');
      }

      // Compare mailOtp with token in redis
      const { email } = decodedToken;

      const redisMailOtp = await RedisService.get(`${email}:otp`);

      if (mailOtp != redisMailOtp) {
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
}

module.exports = new AccessService();
