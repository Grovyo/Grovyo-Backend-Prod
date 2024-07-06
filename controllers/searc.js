const Post = require("../models/post");
const Community = require("../models/community");
const User = require("../models/userAuth");
const Product = require("../models/product");
const { default: mongoose } = require("mongoose");
const Cancellation = require("../models/cancellation");
const aesjs = require("aes-js");

require("dotenv").config();

//search all
// exports.searchall = async (req, res) => {
//   const { query } = req.query;
//   const { id } = req.params;
//   try {
//     if (!query) {
//       res.status(400).json({ success: false });
//     } else {
//       const processedQuery = query.trim().toLowerCase();

//       //posts
//       const posts = await Post.find({
//         title: { $regex: `.*${processedQuery}.*`, $options: "i" },
//         desc: { $regex: `.*${processedQuery}.*`, $options: "i" },
//         status: "Unblock",
//       })
//         .select("title desc post topicId community sender")
//         .limit(5)
//         .populate("community", "dp title createdAt")
//         .populate("sender", "fullname")
//         .lean()
//         .exec();

//       let imgs = [];
//       for (let i = 0; i < posts.length; i++) {
//         if (posts[i].post[0].type === "image/jpg") {
//           imgs.push(process.env.POST_URL + posts[i].post[0].content);
//         } else {
//           if (posts[i].post[0].thumbnail) {
//             imgs.push(process.env.POST_URL + posts[i].post[0].thumbnail);
//           } else {
//             imgs.push(process.env.POST_URL + posts[i].post[0].content);
//           }
//         }
//       }

//       let dp = [];
//       for (let i = 0; i < posts.length; i++) {
//         if (posts[i].community) {
//           dp.push(process.env.URL + posts[i].community.dp);
//         } else {
//           dp.push(process.env.URL + "default.png");
//         }
//       }

//       const mergedposts = posts.map((p, i) => ({
//         p,
//         img: imgs[i],
//         dps: dp[i],
//       }));

//       //coms
//       const pics = [];
//       const creatordps = [];
//       const coms = await Community.find({
//         title: { $regex: `.*${processedQuery}.*`, $options: "i" },
//         type: "public",
//         blocked: { $nin: id },
//       })
//         .populate("creator", "fullname username profilepic isverified")
//         .select("title createdAt dp memberscount")
//         .limit(5)
//         .lean()
//         .exec();
//       for (let i = 0; i < coms.length; i++) {
//         const a = process.env.URL + coms[i].dp;

//         pics.push(a);
//       }
//       for (let i = 0; i < coms.length; i++) {
//         const a = process.env.URL + coms[i].creator.profilepic;

//         creatordps.push(a);
//       }

//       const mergedcoms = coms.map((p, i) => ({
//         p,
//         img: pics[i],
//         dps: creatordps[i],
//       }));

//       //pros
//       const dps = [];
//       const pros = await User.find({
//         $or: [
//           { fullname: { $regex: `.*${processedQuery}.*`, $options: "i" } },
//           { username: { $regex: `.*${processedQuery}.*`, $options: "i" } },
//         ],
//       })
//         .select("fullname profilepic username isverified createdAt")
//         .lean()
//         .limit(5)
//         .exec();

//       for (let i = 0; i < pros.length; i++) {
//         const a = process.env.URL + pros[i].profilepic;

//         dps.push(a);
//       }

//       const mergedpros = pros.map((p, i) => ({
//         p,

