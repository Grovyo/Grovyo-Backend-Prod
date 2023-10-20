const express = require("express");
const router = express.Router();

const {
  create,
  deleteques,
  like,
  getques,
} = require("../controllers/questions");

//add question
router.post("/addquestion/:userId/:productId", create);

//delete
router.delete("/deleteques/:userId/:quesId/:productId", deleteques);

//like question
router.post("/likeques/:userId/:quesId", like);

//get all questions
router.get("/getallquestions/:prodId", getques);

module.exports = router;
