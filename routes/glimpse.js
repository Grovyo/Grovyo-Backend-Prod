const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  create,
  fetchglimpse,
  fetchoneglimpse,
  likeglimpse,
  dislikeglimpse,
  deleteglimpse,
  knownglimpse,
} = require("../controllers/glimpse");

router.post("/glimpse/:userId", upload.single("video"), create);
router.get("/fetchglimpse/:userId", fetchglimpse);
router.get("/knownglimpse/:userId", knownglimpse);
router.get("/fetchoneglimpse/:glimpseId", fetchoneglimpse);
router.post("/likeglimpse/:userId/:glimpseId", likeglimpse);
router.post("/dislikeglimpse/:userId/:glimpseId", dislikeglimpse);
router.delete("/deleteglimpse/:userId/:glimpseId", deleteglimpse);

module.exports = router;
