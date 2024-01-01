const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  editbio,
  fetchmedia,
  fetchproducts,
  getproduct,
  getcommunities,
  getbio,
  getprosite,
  fetchallglimpse,
  createprosite,
  getlist,
  getdetailprosite,
} = require("../controllers/prosite");

router.post("/edituser/:userId", editbio);
router.get("/fetchmedia/:userId", fetchmedia);
router.get("/fetchproduct/:userId/:mainuserId", fetchproducts);
router.get("/getproduct/:productId", getproduct);
router.get("/getcommunities/:userId", getcommunities);
router.get("/getbio/:userId", getbio);
router.get("/getprosite/:userId", getprosite);
router.get("/fetchallglimpse/:userId", fetchallglimpse);
router.post("/createprosite/:userId", upload.any(), createprosite);
router.get("/getlist/:userId", getlist);
router.get("/getdetailprosite/:userId/:siteId", getdetailprosite);

module.exports = router;
