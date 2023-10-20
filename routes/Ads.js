const express = require("express");
const {
  newad,
  getad,
  getallads,
  checkaccount,
  createadvacc,
  fetchdashboard,
  editcurrentad,
  editadvertiser,
  verifyadvertiser,
  logoutadv,
  gettransactions,
  addmoneytowallet,
  updatetransactionstatus,
} = require("../controllers/Ads");
const router = express.Router();
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/newad/:id", upload.any(), newad);
router.get("/getad/:id", getad);
router.get("/getallads/:id", getallads);
router.post("/checkadvaccount", checkaccount),
  router.post("/createadvacc", upload.single("image"), createadvacc),
  (module.exports = router);

router.get("/fetchdashboard/:id", fetchdashboard);
router.get("/gettransactions/:id", gettransactions);
router.post("/editcurrentad/:id/:adid", upload.any(), editcurrentad);
router.post("/editadvertiser/:id", upload.any(), editadvertiser);
router.post("/verifyadvertiser/:id", upload.any(), verifyadvertiser);
router.post("/addmoneytowallet/:id", addmoneytowallet);
router.post("/updatetransactionstatus/:id", updatetransactionstatus);
router.post("/logoutadv/:id", logoutadv);
