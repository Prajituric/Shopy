const mongodb = require("mongodb");

const MongoClient = mongodb.MongoClient;

let _db;

const mongoConnection = (callback) => {
  MongoClient.connect(
    "mongodb+srv://userDB:rgkBQLIEPZYCWBFS@cluster0.oopvnro.mongodb.net/shop?retryWrites=true"
  )
    .then((client) => {
      console.log("Connected");
      _db = client.db();
      callback();
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

const getDB = () => {
  if (_db) {
    return _db;
  }
  throw "No database found";
};

exports.mongoConnection = mongoConnection;
exports.getDB = getDB;
