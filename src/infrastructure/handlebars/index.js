const { engine: handlebars } = require("express-handlebars");
const path = require("path");

const addHandlebarsTemplateEngineExtension = (app) => {
    console.log(path.join(__dirname, "resources/views"))

    app.engine(
        "hbs",
        handlebars({
          extname: "hbs",
        })
      );
    app.set("view engine", "hbs");
    app.set("views", path.join(__dirname, "resources/views"));
}

module.exports = addHandlebarsTemplateEngineExtension