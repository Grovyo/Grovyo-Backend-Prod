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
} = require("../controllers/order");

router.post("/neworder/:userId/:productId", create);
router.post("/newtopicorder/:id/:topicId", createtopicorder);
router.post("/updateorder/:id/:topicId/:orderId", updateorder);
router.post("/createcartorder/:userId", createcartorder);
router.post("/updatecartorder/:userId/:orderId", updatecartorder);
router.patch("/orderstatus/:userId/:productId/:orderId", status);
router.get("/orderdetails/:userId/:orderId", details);
router.post("/scannedqr/:id/:delid", scannedqr);
router.post("/enterotp/:id/:deliveryid", enterotp);
router.post("/createpdf", createpdf);
router.post("/createrzporder/:id", createrzporder);
router.post("/finaliseorder/:id/:ordId", finaliseorder);
router.post("/createnewproductorder/:userId", createnewproductorder);
router.post("/removecartorder/:id/:cartId/:productId", removecartorder);

module.exports = router;
