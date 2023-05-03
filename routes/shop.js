const express = require("express");
const path = require("path");

const productController = require("../controllers/products");

const router = express.Router();

router.get("/", productController.getProducts);

router.get("/products");
router.get("/cart");
router.get("/checkout");

module.exports = router;
