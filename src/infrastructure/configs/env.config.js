const dotenv = require('dotenv');

const env = (process.env.NODE_ENV || 'development').trim();

console.log('[LOG:ENVIRONMENT]:: ', env);

if (env !== 'production' && env !== 'development') {
   throw new Error('NODE_ENV must be either ["development" | "production"]');
}

dotenv.config({
   path: `.env.${env}`,
});

const SSL_ENABLE = process.env.SSL_ENABLE === 'true';

const PORT = SSL_ENABLE
   ? process.env.HTTPS_PORT
   : process.env.HTTP_PORT ?? 3000;

module.exports = {
   app: {
      NODE_ENV: env,
      SSL_ENABLE: SSL_ENABLE,
      HTTP_PORT: process.env.HTTP_PORT,
      HTTPS_PORT: process.env.HTTPS_PORT,
      RUNNING_PORT: PORT,
   },
   db: {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_ATLAS_URL: process.env.DB_ATLAS_URL,
   },
   jwt: {
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_AT_EXPIRED_IN: process.env.JWT_AT_EXPIRED_IN,
      JWT_RT_EXPIRED_IN: process.env.JWT_RT_EXPIRED_IN,
   },
   mailer: {
      MAILER_SENDER: process.env.MAILER_SENDER,
      MAILER_SENDER_NAME: process.env.MAILER_SENDER_NAME,
      MAILER_PASSWORD: process.env.MAILER_PASSWORD,
      MAILER_TOKEN_EXPIRED_IN: process.env.MAILER_TOKEN_EXPIRED_IN,
   },
   redis: {
      REDIS_EXPIRED_IN: process.env.REDIS_EXPIRED_IN,
   },
   cloudinary: {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      CLOUDINARY_URL: process.env.CLOUDINARY_URL,
      CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER,
   },
};
