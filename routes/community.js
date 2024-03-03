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
  getallmembers,
  mutecom,
  blockpcom,
  removecomwithposts,
  fetchallposts,
  fetchallsubscriptions,
  fetchmembers,
  forcejoincom,
  setcomtype,
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
router.post("/v1/compostfeed/:id/:comId", compostfeed);

//fetch topic messages
router.get("/v1/gettopicmessages/:id/:topicId", gettopicmessages);

//fetch more topic messages
router.get("/v1/loadmoremessages/:id/:topicId/:sequence", loadmoremessages);

//fetch all community members
router.get("/v1/getallmembers/:id/:comId", getallmembers);

//muting and unmuting community/topics
router.post("/v1/mutecom/:id/:comId", mutecom);

//blocking people from community
router.post("/v1/blockpcom/:id/:comId", blockpcom);

//remove community along posts
router.post("/v1/removecomwithposts/:id/:comId", removecomwithposts);

//fetch all posts with topicId
router.post("/v1/fetchallposts/:id/:comId", fetchallposts);

//fetch all subscriptions
router.post("/v1/fetchallsubscriptions/:id", fetchallsubscriptions);

//fetching members
router.get("/v1/fetchmembers/:id/:comId", fetchmembers);

//forcejoincom
router.post("/v1/forcejoincom/:id/:comId", forcejoincom);

//setting community to public or private
router.post("/v1/setcomtype/:id/:comId", setcomtype);

module.exports = router;
