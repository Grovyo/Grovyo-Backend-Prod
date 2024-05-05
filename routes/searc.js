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
} = require("../controllers/searc");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//search posts
router.post("/searchnow", searchnow);

//search communities
router.post("/searchcoms/:id", searchcoms);

//search communities
router.post("/searchpros", searchpros);

router.get("/getprositedetails/:id", fetchingprosite);
router.post("/web/recentSearch", recentSearch);
router.get("/recentSearches/:id", mobileSearch);
router.post("/addRecentSearchProsite/:id", addRecentSearchProsite);
router.post("/addRecentSearchCommunity/:id", addRecentSearchCommunity);
router.post("/removeRecentSearchCommunity/:id", removeRecentSearchCommunity);
router.post("/removeRecentSearchProsite/:id", removeRecentSearchProsite);

module.exports = router;
