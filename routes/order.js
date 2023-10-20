const express = require("express");
const router = express.Router();

const {
  create,
  status,
  details,
  createtopicorder,
  updateorder,
  createcartorder,
  updatecartorder,
} = require("../controllers/order");

router.post("/neworder/:userId/:productId", create);
router.post("/newtopicorder/:id/:topicId", createtopicorder);
router.post("/updateorder/:id/:topicId/:orderId", updateorder);
router.post("/createcartorder/:userId", createcartorder);
router.post("/updatecartorder/:userId/:orderId", updatecartorder);
router.patch("/orderstatus/:userId/:productId/:orderId", status);
router.get("/orderdetails/:userId/:orderId", details);

module.exports = router;
