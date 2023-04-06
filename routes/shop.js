const express = require("express");
const path = require("path");
const dir = require("../utility/path");

const router = express.Router();
const adminData = require("./admin");

router.get("/", (req, res, next) => {
  const products = adminData.products;
  res.render("shop", { prod: products, docTitle: "Shopy" });
});

module.exports = router;
