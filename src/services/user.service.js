const MongoDatabase = require('../infrastructure/persistence/mongo.db');
const BadRequestError = require('../domain/core/error.response');
const {
   getValuesOfObject,
} = require('../infrastructure/utils/get-values-object');

const userModel = require('../domain/models/user.model');
const profileModel = require('../domain/models/profile.model');
const addressModel = require('../domain/models/address.model');
const reviewModel = require('../domain/models/review.model');
const productModel = require('../domain/models/product.model');
const InvoiceModel = require('../domain/models/invoice.model');

class UserService {
   findOneByEmail = async (email) => {
      try {
         const user = await userModel.findOne({ email }).lean().exec();

         return user;
      } catch (error) {
         throw new error();
      }
   };

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

         return user;
      } catch (err) {
         throw new Error(err);
      }
   };

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

   changeCurrentPassword = async (req) => {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      const { email } = req.user;

      if (newPassword !== confirmPassword) {
         throw new BadRequestError('Password not match');
      }

      try {
         const user = await findOneByEmail(email);

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

   updateProfile = async (req) => {
      const { email } = req.user;

      const { firstName = '', lastName = '', phoneNumber = '' } = req.body;

      try {
         const user = await userModel.findOne({ email }).populate({
            path: 'user_profile',
            model: 'profile',
         });

         const newProfile = {
            profile_firstName: firstName,
            profile_lastName: lastName,
            profile_phoneNumber: phoneNumber,
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
}

module.exports = new UserService();
