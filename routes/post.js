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
} = require("../controllers/post");
const { votenowpoll } = require("../controllers/community");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/createphoto/:userId/:commId", upload.any(), createPhoto);
router.post("/postanything/:userId/:comId", upload.any(), postanything);
router.post("/createvideo/:userId/:commId", upload.any(), createVideo);
router.get("/getfeed/:userId", fetchfeed);
router.get("/v1/getfeed/:userId", newfetchfeed);
router.get("/fetchmore/:userId", fetchmore);
router.get("/fetchonepost/:postId", fetchonepost);
router.get("/getfollowingfeed/:userId", joinedcom);
router.get("/v1/getfollowingfeed/:userId", joinedcomnew);
router.get("/getallposts/:comId/:userId/:postId", getallposts);
router.get("/getpost/:userId", getpost);
router.post("/likepost/:userId/:postId", likepost);
router.post("/dislikepost/:userId/:postId", dislikepost);
router.post("/test123", upload.single("video"), test);
router.post("/updatesettings/:id", updatesettings);

router.post("/createpollcom/:id/:comId", upload.any(), createpollcom);

router.post("/votenowpoll/:id/:postId/:opId", votenowpoll);

router.delete("/deletepost/:userId/:postId", deletepost);

//delete null posts
router.post("/deletnull", delenu);

module.exports = router;
