const swaggerUI = require("swagger-ui-express");
const swaggerJsDocs = require("swagger-jsdoc");

// add Swagger
const addSwaggerExtension = (app) => {
    const options = require("../configs/swagger.config");
    const specs = swaggerJsDocs(options);
    app.use("/swagger/api-docs", swaggerUI.serve, swaggerUI.setup(specs));
}

module.exports = addSwaggerExtension