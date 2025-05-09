const MongoDatabase = require('../infrastructure/persistence/mongo.db');
const BadRequestError = require('../domain/core/error.response');
const {
   getValuesOfObject,
} = require('../infrastructure/utils/get-values-object');
const { generateOtp } = require('../infrastructure/utils/otp.service');
const {
   generateEncodedUrl,
} = require('../infrastructure/utils/generate-encoded-url');
const bcrypt = require('bcrypt');

const RedisService = require('../infrastructure/redis');
const JwtService = require('../infrastructure/auth/jwt.service');
const UploadService = require('../infrastructure/cloudinary/upload.service');

const userModel = require('../domain/models/user.model');
const profileModel = require('../domain/models/profile.model');
const addressModel = require('../domain/models/address.model');
const reviewModel = require('../domain/models/review.model');
const productModel = require('../domain/models/product.model');
const InvoiceModel = require('../domain/models/invoice.model');
const { VERIFY_TYPES } = require('../domain/constants/domain');
const socketService = require('../infrastructure/socket');

class UserService {
   // [DONE]
   findOneByEmail = async (email) => {
      try {
         const user = await userModel.findOne({ email }).lean().exec();

         return user;
      } catch (error) {
         throw new error();
      }
   };

   // [DONE]
   createUser = async ({ firstName = '', lastName = '', email, password }) => {
      const mongo = MongoDatabase.getInstance();
      let session = await mongo.startSession();

      try {
         session.startTransaction();

         const address = await addressModel.create({});

         const profile = await profileModel.create({
            profile_firstName: firstName,
            profile_lastName: lastName,
            profile_address: address._id,
         });

         const newUser = await userModel.create({
            email,
            password,
            user_profile: profile._id,
         });

         await session.commitTransaction();

         return newUser;
      } catch (err) {
         await session.abortTransaction();

         throw new BadRequestError(err);
      } finally {
         session.endSession();
      }
   };

   // [DONE]
   updateVerify = async (email) => {
      try {
         const user = await userModel.findOneAndUpdate(
            {
               email: email,
            },
            {
               verified: true,
            },
         );

         return !!user;
      } catch (err) {
         throw new Error(err);
      }
   };

   // [DONE]
   updatePassword = async (email, password) => {
      try {
         const user = await userModel.findOneAndUpdate(
            {
               email: email,
            },
            {
               password: password,
            },
         );

         return user;
      } catch (err) {
         throw new Error(err);
      }
   };

   // [DONE]
   changeCurrentPassword = async (req) => {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      const { email } = req.user;

      if (newPassword !== confirmPassword) {
         throw new BadRequestError('Password not match');
      }

      try {
         const user = await this.findOneByEmail(email);

         if (!user) {
            throw new BadRequestError('User not found');
         }

         // compare password
         if (!(await bcrypt.compare(currentPassword, user.password))) {
            throw new BadRequestError('Password not match');
         }

         const hashPassword = await bcrypt.hash(confirmPassword, 10);

         const updatedUser = await userModel.findOneAndUpdate(
            {
               email: email,
            },
            {
               password: hashPassword,
            },
         );

         return !!updatedUser;
      } catch (error) {
         throw new Error(error);
      }
   };

   // [DONE]
   getProfile = async (req) => {
      const { email } = req.user;

      const user = await userModel.findOne({ email }).populate({
         path: 'user_profile',
         model: 'profile',
      });

      if (!user) {
         throw new BadRequestError('User not found');
      }

      const data = getValuesOfObject({
         obj: user.user_profile,
         fields: [
            'profile_firstName',
            'profile_lastName',
            'profile_phoneNumber',
         ],
      });

      return {
         email,
         ...data,
      };
   };

   // [DONE]
   getAddress = async (req) => {
      const { email } = req.user;

      const user = await userModel.findOne({ email }).populate({
         path: 'user_profile',
         model: 'profile',
         populate: {
            path: 'profile_address',
            model: 'address',
         },
      });

      if (!user) {
         throw new BadRequestError('User not found');
      }

      // const notificationData = {
      //    title: 'Test',
      //    body: 'Test',
      //    type: 'ADDRESS',
      //    createdAt: new Date().toISOString()
      // };

      // if (user._id) {
      //    const idString = user._id.toString();
      //    console.log('socketService.isUserOnline', idString)
      //    if (socketService.isUserOnline(idString)) {
      //       console.log('test02')
      //       socketService.sendNotification(idString, notificationData)
      //    }
      // }

      const address = user.user_profile.profile_address;

      return getValuesOfObject({
         obj: address,
         fields: [
            'address_addressLine',
            'address_district',
            'address_province',
            'address_country',
         ],
      });
   };

   // [DONE]
   updateAddresses = async (req) => {
      const { addressLine, district, province, country } = req.body;

      const { email } = req.user;

      try {
         const user = await userModel.findOne({ email }).populate({
            path: 'user_profile',
            model: 'profile',
            populate: {
               path: 'profile_address',
               model: 'address',
            },
         });

         const newAddress = {
            address_country: country,
            address_province: province,
            address_district: district,
            address_addressLine: addressLine,
         };

         const address = user.user_profile.profile_address;

         Object.assign(address, newAddress);

         const updatedAddress = await address.save();

         // return getValuesOfObject({
         //    obj: address,
         //    fields: [
         //       'address_country',
         //       'address_province',
         //       'address_district',
         //       'address_addressLine',
         //    ],
         // });

         return !!updatedAddress;
      } catch (error) {
         throw new Error(error);
      }
   };

