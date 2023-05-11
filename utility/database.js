const mySql = require("mysql2");

const connectionPool = mySql.createPool({
  host: "localhost",
  user: "root",
  database: "shopy",
  password: "09072018",
});

module.exports = connectionPool.promise();