//         dps: dps[i],
//       }));
//       res
//         .status(200)
//         .json({ success: true, mergedpros, mergedcoms, mergedposts });
//     }
//   } catch (e) {
//     console.log(e);
//     res.status(400).json({ success: false, message: e.message });
//   }
// };
exports.searchall = async (req, res) => {
  const { query } = req.query;
  const { id } = req.params;

  if (!query) {
    return res
      .status(400)
      .json({ success: false, message: "Query is required" });
  }

  const processedQuery = query.trim().toLowerCase();

  try {
    // Fetch public communities and their IDs
    const publicCommunities = await Community.find({ type: "public" })
      .select("_id")
      .lean();
    const publicCommunityIds = publicCommunities.map(
      (community) => community._id
    );

    // Fetch posts from public communities
    const posts = await Post.find({
      $or: [
        { title: { $regex: `.*${processedQuery}.*`, $options: "i" } },
        { desc: { $regex: `.*${processedQuery}.*`, $options: "i" } },
      ],
      community: { $in: publicCommunityIds },
      status: "Unblock",
    })
      .select("title desc post topicId community sender")
      .limit(5)
      .populate("community", "dp title createdAt")
      .populate("sender", "fullname")
      .lean();

    const mergedPosts = posts.map((post) => ({
      ...post,
      img:
        process.env.POST_URL +
        (post.post[0].type === "image/jpg"
          ? post.post[0].content
          : post.post[0].thumbnail || post.post[0].content),
      dps: post.community
        ? process.env.URL + post.community.dp
        : process.env.URL + "default.png",
    }));

    // Fetch public communities matching the query
    const communities = await Community.find({
      title: { $regex: `.*${processedQuery}.*`, $options: "i" },
      type: "public",
      blocked: { $nin: id },
    })
      .populate("creator", "fullname username profilepic isverified")
      .select("title createdAt dp memberscount")
      .limit(5)
      .lean();

    const mergedCommunities = communities.map((com) => ({
      ...com,
      img: process.env.URL + com.dp,
      dps: process.env.URL + com.creator.profilepic,
    }));

    // Fetch users matching the query
    const users = await User.find({
      $or: [
        { fullname: { $regex: `.*${processedQuery}.*`, $options: "i" } },
        { username: { $regex: `.*${processedQuery}.*`, $options: "i" } },
      ],
    })
      .select("fullname profilepic username isverified createdAt")
      .lean()
      .limit(5);

    const mergedUsers = users.map((user) => ({
      ...user,
      dps: process.env.URL + user.profilepic,
    }));

    // Logging for debugging
    console.log(mergedUsers, "mergedUsers");
    console.log(mergedCommunities, "mergedCommunities");
    console.log(mergedPosts, "mergedPosts");

    return res.status(200).json({
      success: true,
      mergedpros: mergedUsers || [],
      mergedcoms: mergedCommunities || [],
      mergedposts: mergedPosts || [],
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

//search posts
exports.searchnow = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      res.status(400).json({ success: false });
    } else {
      const processedQuery = query.trim().toLowerCase();
      const posts = await Post.find({
        title: { $regex: `.*${processedQuery}.*`, $options: "i" },
        desc: { $regex: `.*${processedQuery}.*`, $options: "i" },
        status: "Unblock",
      })
        .select("title desc post topicId community sender")
        .limit(100)
        .populate("community", "dp title createdAt")
        .populate("sender", "fullname")
        .lean()
        .exec();

      let imgs = [];
      for (let i = 0; i < posts.length; i++) {
        if (posts[i].post[0].type === "image/jpg") {
          imgs.push(process.env.POST_URL + posts[i].post[0].content);
        } else {
          if (posts[i].post[0].thumbnail) {
            imgs.push(process.env.POST_URL + posts[i].post[0].thumbnail);
          } else {
            imgs.push(process.env.POST_URL + posts[i].post[0].content);
          }
        }
      }

      let dp = [];
      for (let i = 0; i < posts.length; i++) {
        if (posts[i].community) {
          dp.push(process.env.URL + posts[i].community.dp);
        } else {
          dp.push(process.env.URL + "default.png");
        }
      }

      res.status(200).json({ success: true, posts, imgs, dp });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false, message: e.message });
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
      const processedQuery = query.trim().toLowerCase();
      const dps = [];
      const creatordps = [];
      const coms = await Community.find({
        title: { $regex: `.*${processedQuery}.*`, $options: "i" },
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

const decryptaes = (data) => {
  try {
    const encryptedBytes = aesjs.utils.hex.toBytes(data);
    const aesCtr = new aesjs.ModeOfOperation.ctr(
      JSON.parse(process.env.key),
      new aesjs.Counter(5)
    );
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);
    const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
    return decryptedText;
  } catch (e) {
    console.log(e);
  }
};

exports.recentSearch = async (req, res) => {
  try {
    let users = [];
    if (req.body.length > 0) {
      for (let i = 0; i < req.body.length; i++) {
        const id = decryptaes(req.body[i]);
        const userselect = await User.findById(id).select(
          "profilepic isverified fullname username"
        );
        const dp = process.env.URL + userselect?.profilepic;

        const user = {
          dp,
          isverified: userselect.isverified,
          fullname: userselect.fullname,
          username: userselect.username,
          id: userselect._id,
        };
        users.push(user);
      }
      res.status(200).json({ success: true, users });
    } else {
      res.status(400).json({ success: false, message: "No Recent Searchs!" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message, success: false });
  }
};

exports.searchpros = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      res.status(400).json({ success: false });
    } else {
      const processedQuery = query.trim().toLowerCase();
      const dps = [];
      const pros = await User.find({
        $or: [
          { fullname: { $regex: `.*${processedQuery}.*`, $options: "i" } },
          { username: { $regex: `.*${processedQuery}.*`, $options: "i" } },
        ],
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

    console.log(user.fullname);
    const community = [];
    const com = await Community.find({ creator: user._id });
    for (let i = 0; i < com.length; i++) {
      const id = com[i];
      let comm = await Community.findById(id)
        .populate("members", "dp")
        .populate("posts");
      community.push(comm);
    }

    const communityDps = await Promise.all(
      community.map((d) => {
        const imageforCommunity = process.env.URL + d.dp;

        return imageforCommunity;
      })
    );

    const communityWithPosts = await Promise.all(
      community.map(async (d) => {
        const id = d?.posts;
        const data = [];
        const posts = await Post.find({ _id: id }).sort({ likes: -1 }).limit(5);

        for (let i = 0; i < posts.length; i++) {
          const obj = {
            title: posts[i].title,
            dp: process.env.POST_URL + posts[i].post[0].content,
            type: posts[i].post[0].type,
          };
          data.push(obj);
        }
        return data;
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
      return {
        ...f.toObject(),
        dps: communityDps[i],
        membersdp: membersdp[i],
        communityWithPosts: communityWithPosts[i],
      };
    });

    const products = await Product.find({ creator: user._id });

    const productdps = await Promise.all(
      products.map(async (product) => {
        let a;
        if (product.isvariant) {
          a =
            process.env.PRODUCT_URL +
            product?.variants[0]?.category[0]?.content;
        } else {
          a = process.env.PRODUCT_URL + product?.images[0]?.content;
        }
        return a;
      })
    );

    // const posts = await Post.find({}).sort({ likes: -1 }).limit(3);

    // const postdp = await Promise.all(
    //   posts.map(async (post) => {
    //     const a = process.env.POST_URL + post.post[0].content
    //     return a;
    //   })
    // );

    // const postsWithDps = posts.map((post, index) => {
    //   return {
    //     ...post.toObject(),
    //     dp: postdp[index],
    //   };
    // });

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
      isverified: user.isverified,
      fullname: user.fullname,
      dp: process.env.URL + user.profilepic,
      isStore: user.showStoreSection,
      useDefaultProsite: user.useDefaultProsite,
      isAbout: user.showAboutSection,
      isCommunity: user.showCommunitySection,
      location: user.address[0],
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
    user.recentPrositeSearches = user.recentPrositeSearches.filter(
      (searchId) => searchId.toString() !== sId
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
      (searchId) => searchId.toString() !== sId
    );
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Search Community removed successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};
exports.removeRecentPost = async (req, res) => {
  try {
    const { sId } = req.body;
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    user.recentPosts = user.recentPosts.filter(
      (searchId) => searchId.toString() !== sId
    );
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Search Post removed successfully",
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

exports.addRecentPosts = async (req, res) => {
  try {
    const { sId } = req.body;
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    if (!user.recentPosts.includes(sId)) {
      user.recentPosts.push(sId);
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
    const recentPost = [];

    for (let i = 0; i < user.recentPrositeSearches.length; i++) {
      const anotherUsers = await User.findById(user.recentPrositeSearches[i]);
      const data = {
        id: anotherUsers?._id,
        fullname: anotherUsers.fullname,
        username: anotherUsers.username,
        dp: process.env.URL + anotherUsers?.profilepic,
        isverified: anotherUsers.isverified,
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
        dp: process.env.URL + anotherCommunity?.dp,
        member: anotherCommunity?.memberscount,
        isverified: anotherCommunity?.isverified,
      };

      recentSearchesCommunity.push(data);
    }
    for (let i = 0; i < user.recentPosts.length; i++) {
      const anotherCommunity = await Post.findById(
        user.recentPosts[i]
      ).populate("community", "memberscount ");
      const data = {
        id: anotherCommunity?._id,
        title: anotherCommunity?.title,
        dp:
          anotherCommunity.post[0].type === "image/jpg" ||
          anotherCommunity.post[0].type === "image/jpeg"
            ? process.env.POST_URL + anotherCommunity.post[0].content
            : anotherCommunity.post[0].thumbnail
            ? process.env.POST_URL + anotherCommunity.post[0].thumbnail
            : process.env.POST_URL + anotherCommunity.post[0].content,
        desc: anotherCommunity.desc,
        comId: anotherCommunity.community,
        topicId: anotherCommunity.topicId,
        createdAt: anotherCommunity.createdAt,
      };

      recentPost.push(data);
    }
    res.status(200).json({
      success: true,
      recentSearchesCommunity,
      recentSearchesProsites,
      recentPost,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: "Something Went Wrong!" });
  }
};

exports.cancellationrequest = async (req, res) => {
  try {
    const { userid, orderId } = req.params;
    const { reason } = req.body;
    const cancel = new Cancellation({
      userid,
      orderId,
      reason,
    });
    await cancel.save();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: "Something Went Wrong!" });
  }
};
