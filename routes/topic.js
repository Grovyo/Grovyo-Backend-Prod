const express = require("express");
const router = express.Router();

const {
  create,
  fetchtopic,
  deletetopic,
  getmessages,
  newmessage,
  hiddenmes,
  edittopic,
  initiatetopic,
  jointopic,
  checkLastMessage,
  createtopicporder,
  finalisetopicorder,
} = require("../controllers/topic");

// router.post("/createtopic/:userId/:comId", create);
router.post("/createtopic/:userId", create);

router.post("/deletetopic/:userId/:topicId", deletetopic);

router.post("/edittopic/:id/:topicid", edittopic);

router.get("/getmessages/:topicId/:userId", getmessages);

router.get("/hiddenmes/:comId/:id", hiddenmes);

router.post("/clm/:topicId/:userId", checkLastMessage);

router.post("/newmessage/:topicId", newmessage);

router.post("/initiatetopic/:topicId", initiatetopic);

router.post("/jointopic/:topicId/:id/:comId/:orderId", jointopic);

// ad code
router.get("/fetchtopic/:id/:comId", fetchtopic);

//create topic order new
router.post("/v1/createtopicporder/:id/:topicId", createtopicporder);

//finalisetopicorder new
router.post("/v1/finalisetopicorder/:id/:ordId/:topicId", finalisetopicorder);

module.exports = router;
