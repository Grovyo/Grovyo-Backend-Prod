const express = require("express");
const router = express.Router();

const {
  getmessages,
  newmessage,
  hiddenmes,

  initiatetopic,
  jointopic,
  checkLastMessage,
  createtopicporder,
  finalisetopicorder,
  delenutopic,
} = require("../controllers/topic");

// router.post("/createtopic/:userId/:comId", create);
router.get("/getmessages/:topicId/:userId", getmessages);

router.get("/hiddenmes/:comId/:id", hiddenmes);

router.post("/clm/:topicId/:userId", checkLastMessage);

router.post("/newmessage/:topicId", newmessage);

router.post("/initiatetopic/:topicId", initiatetopic);

router.post("/jointopic/:topicId/:id/:comId/:orderId", jointopic);

//delete topics wihtout communities
router.post("/delenutopic", delenutopic);

// ad code
// router.get("/fetchtopic/:id/:comId", fetchtopic);

//create topic order new
router.post("/v1/createtopicporder/:id/:topicId", createtopicporder);

//finalisetopicorder new
router.post("/v1/finalisetopicorder/:id/:ordId/:topicId", finalisetopicorder);

module.exports = router;
