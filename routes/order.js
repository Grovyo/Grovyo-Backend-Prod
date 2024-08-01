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
  fecthallprods,
  cancelprod,
  cod,
  cancellationrequest,
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
router.post("/createnewproductorder/:userId", cod);
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

//cancel an order(whole bucket)
router.post("/cancelao/:id/:ordid", cancellationrequest);

//buy again an order(whole bucket)
router.post("/bao/:userId/:ordid", bao);

//cancel a product
router.post("/cancelpro/:userId/:ordid/:prodId", cancelprod);

//fetch all products all
router.get("/fetchallprods/:userId/:ordid", fecthallprods);

router.post("/cancellationrequest/:id/:oid", cancellationrequest);

module.exports = router;
