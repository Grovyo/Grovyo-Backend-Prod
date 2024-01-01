const express = require("express");
const router = express.Router();

const {
  getmessages,
  newmessage,
  hiddenmes,

  initiatetopic,
  jointopic,
  checkLastMessage,
} = require("../controllers/topic");

// router.post("/createtopic/:userId/:comId", create);
router.get("/getmessages/:topicId/:userId", getmessages);

router.get("/hiddenmes/:comId/:id", hiddenmes);

router.post("/clm/:topicId/:userId", checkLastMessage);

router.post("/newmessage/:topicId", newmessage);

router.post("/initiatetopic/:topicId", initiatetopic);

router.post("/jointopic/:topicId/:id/:comId/:orderId", jointopic);

module.exports = router;
