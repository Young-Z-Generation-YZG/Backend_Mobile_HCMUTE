const mongoose = require('mongoose');

const {
   db: { DB_HOST, DB_NAME, DB_PORT, DB_ATLAS_URL },
} = require('../configs/env.config');

// const CONNECTION_STR = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const CONNECTION_STR = DB_ATLAS_URL;

class MongoDatabase {
   instance = null;

   constructor() {
      Database.connect();
   }

   static async connect() {
      await mongoose
         .connect(CONNECTION_STR, { maxPoolSize: 50 })
         .then((connection) => {
            this.instance = connection;

            console.info('[LOG:DATABASE]:: Connected to database');
         })
         .catch((_) => {
            console.warn('[LOG:DATABASE]:: Failure connecting to database');
         });

      require('../../domain/models/address.model');
      require('../../domain/models/category.model');
      require('../../domain/models/inventory.model');
      require('../../domain/models/invoice.model');
      require('../../domain/models/product.model');
      require('../../domain/models/profile.model');
      require('../../domain/models/promotion.model');
      require('../../domain/models/resource.model');
      require('../../domain/models/review.model');
      require('../../domain/models/role.model');
      require('../../domain/models/user.model');
   }

   static getInstance() {
      if (!this.instance) {
         this.instance = new Database();
      }

      return this.instance;
   }
}

module.exports = MongoDatabase;
