const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  create,
  joinmember,
  unjoinmember,
  getcommunity,
  addTopic,
  udpatecommunity,
  compostfeed,
  gettopicmessages,
  loadmoremessages,
} = require("../controllers/community");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/createcom/:userId", upload.single("image"), create);
router.post("/joincom/:userId/:comId", joinmember);
router.post("/unjoin/:userId/:comId", unjoinmember);
router.get("/getcommunity/:comId/:id", getcommunity);
router.post("/addtopic/:userId/:comId", addTopic);
router.post(
  "/updatecommunity/:comId/:userId",
  upload.single("image"),
  udpatecommunity
);
//community posts and data
router.get("/v1/compostfeed/:id/:comId/:postId", compostfeed);

//fetch topic messages
router.get("/v1/gettopicmessages/:id/:topicId", gettopicmessages);

//fetch more topic messages
router.get("/v1/loadmoremessages/:id/:topicId/:sequence", loadmoremessages);

module.exports = router;
