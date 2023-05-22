const mongodb = require("mongodb");
const getDB = require("../utility/database").getDB;

const ObjectId = mongodb.ObjectId;

class User {
  constructor(username, email, cart, id) {
    this.name = username;
    this.email = email;
    this.cart = cart;
    this._id = id;
  }

  save() {
    const db = getDB();
    return db.collection("users").insertOne(this);
  }

  addToCart(product) {
    const cartProductIndex = this.cart.items.findIndex((cp) => {
      return cp.productID.toString() === product._id.toString();
    });
    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];
    if (cartProductIndex >= 0) {
      newQuantity = this.cart.items[cartProductIndex].quantity + 1;
      updatedCartItems[cartProductIndex].quantity = newQuantity;
    } else {
      updatedCartItems.push({
        productID: new ObjectId(product._id),
        quantity: newQuantity,
      });
    }
    const updatedCart = {
      items: updatedCartItems,
    };
    const db = getDB();
    return db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(this._id) },
        { $set: { cart: updatedCart } }
      );
  }

  getCart() {
    const db = getDB();
    const productIDs = this.cart.items.map((i) => {
      return i.productID;
    });
    return db
      .collection("products")
      .find({ _id: { $in: productIDs } })
      .toArray()
      .then((products) => {
        return products.map((p) => {
          return {
            ...p,
            quantity: this.cart.items.find((i) => {
              return i.productID.toString() === p._id.toString();
            }).quantity,
          };
        });
      });
  }

  static findById(userId) {
    const db = getDB();
    return db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) })
      .then((user) => {
        console.log(user);
        return user;
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

module.exports = User;
