// packages
const env = require("dotenv");
const cors = require("cors");
const express = require("express");
const path = require("path");


// additional extension
const addSwaggerExtension = require("./infrastructure/open-api");
const addHandlebarsTemplateEngineExtension = require("./infrastructure/handlebars");

const registerMiddlewares = require("./middlewares");

// Load environment variables
env.config();

const app = express();
const server = require("http").createServer(app);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// add Swagger
addSwaggerExtension(app);

// add Handlebars
addHandlebarsTemplateEngineExtension(app);

// config static file
app.use(express.static(path.join(__dirname, "public")));

// Register middlewares
registerMiddlewares(app);

// Register routes
const router = require("./routes");
app.use("/", router);

// Handle global exception
app.use((error, req, res, next) => {
const statusCode = error.status || 500;

    return res.status(statusCode).json({
        status: "error",
        code: statusCode,
        message: error.message || "Internal Server Error",
    });
});
  
  module.exports = server;