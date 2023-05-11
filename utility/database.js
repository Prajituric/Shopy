const Sequelize = require("sequelize");

const connection = new Sequelize("shopy", "root", "09072018", {
  dialect: "mysql",
  host: "localhost",
});

module.exports = connection;
