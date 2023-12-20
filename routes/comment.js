const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  create,
  likecomment,
  dislikecomment,
  deletecomment,
  fetchallcomments,
} = require("../controllers/comment");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/addcomment/:userId/:postId", upload.single("image"), create);
router.post("/likecomment/:commentId/:userId", likecomment);
router.post("/dislikecomment/:commentId", dislikecomment);
router.delete("/deletecomment/:userId/:commentId", deletecomment);
router.get("/fetchallcomments/:userId/:postId", fetchallcomments);
module.exports = router;
