const express = require("express");
const path = require("path");
const dir = require("../utility/path");

const router = express.Router();

router.get("/", (req, res, next) => {
  res.sendFile(path.join(dir, "views", "shop.html"));
});

module.exports = router;
