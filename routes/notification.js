const express = require("express");
const { createnoti, getnoti } = require("../controllers/notification");
const router = express.Router();

router.post("/createnoti/:userId/:recId", createnoti);
router.get("/getnoti/:userId", getnoti);

module.exports = router;
