const express = require("express");
const router = express.Router();
const formidable = require("express-formidable");
const multer = require("multer");

//imports
const {
  signup,
  verify,
  signout,
  filldetails,
  interests,
  test,
  gettest,
  signupmobile,
  filldetailsphone,
  adminlogin,
  returnuser,
  checkusername,
  createnewaccount,
  createnew,
  checkemail,
  createnewaccountemail,
  getdetails,
  postdetails,
  createnewaccountweb,
  screentrack,
  appcheck,
  updatedetails,
  updateaccount,
  blockpeople,
  fetchblocklist,
  contactsuggestions,
  checkconversations,
  checkLastConvMessage,
  checkconversationsnew,
  updatenotification,
  checkLastConvMessagenew,
  addbank,
} = require("../controllers/userAuth");
const { userbyId } = require("../controllers/user");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/signup", signup);
router.post("/signup-mobile", signupmobile);
router.post("/verify", verify);
router.post("/signout/:id", signout);
router.get("/getdetails/:id", returnuser);
router.post("/checkusername", checkusername);
router.post("/updateaccount/:id", upload.single("image"), updateaccount);
router.post("/v1/createnewaccount", upload.single("image"), createnewaccount);
router.post(
  "/v1/createnewaccountweb",
  upload.single("image"),
  createnewaccountweb
);
router.post(
  "/v1/createnewaccountemail",
  upload.single("image"),
  createnewaccountemail
);
router.post("/v1/checkacc", checkemail);
router.post("/filldetailsemail/:userId", upload.single("image"), filldetails);

router.post(
  "/filldetailsphone/:userId",
  upload.single("image"),
  filldetailsphone
);
router.post("/interest/:userId", interests);
router.post("/adminlogin007", adminlogin);
router.get("/:id", gettest);
router.post("/test", upload.any(), test);
router.get("/getdetails/:id", getdetails);
router.post("/postdetails/:id", postdetails);
router.post("/updatedetails/:id", updatedetails);
router.post("/screentrack/:id", screentrack);
router.get("/appcheck/:id", appcheck);
router.get("/fetchblocklist/:id", fetchblocklist);
router.post("/blockpeople/:id", blockpeople);
router.post("/contactsuggestions/:id", contactsuggestions);
router.post("/checkconversations/:id", checkconversations);
router.post("/v1/checkconversations/:id", checkconversationsnew);
router.post("/checkLastConvMessage/:convId/:userId", checkLastConvMessage);
router.post(
  "/v1/checkLastConvMessage/:convId/:userId",
  checkLastConvMessagenew
);
router.post("/updatenotification/:userId", updatenotification);
router.post("/addbank/:id", addbank);

router.param("userId", userbyId);

module.exports = router;
