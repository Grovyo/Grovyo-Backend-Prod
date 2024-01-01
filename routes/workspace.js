const express = require("express");
const router = express.Router();

const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// const {
//   login,
//   allcoms,
//   getmembers,
//   mycode,
//   qrlogin,
//   fetchmyid,
//   addmoney,
//   updateorderstatus,
//   fetchpayhistory,
//   fetchprositecollection,
//   createprosite,
//   fetchsingleprosite,
//   fetchaworkspaceproducts,
//   fetchallorders,
// } = require("../controllers/workspace");

const {
  login,
  allcoms,
  getmembers,
  mycode,
  qrlogin,
  fetchmyid,
  addmoney,
  deleteproduct,
  updateorderstatus,
  fetchpayhistory,
  fetchprositecollection,
  createprosite,
  fetchsingleprosite,
  // fetchaworkspaceproducts,
  fetchallorders,
  // deletecom,
  // editCom,
  create,
  updatecommunity,
  updateproduct,
  registerstore,
  createCollection,
  // colproduct,
  fetchProduct,
  collectiondelete,
} = require("../controllers/workspace");

router.post("/workspacelogin", login);
router.post("/mycode/:rid", mycode);
router.post("/qrlogin/:id/:rid", qrlogin);
router.get("/fetchmyid/:rid", fetchmyid);
// router.get("/allcoms/:id", allcoms);
router.get("/members/:id/:comId", getmembers);
router.post("/addmoney/:id", addmoney);
router.get("/fetchpayhistory/:id", fetchpayhistory);
router.post("/updateorderstatus/:id", updateorderstatus);
router.get("/fetchprositecollection/:id", fetchprositecollection);
// router.get("/fetchaworkspaceproducts/:id", fetchaworkspaceproducts);
// router.get("/fetchallorders/:id", fetchallorders);
router.post("/createprosite/:id", upload.any(), createprosite);
router.get("/fetchsingleprosite/:id/:prositeId", fetchsingleprosite);

// AD code
// community delete

// community edit
// router.post(
//   "/updatecommunity/:userId/:comId",
//   upload.single("image"),
//   updatecommunity
// );
// add product
// router.post("/createproduct/:userId/:colid", upload.any(), create);
// delete product
// router.delete("/deleteproduct/:userId/:colid/:productId", deleteproduct);
// // update product
// router.post("/updateaproduct/:userId/:colid/:productId", updateproduct);
// register details for store
// router.post("/registerstore/:userId", registerstore);
// create collection product
// router.post("/createCollection/:userId", createCollection);
// add products on collection
// router.get("/fetchProducts/:userId", fetchProduct);
// delete collection
// router.delete("/collectiondelete/:userId/:colid", collectiondelete);

module.exports = router;
