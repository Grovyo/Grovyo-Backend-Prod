const express = require("express");
const {
  newconv,
  getallconv,
  getoneconv,
  gettoken,
  convexists,
  fetchallmsgreqs,
  acceptorrejectmesgreq,
  createmessagereqs,
  removeconversation,
  sendexistingmsg,
  createmessagereqnew,
  fetchallchatsnew,
} = require("../controllers/conversation");
const router = express.Router();

//new conversation private
router.post("/newconv", newconv);

//get latest message of conversations
router.get("/getconv/:userId", getallconv);

//get a conversation
router.get("/getoneconv/:convId/:id", getoneconv);

//check a conversation if it exists
router.post("/checkconv", convexists);

//get token of notification
router.get("/gettoken/:id", gettoken);

//get all message reqs
router.get("/fetchallmsgreqs/:id", fetchallmsgreqs);

//accept or reject msg reqs
router.post("/acceptorrejectmesgreq", acceptorrejectmesgreq);

//accept or reject msg reqs
router.post("/createmessagereqs", createmessagereqs);

//remove conversation
router.post("/removeconversation/:id", removeconversation);

//send msg to existing conv
router.post("/sendexistingmsg/:convId", sendexistingmsg);

//send a req new
router.post("/v1/createmessagereqnew", createmessagereqnew);

//fetchallchatsnew
router.post("/v1/fetchallchatsnew/:id", fetchallchatsnew);

module.exports = router;
