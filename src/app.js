// packages
const cors = require('cors');
const express = require('express');
const path = require('path');
const passport = require('passport');

// configs
const MongoDatabase = require('./infrastructure/persistence/mongo.db');
const Redis = require('./infrastructure/redis');
const socketService = require('./infrastructure/socket');

const { assetPath } = require('../public');

// additional extension
const addSwaggerExtension = require('./infrastructure/open-api');
const addHandlebarsTemplateEngineExtension = require('./infrastructure/handlebars');

const registerMiddlewares = require('./middlewares');

const app = express();
const server = require('http').createServer(app);

// Initialize socket.io
socketService.initialize(server);

app.use(
   cors({
      origin: true,
      credentials: true,
   }),
);

// add Swagger
addSwaggerExtension(app);

// add Handlebars
addHandlebarsTemplateEngineExtension(app);

// config static file
app.use(express.static(assetPath));

// Register middlewares
registerMiddlewares(app);

// Register passport jwt strategy middleware
require('./infrastructure/auth/passport-jwt')(passport);
app.use(passport.initialize());

// Connect to database
MongoDatabase.connect();

// Connect to Redis
(async () => {
   try {
      await Redis.connect();

      console.log('[LOG:REDIS]:: Redis connection initialized');
   } catch (error) {
      console.error('[LOG:REDIS]:: Failed to initialize Redis', error);
   }
})();

// Register routes
const router = require('./routes');
app.use('/', router);

// Handle global exception
app.use((error, req, res, next) => {
   const statusCode = error.status || 500;

   return res.status(statusCode).json({
      status: 'error',
      code: statusCode,
      message: error.message || 'Internal Server Error',
   });
});

module.exports = server;
