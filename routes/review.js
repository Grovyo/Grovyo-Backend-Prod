const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  createrw,
  create,
  deletereview,
  like,
  getreviews,
} = require("../controllers/review");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//review with image
router.post("/addreviewimage/:userId/:productId/", upload.any(), createrw);

//text reveiw
router.post("/addreview/:userId/:productId/", create);

//delete a review
router.delete("/deletereview/:userId/:reviewId/:productId", deletereview);

//like a review
router.post("/likereview/:userId/:reviewId", like);

//get reveiws
router.get("/getreviews/:prodId", getreviews);

module.exports = router;
