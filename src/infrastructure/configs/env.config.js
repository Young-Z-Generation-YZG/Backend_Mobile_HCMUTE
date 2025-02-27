const dotenv = require('dotenv');

const env = (process.env.NODE_ENV || 'development').trim();

console.log('[LOG:ENVIRONMENT]:: ', env);

if (env !== 'production' && env !== 'development') {
   throw new Error('NODE_ENV must be either ["development" | "production"]');
}

dotenv.config({
   path: `.env.${env}`,
});

module.exports = {
   app: {
      httpPort: process.env.HTTP_PORT,
      httpsPort: process.env.HTTPS_PORT,
      sslEnable: process.env.SSL_ENABLE === 'true',
   },
   db: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
   },
   jwt: {
      secretKey: process.env.JWT_SECRET,
      accessTokenExpiration: process.env.AT_EXPIRED_IN,
      refreshTokenExpiration: process.env.RT_EXPIRED_IN,
   },
   mailer: {
      sender: process.env.MAILER_SENDER,
      password: process.env.MAILER_PASSWORD,
      tokenExpiration: process.env.MAILER_TOKEN_EXPIRED_IN,
   },
};
