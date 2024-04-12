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
  scannedqr,
  enterotp,
  createpdf,
  createrzporder,
  finaliseorder,
  createnewproductorder,
  removecartorder,
  deliverycreate,
  resenotpflash,
  fetchanorder,
  cancelao,
  bao,
} = require("../controllers/order");

router.post("/neworder/:userId/:productId", create);
router.post("/newtopicorder/:id/:topicId", createtopicorder);
router.post("/updateorder/:id/:topicId/:orderId", updateorder);
router.post("/createcartorder/:userId", createcartorder);
router.post("/updatecartorder/:userId/:orderId", updatecartorder);
router.patch("/orderstatus/:userId/:productId/:orderId", status);
router.get("/orderdetails/:userId/:orderId", details);
router.post("/createpdf", createpdf);
router.post("/createrzporder/:id", createrzporder);
router.post("/finaliseorder/:id/:ordId", finaliseorder);
router.post("/createnewproductorder/:userId", createnewproductorder);
router.post("/removecartorder/:id/:cartId/:productId", removecartorder);

//testing
router.post("/deliverycreate/:id/:pickupid", deliverycreate);

//qr scan after delivery in progress
router.post("/scannedqr/:id/:delid", scannedqr);

//enter otp to end the delivery
router.post("/enterotp/:id/:deliveryid", enterotp);

//resenotpflash
router.post("/resenotpflash/:id/:delid", resenotpflash);

//fetchanorder
router.post("/fetchanorder/:id/:ordid", fetchanorder);

//cancel an order
router.post("/cancelao/:id/:ordid", cancelao);

//buy again an order
router.post("/bao/:userId/:ordid", bao);

module.exports = router;
