// packages
const cors = require('cors');
const express = require('express');
const path = require('path');

// configs
const MongoDatabase = require('./infrastructure/persistence/mongo.db');

const { assetPath } = require('../public');

// additional extension
const addSwaggerExtension = require('./infrastructure/open-api');
const addHandlebarsTemplateEngineExtension = require('./infrastructure/handlebars');

const registerMiddlewares = require('./middlewares');

const app = express();
const server = require('http').createServer(app);

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

// Connect to database
MongoDatabase.connect();

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
