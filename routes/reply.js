const express = require("express");
const {
  addreply,
  likereply,
  dislikereply,
  deletereply,
} = require("../controllers/reply");
const router = express.Router();

router.post("/newreply/:userId/:commentId", addreply);
router.post("/likereply/:replyId", likereply);
router.post("/dislikereply/:replyId", dislikereply);
router.delete("/deletereply/:userId/:replyId", deletereply);

module.exports = router;
