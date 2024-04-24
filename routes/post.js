const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  createPhoto,
  createVideo,
  getpost,
  fetchfeed,
  likepost,
  dislikepost,
  fetchonepost,
  deletepost,
  joinedcom,
  getallposts,
  test,
  updatesettings,
  fetchmore,
  postanything,
  newfetchfeed,
  delenu,
  createpollcom,
  joinedcomnew,
  datadownload2,
  newfetchfeeds3,
  joinedcomnews3,
  postanythings3,
  fetchinterest,
  reseteverycart,
  fetchmoredata,
} = require("../controllers/post");
const { votenowpoll } = require("../controllers/community");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 100000000 } });

// router.post("/createphoto/:userId/:commId", upload.any(), createPhoto);
router.post("/postanything/:userId/:comId", upload.any(), postanythings3);
// router.post("/createvideo/:userId/:commId", upload.any(), createVideo);
// router.get("/getfeed/:userId", fetchfeed);
router.get("/v1/getfeed/:userId", newfetchfeeds3);
router.get("/v1/fetchmore/:userId", fetchmoredata);
router.get("/fetchonepost/:postId", fetchonepost);
router.get("/getfollowingfeed/:userId", joinedcom);
router.get("/v1/getfollowingfeed/:userId", joinedcomnews3);
router.get("/getallposts/:comId/:userId/:postId", getallposts);
router.get("/getpost/:userId", getpost);
router.post("/likepost/:userId/:postId", likepost);
router.post("/dislikepost/:userId/:postId", dislikepost);
router.post("/test123", upload.single("video"), test);
router.post("/updatesettings/:id", updatesettings);

router.post("/createpollcom/:id/:comId/:topicId", upload.any(), createpollcom);

router.post("/votenowpoll/:id/:postId/:opId", votenowpoll);

router.delete("/deletepost/:userId/:postId", deletepost);

router.get("/datadownload1", datadownload2);

//delete null posts
router.post("/deletnull", delenu);

//s3 routes

//new for you
router.get("/v2/getfeed/:userId", newfetchfeeds3);

//get community feed
router.get("/v2/getfollowingfeed/:userId", joinedcomnews3);

//post anything
router.post(
  "/v1/postanything/:userId/:comId/:topicId",
  upload.any(),
  postanythings3
);

//fetchinterests
router.get("/v1/fetchinterest", fetchinterest);

//reseteverycart
router.post("/v1/reseteverycart", reseteverycart);

module.exports = router;
