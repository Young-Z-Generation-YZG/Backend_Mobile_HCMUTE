const mongoose = require('mongoose');

const {
   db: { host, port, name },
} = require('../configs/env.config');

const CONNECTION_STR = `mongodb://${host}:${port}/${name}`;

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
   }

   static getInstance() {
      if (!this.instance) {
         this.instance = new Database();
      }

      return this.instance;
   }
}

module.exports = MongoDatabase;
