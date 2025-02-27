const morgan = require("morgan");
const compression = require("compression");
const helmet = require("helmet");
const express = require("express");

const registerMiddlewares = (app) => {
    app.use(morgan("dev"));
    app.use(helmet());
    app.use(compression());
    app.use(express.json());
    app.use(
      express.urlencoded({
        extended: true,
      })
    );
}

module.exports = registerMiddlewares;