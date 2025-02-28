'use strict';

const redis = require('redis');
const { REDIS_STATUS } = require('../../common/constants');

class Redis {
   instance = null;
   isConnecting = false;

   constructor() {
      this.client = redis.createClient();

      this.isConnected = false;
   }

   async setupConnection() {
      if (this.isConnected) {
         return;
      }

      try {
         await this.client.connect();
         this.isConnected = true;

         this.client.on(REDIS_STATUS.CONNECT, () => {
            console.info('[LOG:REDIS]:: Connected to Redis');
         });

         this.client.on(REDIS_STATUS.ERROR, (error) => {
            console.warn('[LOG:REDIS]:: Failure connecting to Redis', error);

            this.isConnected = false;
         });

         this.client.on(REDIS_STATUS.END, () => {
            console.info('[LOG:REDIS]:: Connection to Redis closed');

            this.isConnected = false;
         });

         this.client.on(REDIS_STATUS.RECONNECT, () => {
            console.info('[LOG:REDIS]:: Reconnecting to Redis');
         });
      } catch (error) {
         console.error('[LOG:REDIS]:: Setup connection failed', error);

         this.isConnected = false;

         throw error;
      }
   }

   static async connect() {
      if (!this.instance) {
         this.instance = new Redis();
      }

      // Prevent multiple simultaneous connection attempts
      if (!this.isConnecting && !this.instance.isConnected) {
         this.isConnecting = true;
         try {
            await this.instance.setupConnection();
         } finally {
            this.isConnecting = false;
         }
      }

      return this.instance;
   }

   static getInstance() {
      if (!this.instance) {
         this.instance = new Redis();
      }
      return this.instance;
   }

   static async set(key, value) {
      const instance = await this.connect();

      return await instance.client.set(key, value);
   }

   static async get(key) {
      const instance = await this.connect();

      return await instance.client.get(key);
   }

   static async del(key) {
      const instance = await this.connect();

      return await instance.client.del(key);
   }

   static async close() {
      const instance = await this.getInstance();

      if (instance.isConnected) {
         await instance.client.quit();

         instance.isConnected = false;
      }
   }
}

module.exports = Redis;
