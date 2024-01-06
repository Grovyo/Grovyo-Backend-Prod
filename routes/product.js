const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  create,
  fetchallproducts,
  getaproduct,
  deleteproduct,
  highlight,
  fetchfrequents,
  fetchsimilar,
  buyproduct,
  newprodorder,
  updateproduct,
  createnew,
  addareview,
} = require("../controllers/product");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/createproduct/:userId", upload.any(), create);
router.post("/v1/createproduct/:userId", upload.any(), createnew);
router.get("/fetchallproducts/:userId", fetchallproducts);
// router.get("/getaproduct/:id/:productId", getaproduct);
router.post("/addareview/:id/:productId", addareview);
router.post("/updateaproduct/:productId", updateproduct);
router.delete("/deleteproduct/:userId/:productId", deleteproduct);
router.post("/addhightlights/:userId/:prodId", highlight);
router.get("/fetchfrequents/:prodId", fetchfrequents);
router.get("/fetchsimilar/:prodId", fetchsimilar);
router.post("/buyproduct/:userId/:productId", buyproduct);
router.post("/newprodorder/:price", newprodorder);

module.exports = router;
