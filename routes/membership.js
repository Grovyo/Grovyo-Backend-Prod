const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  createmembership,
  buymembership,
} = require("../controllers/membership");
const { verifydm, reducedm, createconv } = require("../controllers/dm");

router.post("/createmembership", createmembership);
router.post("/buymembership/:id/:membershipid", buymembership);
router.post("/verifydm/:userId", verifydm);
router.post("/reducedm/:userId", reducedm);
router.post("/createconv/:sender/:reciever", createconv);

module.exports = router;