   // [DONE]
   updateProfile = async (req) => {
      const { email } = req.user;

      const { firstName = '', lastName = '' } = req.body;

      try {
         const user = await userModel.findOne({ email }).populate({
            path: 'user_profile',
            model: 'profile',
         });

         const newProfile = {
            profile_firstName: firstName,
            profile_lastName: lastName,
         };

         const profile = user.user_profile;

         Object.assign(profile, newProfile);

         const updatedProfile = await profile.save();

         // return getValuesOfObject({
         //    obj: profile,
         //    fields: [
         //       'profile_firstName',
         //       'profile_lastName',
         //       'profile_phoneNumber',
         //    ],
         // });

         return !!updatedProfile;
      } catch (error) {
         throw new Error(error);
      }
   };

   // [DONE]
   updatePhoneNumber = async ({ email, changedPhoneNumber }) => {
      console.log({
         email,
         changedPhoneNumber,
      });

      // if (!email || !changedPhoneNumber) {
      //    throw new BadRequestError('Password not match');
      // }

      try {
         const user = await userModel.findOne({ email }).select('user_profile');
         if (!user || !user.user_profile) {
            throw new BadRequestError('User or profile not found');
         }

         const updatedProfile = await profileModel.findOneAndUpdate(
            { _id: user.user_profile },
            { profile_phoneNumber: changedPhoneNumber },
         );

         return !!updatedProfile;
      } catch (error) {
         throw error instanceof BadRequestError
            ? error
            : new Error(`Failed to update phone number: ${error.message}`);
      }
   };

   // [DONE]
   findOneAuth = async (email) => {
      try {
         const user = await userModel
            .findOne({ email })
            .populate('roles')
            .lean();

         return user;
      } catch (error) {
         throw new Error(error);
      }
   };

   // [DONE]
   changePhoneNumber = async (req) => {
      const { changedPhoneNumber } = req.body;

      const { email: emailPayload } = req.user;

      try {
         const user = await userModel
            .findOne({ email: emailPayload })
            .populate({
               path: 'user_profile',
               model: 'profile',
            });

         const jwtPayload = {
            email: user.email,
            verify_type: VERIFY_TYPES.CHANGE_PHONE_NUMBER,
         };

         const q = JwtService.generateJwtMailToken(jwtPayload);

         const params = {
            _q: q,
            _verify_type: VERIFY_TYPES.CHANGE_PHONE_NUMBER,
         };

         const encodedUrl = generateEncodedUrl(
            '/api/v1/auth/otp-verify',
            params,
         );

         await RedisService.set(
            `${emailPayload}:changedPhoneNumber`,
            changedPhoneNumber,
         );

         return {
            redirect: encodedUrl,
         };
      } catch (error) {
         throw new Error(error);
      }
   };

   // [DONE]
   uploadProfileImage = async (req) => {
      // Check if file was uploaded
      if (!req.file) {
         throw new BadRequestError('No image file provided');
      }

      try {
         // Get the authenticated user's ID from the request (set by authenticationMiddleware)
         const userId = req.user._id; // Assuming your auth middleware sets req.user

         // Find the user and populate the profile
         const user = await userModel.findById(userId).populate('user_profile');

         const profile = user.user_profile;

         const uploadResult = await UploadService.uploadSingle(req.file);

         // Update profile with new image data
         profile.profile_img = {
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url,
         };

         const updateStatus = await profile.save();

         return !!updateStatus;
      } catch (error) {
         throw new Error(error);
      }
   };

   // Get all users with their profiles
   getAllUsers = async () => {
      try {
         const users = await userModel
            .find()
            .populate({
               path: 'user_profile',
               model: 'profile',
               populate: {
                  path: 'profile_address',
                  model: 'address',
               },
            })
            .lean()
            .exec();

         // Transform the data to return only the necessary fields
         const res = users.map((user) => {
            const profile = user.user_profile || {};
            const address = profile.profile_address || {};

            return {
               _id: user._id,
               email: user.email,
               verified: user.verified,
               first_name: profile.profile_firstName || '',
               last_name: profile.profile_lastName || '',
               phone_number: profile.profile_phoneNumber || '',
               avatar: profile.profile_img
                  ? profile.profile_img.secure_url
                  : null,
               address: {
                  address_line: address.address_addressLine || '',
                  district: address.address_district || '',
                  province: address.address_province || '',
                  country: address.address_country || '',
               },
               createdAt: user.createdAt,
               updatedAt: user.updatedAt,
               roles: user.roles || [],
            };
         });

         return {
            total_records: 0,
            total_pages: 1,
            page_size: 5,
            current_page: 1,
            items: res,
            links: null,
         };
      } catch (error) {
         throw new Error(`Error getting all users: ${error.message}`);
      }
   };
}

module.exports = new UserService();
