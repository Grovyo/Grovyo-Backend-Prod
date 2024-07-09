const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  searchnow,
  searchcoms,
  searchpros,
  fetchingprosite,
  mobileSearch,
  addRecentSearchProsite,
  addRecentSearchCommunity,
  removeRecentSearchCommunity,
  removeRecentSearchProsite,
  recentSearch,
  cancellationrequest,
  addRecentPosts,
  removeRecentPost,
  searchall,
} = require("../controllers/searc");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//search posts
router.post("/searchnow/:id", searchnow);

//search communities
router.post("/searchcoms/:id", searchcoms);

//search prosites
router.post("/searchpros", searchpros);

//search all
router.post("/searchall/:id", searchall);

router.get("/getprositedetails/:id", fetchingprosite);
router.post("/web/recentSearch", recentSearch);
router.get("/recentSearches/:id", mobileSearch);
router.post("/addRecentSearchProsite/:id", addRecentSearchProsite);
router.post("/addRecentSearchCommunity/:id", addRecentSearchCommunity);
router.post("/addRecentPosts/:id", addRecentPosts);
router.post("/removeRecentSearchCommunity/:id", removeRecentSearchCommunity);
router.post("/removeRecentSearchProsite/:id", removeRecentSearchProsite);
router.post("/removeRecentPost/:id", removeRecentPost);
router.post("/cancellationrequest/:userid/:orderId", cancellationrequest);

module.exports = router;
