const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  fetchapplause,
  fetchorders,
  fetchcart,
  addtocart,
  removecart,
  updatequantity,
  subscriptions,
  addsubs,
  updateaddress,
} = require("../controllers/library");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/fetchapplause/:userId", fetchapplause);
router.get("/fetchorders/:userId", fetchorders);
router.get("/fetchcart/:userId", fetchcart);
router.get("/fetchsubscriptions/:userId", subscriptions);
router.post("/addtocart/:userId/:productId", addtocart);
router.post("/updatequantity/:userId/:cartId", updatequantity);
router.post("/removecart/:userId/:productId", removecart);
router.post("/addsubs/:userId/:topicId", addsubs);
router.post("/updateaddress/:userId", updateaddress);

module.exports = router;
