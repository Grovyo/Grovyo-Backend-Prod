const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  createmembership,
  buymembership,
} = require("../controllers/membership");

router.post("/createmembership", createmembership);
router.post("/buymembership/:id/:membershipid", buymembership);

module.exports = router;
