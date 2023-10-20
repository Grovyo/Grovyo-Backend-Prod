const express = require("express");
const router = express.Router();

const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  login,
  allcoms,
  getmembers,
  mycode,
  qrlogin,
  fetchmyid,
  addmoney,
  updateorderstatus,
  fetchpayhistory,
  fetchprositecollection,
  createprosite,
  fetchsingleprosite,
  fetchaworkspaceproducts,
} = require("../controllers/workspace");

router.post("/workspacelogin", login);
router.post("/mycode/:rid", mycode);
router.post("/qrlogin/:id/:rid", qrlogin);
router.get("/fetchmyid/:rid", fetchmyid);
router.get("/allcoms/:id", allcoms);
router.get("/members/:id/:comId", getmembers);
router.post("/addmoney/:id", addmoney);
router.get("/fetchpayhistory/:id", fetchpayhistory);
router.post("/updateorderstatus/:id", updateorderstatus);
router.get("/fetchprositecollection/:id", fetchprositecollection);
router.get("/fetchaworkspaceproducts/:id", fetchaworkspaceproducts);
router.post("/createprosite/:id", upload.any(), createprosite);
router.get("/fetchsingleprosite/:id/:prositeId", fetchsingleprosite);

module.exports = router;
