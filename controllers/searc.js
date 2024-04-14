const Post = require("../models/post");
const Community = require("../models/community");
const User = require("../models/userAuth");
const Minio = require("minio");
const Product = require("../models/product");
const { default: mongoose } = require("mongoose");

require("dotenv").config();

const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.xyz",

  useSSL: true,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});

//function to generate a presignedurl of minio
async function generatePresignedUrl(bucketName, objectName, expiry = 604800) {
  try {
    const presignedUrl = await minioClient.presignedGetObject(
      bucketName,
      objectName,
      expiry
    );
    return presignedUrl;
  } catch (err) {
    console.error(err);
    throw new Error("Failed to generate presigned URL");
  }
}

//search posts
exports.searchnow = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      res.status(400).json({ success: false });
    } else {
      const posts = await Post.find({
        title: { $regex: `.*${query}.*`, $options: "i" },
      }).exec();
      res.status(200).json(posts);
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//search communities
exports.searchcoms = async (req, res) => {
  const { id } = req.params;
  const { query } = req.query;
  try {
    if (!query) {
      res.status(400).json({ success: false });
    } else {
      const dps = [];
      const creatordps = [];
      const coms = await Community.find({
        title: { $regex: `.*${query}.*`, $options: "i" },
        type: "public",
        blocked: { $nin: id },
      })
        .populate("creator", "fullname username profilepic isverified")
        .select("title createdAt dp memberscount")
        .limit(100)
        .lean()
        .exec();
      for (let i = 0; i < coms.length; i++) {
        const a = process.env.URL + coms[i].dp;

        dps.push(a);
      }
      for (let i = 0; i < coms.length; i++) {
        const a = process.env.URL + coms[i].creator.profilepic;

        creatordps.push(a);
      }
      res.status(200).json({ data: { coms, dps, creatordps }, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//search prosites

exports.searchpros = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      res.status(400).json({ success: false });
    } else {
      const dps = [];
      const pros = await User.find({
        fullname: { $regex: `.*${query}.*`, $options: "i" },
      })
        .select("fullname profilepic username isverified createdAt")
        .lean()
        .limit(100)
        .exec();

      for (let i = 0; i < pros.length; i++) {
        const a = process.env.URL + pros[i].profilepic;

        dps.push(a);
      }
      res.status(200).json({ data: { pros, dps, success: true } });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.fetchingprosite = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ username: id }).select("-password");
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User Not Found" });
    }
    const community = [];
    const com = await Community.find({ creator: user._id });
    for (let i = 0; i < com.length; i++) {
      const id = com[i];
      let comm = await Community.findById(id).populate("members", "dp");
      community.push(comm);
    }

    const communityDps = await Promise.all(
      community.map((d) => {
        const imageforCommunity = process.env.URL + d.dp;

        return imageforCommunity;
      })
    );

    const membersdp = await Promise.all(
      community.map(async (d) => {
        const dps = await Promise.all(
          d.members.map(async (userId) => {
            const member = await User.findById(userId);
            const dp = process.env.URL + member.profilepic;
            return dp;
          })
        );
        return dps;
      })
    );

    const communitywithDps = community.map((f, i) => {
      return { ...f.toObject(), dps: communityDps[i], membersdp: membersdp[i] };
    });

    const products = await Product.find({ creator: user._id });

    const productdps = await Promise.all(
      products.map(async (product) => {
        const a = process.env.PRODUCT_URL + product.images[0].content;
        return a;
      })
    );

    const productsWithDps = products.map((product, index) => {
      return {
        ...product.toObject(),
        dp: productdps[index],
      };
    });

    const userDetails = {
      bio: user.desc,
      phone: user.phone,
      username: user.username,
      fullname: user.fullname,
      dp: process.env.URL + user.profilepic,
      isStore: user.showStoreSection,
      isAbout: user.showAboutSection,
      isCommunity: user.showCommunitySection,
      temp: user.prositeweb_template,
      temp1: user.prositemob_template,
      email: user.email,
      links: {
        insta: user.insta,
        snap: user.snap,
        x: user.x,
        yt: user.yt,
        linkdin: user.linkdin,
      },
    };
    const data = {
      communitywithDps,
      productsWithDps,
      userDetails,
    };

    res.status(200).json({ success: true, data, user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message, success: false });
  }
};

exports.removeRecentSearchProsite = async (req, res) => {
  try {
    const { sId } = req.body;
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    user.recentCommunitySearches = user.recentCommunitySearches.filter(
      (searchId) => searchId !== sId
    );
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "Search Prosite removed successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message, success: false });
  }
};

exports.removeRecentSearchCommunity = async (req, res) => {
  try {
    const { sId } = req.body;
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    user.recentCommunitySearches = user.recentCommunitySearches.filter(
      (searchId) => searchId !== sId
    );
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Search Community removed successfully",
    });
  } catch (error) {
    res.status(400).json({ message: error.message, success: false });
  }
};

exports.addRecentSearchCommunity = async (req, res) => {
  try {
    const { sId } = req.body;
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    if (!user.recentCommunitySearches.includes(sId)) {
      user.recentCommunitySearches.push(sId);
      await user.save();
      return res.status(201).json({ success: true, message: "Added!" });
    } else {
      return res
        .status(200)
        .json({ success: true, message: "Already Present!" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message, success: false });
  }
};

exports.addRecentSearchProsite = async (req, res) => {
  try {
    const { sId } = req.body;
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    if (!user.recentPrositeSearches.includes(sId)) {
      user.recentPrositeSearches.push(sId);
      await user.save();
      return res.status(201).json({ success: true, message: "Added!" });
    } else {
      return res
        .status(200)
        .json({ success: true, message: "Already Present!" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message, success: false });
  }
};

exports.mobileSearch = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found!" });
    }
    const recentSearchesProsites = [];
    const recentSearchesCommunity = [];
    for (let i = 0; i < user.recentPrositeSearches.length; i++) {
      const anotherUsers = await User.findById(user.recentPrositeSearches[i]);
      const data = {
        id: anotherUsers?._id,
        fullname: anotherUsers.fullname,
        username: anotherUsers.username,
        dp: process.env.URL + user.profilepic,
      };
      recentSearchesProsites.push(data);
    }
    for (let i = 0; i < user.recentCommunitySearches.length; i++) {
      const anotherCommunity = await Community.findById(
        user.recentCommunitySearches[i]
      );
      const data = {
        id: anotherCommunity?._id,
        title: anotherCommunity?.title,
        dp: process.env.URL + anotherCommunity.dp,
      };
      recentSearchesCommunity.push(data);
    }
    res
      .status(200)
      .json({ success: true, recentSearchesCommunity, recentSearchesProsites });
  } catch (error) {
    res.status(400).json({ success: false, message: "Something Went Wrong!" });
  }
};
