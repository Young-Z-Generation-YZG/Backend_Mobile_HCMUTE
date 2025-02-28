const MongoDatabase = require('../infrastructure/persistence/mongo.db');
const BadRequestError = require('../domain/core/error.response');

const userModel = require('../domain/models/user.model');
const profileModel = require('../domain/models/profile.model');
const addressModel = require('../domain/models/address.model');

class UserService {
   findOneByEmail = async (email) => {
      try {
         const user = await userModel.findOne({ email }).lean().exec();

         return user;
      } catch (error) {
         throw new error();
      }
   };

   getProfile = async (req) => {
      try {
         return {
            test: 'test',
         };
      } catch (error) {
         throw new Error(error);
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
}

module.exports = new UserService();
