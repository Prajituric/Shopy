const Product = require("../models/products");

exports.getProducts = (req, res, next) => {
  const products = Product.fetchAll((products) => {
    res.render("shop/product-list", {
      prod: products,
      pageTitle: "Shopy",
      path: "/",
    });
  });
};
