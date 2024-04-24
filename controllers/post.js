const Post = require("../models/post");
const User = require("../models/userAuth");
const Community = require("../models/community");
const uuid = require("uuid").v4;
const Minio = require("minio");
const Topic = require("../models/topic");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const Ads = require("../models/Ads");
const Tag = require("../models/Tags");
const Interest = require("../models/Interest");
const stream = require("stream");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");
const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const admin = require("../fireb");

const BUCKET_NAME = process.env.BUCKET_NAME;
const POST_BUCKET = process.env.POST_BUCKET;

const s3 = new S3Client({
  region: process.env.BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const { Queue, Worker } = require("bullmq");

const compressqueue = new Queue("compress-pending", {
  connection: {
    host: "139.59.84.102",
    port: 6379,
  },
});

//getting url
// const getUrl = async () => {
//   try {
//     const url = getSignedUrl({
//       url:
//         "https://dn3w8358m09e7.cloudfront.net/" +
//         "WhatsApp Image 2024-01-29 at 7.34.22 PM.jpeg",
//       dateLessThan: new Date(Date.now() + 1000 * 60 * 60 * 24),
//       privateKey: "KF57MO0QETG33",
//       keyPairId: process.env.PRIVATE_KEY,
//     });
//     console.log(url);
//     return url;
//   } catch (e) {
//     console.log(e.message, "Error getting content");
//   }
// };
// getUrl();

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

//Photo posting
exports.createPhoto = async (req, res) => {
  const { userId, commId } = req.params;
  const { title, desc, tags } = req.body;
  const comm = await Community.findById(commId);
  const image = req.files[0];

  const topic = await Topic.find({ community: commId }).find({
    title: "Posts",
  });
  if (!image) {
    res.status(400).json({ message: "Must have one image", success: false });
  } else if (comm.creator.toString() !== userId) {
    res
      .status(400)
      .json({ message: "You cannot post in this community.", success: false });
  } else {
    try {
      const uuidString = uuid();
      if (image) {
        const bucketName = "posts";
        const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;
        a1 = objectName;
        a2 = image.mimetype;

        await sharp(image.buffer)
          .jpeg({ quality: 50 })
          .toBuffer()
          .then(async (data) => {
            await minioClient.putObject(bucketName, objectName, data);
          })
          .catch((err) => {
            console.log(err.message, "-error");
          });

        let po = { content: objectName, type: image.mimetype };

        const p = new Post({
          title,
          desc,
          community: commId,
          sender: userId,
          post: po,
          tags: tags,
        });
        const ne = await p.save();
        await Community.updateOne(
          { _id: commId },
          { $push: { posts: ne._id }, $inc: { totalposts: 1 } }
        );
        await Topic.updateOne(
          { _id: topic[0]._id },
          { $push: { posts: ne._id }, $inc: { postcount: 1 } }
        );

        res.status(200).json({ ne, success: true });
      }
    } catch (e) {
      res.status(500).json({ message: e.message, success: false });
    }
  }
};

//videos posting
exports.createVideo = async (req, res) => {
  const { userId, commId } = req.params;
  const { title, desc, tags } = req.body;
  const { originalname, buffer, mimetype } = req.files[0];
  const comm = await Community.findById(commId);
  const topic = await Topic.find({ community: commId }).find({
    title: "Posts",
  });

  const uuidString = uuid();
  if (!originalname) {
    res.status(400).json({ message: "Please upload a video", success: false });
  } else if (comm.creator.toString() !== userId) {
    res
      .status(400)
      .json({ message: "You cannot post in this community.", success: false });
  } else {
    try {
      const size = buffer.byteLength;
      const bucketName = "posts";
      const objectName = `${Date.now()}_${uuidString}_${originalname}`;

      await minioClient.putObject(
        bucketName,
        objectName,
        buffer
        // size,
        // mimetype
      );

      let po = { content: objectName, type: mimetype, size: size };

      const v = new Post({
        title,
        desc,
        community: commId,
        sender: userId,
        post: po,
        tags: tags,
      });
      const ne = await v.save();
      await Community.updateOne(
        { _id: commId },
        { $push: { posts: ne._id }, $inc: { totalposts: 1 } }
      );
      await Topic.updateOne(
        { _id: topic[0]._id },
        { $push: { posts: ne._id }, $inc: { postcount: 1 } }
      );

      res.status(200).json({ ne, success: true });
    } catch (e) {
      res.status(500).json({ message: e.message, success: false });
    }
  }
};

//get posts
exports.getpost = async (req, res) => {
  try {
    const posts = await Post.find({ sender: req.params.userId }).populate(
      "sender",
      "fullname profilepic"
    );
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//fetch userfeed acc to interests
exports.fetchfeed = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    const dps = [];
    let current = [];
    const memdps = [];
    const subs = [];
    const liked = [];
    const ads = [];
    const urls = [];
    const content = [];
    const addp = [];
    //fetching post
    const post = await Post.aggregate([
      { $match: { tags: { $in: user.interest } } },
      { $sample: { size: 50 } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "community",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "community.members",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $addFields: {
          sender: { $arrayElemAt: ["$sender", 0] },
          community: { $arrayElemAt: ["$community", 0] },
        },
      },
      {
        $addFields: {
          "community.members": {
            $map: {
              input: { $slice: ["$members", 0, 4] },
              as: "member",
              in: {
                _id: "$$member._id",
                fullname: "$$member.fullname",
                profilepic: "$$member.profilepic",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          status: 1,
          likedby: 1,
          likes: 1,
          dislike: 1,
          comments: 1,
          totalcomments: 1,
          tags: 1,
          view: 1,
          desc: 1,
          isverified: 1,
          post: 1,
          contenttype: 1,
          date: 1,
          sharescount: 1,
          sender: {
            _id: 1,
            fullname: 1,
            profilepic: 1,
          },
          community: {
            _id: 1,
            title: 1,
            dp: 1,
            members: 1,
            memberscount: 1,
            isverified: 1,
          },
        },
      },
    ]);

    for (let i = 0; i < post.length; i++) {
      if (
        post[i].likedby?.some((id) => id.toString() === user._id.toString())
      ) {
        liked.push(true);
      } else {
        liked.push(false);
      }
    }

    for (let k = 0; k < post.length; k++) {
      const coms = await Community.findById(post[k].community);

      if (coms?.members?.includes(user?._id)) {
        subs.push("subscribed");
      } else {
        subs.push("unsubscribed");
      }
    }

    if (!post) {
      res.status(201).json({ message: "No post found", success: false });
    } else {
      //fetching ad
      const birthdateString = user.DOB;
      const [birthDay, birthMonth, birthYear] = birthdateString
        .split("/")
        .map(Number);

      // Get the current date
      const currentDate = new Date();

      // Get the current day, month, and year
      const currentDay = currentDate.getDate();
      const currentMonth = currentDate.getMonth() + 1; // Month is zero-based
      const currentYear = currentDate.getFullYear();

      // Calculate the age
      let age = currentYear - birthYear;
      if (
        currentMonth < birthMonth ||
        (currentMonth === birthMonth && currentDay < birthDay)
      ) {
        age--; // Adjust age if birthday hasn't occurred yet this year
      }

      const ad = await Ads.aggregate([
        {
          $match: {
            tags: { $in: user.interest },
            // location: { $eq: user.location },
            status: { $eq: "Active" },
          },
        },
        {
          $lookup: {
            from: "users", // Assuming the collection name for users is "users"
            localField: "creator", // Assuming the field storing the creator ObjectId is "creator"
            foreignField: "_id",
            as: "creator",
          },
        },
        {
          $addFields: {
            creatorName: { $arrayElemAt: ["$creator.fullname", 0] },
            creatorProfilePic: { $arrayElemAt: ["$creator.profilepic", 0] },
            isverified: { $arrayElemAt: ["$creator.isverified", 0] },
          },
        },
        {
          $project: {
            creator: 0, // Exclude the creator field if needed
          },
        },
        { $sample: { size: 1 } },
      ]);

      for (let i = 0; i < ad.length; i++) {
        if (ad[i].ageup > age && ad[i].agedown < age) {
          ads.push(ad[i]);
        }
      }

      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "ads",
          ads[i].content.toString(),
          60 * 60
        );
        content.push(dp);
      }

      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "images",
          ads[i].creatorProfilePic.toString(),
          60 * 60
        );
        addp.push(dp);
      }

      for (let i = 0; i < post.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          post[i].community.dp.toString(),
          60 * 60
        );
        dps.push(a);
      }

      for (let i = 0; i < post.length; i++) {
        const a = await generatePresignedUrl(
          "posts",
          post[i].post.toString(),
          60 * 60
        );
        urls.push(a);
      }

      for (let i = 0; i < post.length; i++) {
        for (
          let j = 0;
          j < Math.min(4, post[i].community.members.length);
          j++
        ) {
          const a = await generatePresignedUrl(
            "images",
            post[i]?.community?.members[j]?.profilepic.toString(),
            60 * 60
          );
          current.push(a);
        }

        memdps.push(current);
        current = [];
      }

      const dpData = dps;
      const memdpData = memdps;
      const urlData = urls;
      const postData = post;
      const subData = subs;
      const likeData = liked;

      const mergedData = urlData.map((u, i) => ({
        dps: dpData[i],
        memdps: memdpData[i],
        urls: u,
        liked: likeData[i],
        subs: subData[i],
        posts: postData[i],
      }));

      res.status(200).json({
        mergedData,

        success: true,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err, success: false });
  }
};

//fetch more data
exports.fetchmore = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    const dps = [];
    let current = [];
    const memdps = [];
    const subs = [];
    const liked = [];
    const ads = [];
    const urls = [];
    const content = [];
    const addp = [];
    //fetching post
    const post = await Post.aggregate([
      { $match: { tags: { $in: user.interest } } },
      { $sample: { size: 50 } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "community",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "community.members",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $addFields: {
          sender: { $arrayElemAt: ["$sender", 0] },
          community: { $arrayElemAt: ["$community", 0] },
        },
      },
      {
        $addFields: {
          "community.members": {
            $map: {
              input: { $slice: ["$members", 0, 4] },
              as: "member",
              in: {
                _id: "$$member._id",
                fullname: "$$member.fullname",
                profilepic: "$$member.profilepic",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          status: 1,
          likedby: 1,
          likes: 1,
          dislike: 1,
          comments: 1,
          totalcomments: 1,
          tags: 1,
          view: 1,
          desc: 1,
          isverified: 1,
          post: 1,
          contenttype: 1,
          date: 1,
          sharescount: 1,
          sender: {
            _id: 1,
            fullname: 1,
            profilepic: 1,
          },
          community: {
            _id: 1,
            title: 1,
            dp: 1,
            members: 1,
            memberscount: 1,
            isverified: 1,
          },
        },
      },
    ]);

    for (let i = 0; i < post.length; i++) {
      if (
        post[i].likedby?.some((id) => id.toString() === user._id.toString())
      ) {
        liked.push(true);
      } else {
        liked.push(false);
      }
    }

    for (let k = 0; k < post.length; k++) {
      const coms = await Community.findById(post[k].community);
      if (coms.members.includes(user._id)) {
        subs.push("subscribed");
      } else {
        subs.push("unsubscribed");
      }
    }

    if (!post) {
      res.status(201).json({ message: "No post found", success: false });
    } else {
      //fetching ad
      const birthdateString = user.DOB;
      const [birthDay, birthMonth, birthYear] = birthdateString
        .split("/")
        .map(Number);

      // Get the current date
      const currentDate = new Date();

      // Get the current day, month, and year
      const currentDay = currentDate.getDate();
      const currentMonth = currentDate.getMonth() + 1; // Month is zero-based
      const currentYear = currentDate.getFullYear();

      // Calculate the age
      let age = currentYear - birthYear;
      if (
        currentMonth < birthMonth ||
        (currentMonth === birthMonth && currentDay < birthDay)
      ) {
        age--; // Adjust age if birthday hasn't occurred yet this year
      }

      const ad = await Ads.aggregate([
        {
          $match: {
            tags: { $in: user.interest },
            // location: { $eq: user.location },
            status: { $eq: "Active" },
          },
        },
        {
          $lookup: {
            from: "users", // Assuming the collection name for users is "users"
            localField: "creator", // Assuming the field storing the creator ObjectId is "creator"
            foreignField: "_id",
            as: "creator",
          },
        },
        {
          $addFields: {
            creatorName: { $arrayElemAt: ["$creator.fullname", 0] },
            creatorProfilePic: { $arrayElemAt: ["$creator.profilepic", 0] },
            isverified: { $arrayElemAt: ["$creator.isverified", 0] },
          },
        },
        {
          $project: {
            creator: 0, // Exclude the creator field if needed
          },
        },
        { $sample: { size: 1 } },
      ]);

      for (let i = 0; i < ad.length; i++) {
        if (ad[i].ageup > age && ad[i].agedown < age) {
          ads.push(ad[i]);
        }
      }

      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "ads",
          ads[i].content.toString(),
          60 * 60
        );
        content.push(dp);
      }

      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "images",
          ads[i].creatorProfilePic.toString(),
          60 * 60
        );
        addp.push(dp);
      }

      for (let i = 0; i < post.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          post[i].community.dp.toString(),
          60 * 60
        );
        dps.push(a);
      }

      for (let i = 0; i < post.length; i++) {
        const a = await generatePresignedUrl(
          "posts",
          post[i].post.toString(),
          60 * 60
        );
        urls.push(a);
      }

      for (let i = 0; i < post.length; i++) {
        for (
          let j = 0;
          j < Math.min(4, post[i].community.members.length);
          j++
        ) {
          const a = await generatePresignedUrl(
            "images",
            post[i].community.members[j].profilepic.toString(),
            60 * 60
          );
          current.push(a);
        }

        memdps.push(current);
        current = [];
      }

      const dpData = dps;
      const memdpData = memdps;
      const urlData = urls;
      const postData = post;
      const subData = subs;
      const likeData = liked;

      const mergedData = urlData.map((u, i) => ({
        dps: dpData[i],
        memdps: memdpData[i],
        urls: u,
        liked: likeData[i],
        subs: subData[i],
        posts: postData[i],
      }));

      res.status(200).json({
        mergedData,

        success: true,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err, success: false });
  }
};

//joined community content list of 24 hours
exports.joinedcom = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  const time = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const communities = await Community.find({
      members: { $in: user._id },
    })
      .populate("members", "profilepic")
      .populate("creator", "fullname");
    const ownedcoms = await Community.find({ creator: user._id.toString() });
    if (!communities || communities.length === 0) {
      res.status(200).json({ message: "No communities found", success: true });
      return;
    }

    const dps = [];
    const urls = [];
    const posts = [];
    const liked = [];
    let current = [];
    const memdps = [];

    // Sort communities based on whether they have a post and the latest post first
    communities.sort((a, b) => {
      const postA = a.posts.length > 0 ? a.posts[0].createdAt : 0;
      const postB = b.posts.length > 0 ? b.posts[0].createdAt : 0;
      return postB - postA;
    });

    for (const community of communities) {
      const post = await Post.find({
        community: community._id,
        type: "Poll",
      })
        .populate("sender", "fullname")
        .sort({ createdAt: -1 })
        .limit(1);
      posts.push(post);

      for (let j = 0; j < Math.min(4, community.members.length); j++) {
        const a = await generatePresignedUrl(
          "images",
          community.members[j].profilepic.toString(),
          60 * 60
        );
        current.push(a);
      }

      memdps.push(current);
      current = [];

      if (post.length > 0) {
        const like = post[0]?.likedby?.includes(user._id);
        liked.push(like);
      } else {
        liked.push(false);
      }

      let ur = [];
      for (let j = 0; j < post[0]?.post?.length; j++) {
        const a = await generatePresignedUrl(
          "posts",
          post[0].post[j].content?.toString(),
          60 * 60
        );

        ur.push({ content: a, type: post[0].post[j]?.type });
      }

      urls.push(ur);

      const a = await generatePresignedUrl(
        "images",
        community.dp.toString(),
        60 * 60
      );
      dps.push(a);
    }

    const dpData = dps;
    const memdpData = memdps;
    const urlData = urls;
    const postData = posts;
    const communityData = communities;
    const likeData = liked;

    const mergedData = communityData.map((c, i) => ({
      dps: dpData[i],
      memdps: memdpData[i],
      urls: urlData[i],
      liked: likeData[i],
      community: c,
      posts: postData[i],
    }));

    //arrange acc ot latest post first
    mergedData.sort((a, b) => {
      const timeA = a?.posts[0]?.createdAt || 0;
      const timeB = b?.posts[0]?.createdAt || 0;

      return timeB - timeA;
    });

    res.status(200).json({
      mergedData,
      communitycreated: user?.communitycreated?.length,
      success: true,
      cancreate: ownedcoms?.length >= 2 ? false : true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//joined community content list new without 24 hours
exports.joinedcomnew = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  try {
    const communities = await Community.find({
      members: { $in: user._id },
    })
      .populate("members", "profilepic")
      .populate("creator", "fullname");

    const ownedcoms = await Community.find({ creator: user._id.toString() });

    if (!communities || communities.length === 0) {
      res.status(200).json({ message: "No communities found", success: true });
      return;
    }

    const dps = [];
    const urls = [];
    const posts = [];
    const liked = [];
    let current = [];
    const memdps = [];

    // Sort communities based on whether they have a post and the latest post first
    communities.sort((a, b) => {
      const postA = a.posts.length > 0 ? a.posts[0].createdAt : 0;
      const postB = b.posts.length > 0 ? b.posts[0].createdAt : 0;
      return postB - postA;
    });

    for (const community of communities) {
      const post = await Post.find({
        community: community._id,
        type: "Post",
      })
        .populate("sender", "fullname")
        .sort({ createdAt: -1 })
        .limit(1);
      posts.push(post);

      for (let j = 0; j < Math.min(4, community.members.length); j++) {
        const a = await generatePresignedUrl(
          "images",
          community.members[j].profilepic.toString(),
          60 * 60
        );
        current.push(a);
      }

      memdps.push(current);
      current = [];

      if (post.length > 0) {
        const like = post[0]?.likedby?.includes(user._id);
        liked.push(like);
      } else {
        liked.push(false);
      }

      let ur = [];
      for (let j = 0; j < post[0]?.post?.length; j++) {
        const a = await generatePresignedUrl(
          "posts",
          post[0].post[j].content?.toString(),
          60 * 60
        );

        ur.push({ content: a, type: post[0].post[j]?.type });
      }

      urls.push(ur);

      const a = await generatePresignedUrl(
        "images",
        community.dp.toString(),
        60 * 60
      );
      dps.push(a);
    }

    const dpData = dps;
    const memdpData = memdps;
    const urlData = urls;
    const postData = posts;
    const communityData = communities;
    const likeData = liked;

    const mergedData = communityData.map((c, i) => ({
      dps: dpData[i],
      memdps: memdpData[i],
      urls: urlData[i],
      liked: likeData[i],
      community: c,
      posts: postData[i],
    }));

    //arrange acc ot latest post first
    mergedData.sort((a, b) => {
      const timeA = a?.posts[0]?.createdAt || 0;
      const timeB = b?.posts[0]?.createdAt || 0;

      return timeB - timeA;
    });

    res.status(200).json({
      mergedData,
      success: true,
      cancreate: ownedcoms?.length >= 2 ? false : true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetch one post
exports.fetchonepost = async (req, res) => {
  const { postId } = req.params;
  const post = await Post.findById(postId).populate(
    "sender",
    "fullname profilepic"
  );

  if (!post) {
    res.status(404).json({ message: "Post not found" });
  } else {
    try {
      const dp = await generatePresignedUrl(
        "images",
        post.sender.profilepic.toString(),
        60 * 60
      );
      const url = await generatePresignedUrl(
        "posts",
        post.post[0].toString(),
        60 * 60
      );
      res.status(200).json({ data: { post, url, dp } });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
};

//like a post
exports.likepost = async (req, res) => {
  const { userId, postId } = req.params;
  const user = await User.findById(userId);
  const post = await Post.findById(postId).populate("sender", "fullname");
  if (!post) {
    res.status(400).json({ message: "No post found" });
  } else if (post.likedby.includes(user._id)) {
    try {
      await Post.updateOne(
        { _id: postId },
        { $pull: { likedby: user._id }, $inc: { likes: -1 } }
      );
      await User.updateOne(
        { _id: userId },
        { $pull: { likedposts: post._id } }
      );
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  } else {
    try {
      await Post.updateOne(
        { _id: postId },
        { $push: { likedby: user._id }, $inc: { likes: 1 } }
      );
      await User.updateOne(
        { _id: userId },
        { $push: { likedposts: post._id } }
      );

      if (user._id.toString() !== post.sender._id.toString()) {
        const not = new Notification({
          senderId: user._id,
          recId: post.sender,
          text: user.fullname + " liked your post",
        });
        await not.save();
        await User.updateOne(
          { _id: not.recId },
          { $push: { notifications: not._id }, $inc: { notificationscount: 1 } }
        );
        console.log("noti");
      } else if (user._id.toString() === post.sender._id.toString()) {
        null;
        console.log("no noti");
      }
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
};

//dislike a post / not interested
exports.dislikepost = async (req, res) => {
  const { userId, postId } = req.params;
  const user = await User.findById(userId);
  const post = await Post.findById(postId);
  if (!post) {
    res.status(400).json({ message: "No post found" });
  }
  try {
    await Post.updateOne(
      { _id: postId },
      { $pull: { dislikedby: user._id }, $inc: { dsilike: 1 } }
    );
    await User.updateOne({ _id: userId }, { $pull: { likedposts: post._id } });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

//delete a post
exports.deletepost = async (req, res) => {
  const { userId, postId } = req.params;
  try {
    const post = await Post.findById(postId).populate("community", "category");
    if (!post) {
      res.status(404).json({ message: "Post not found" });
    } else if (post.sender.toString() !== userId) {
      res.status(400).json({ message: "You can't delete others post" });
    } else {
      await Community.updateOne(
        { _id: post.community },
        { $inc: { totalposts: -1 }, $pull: { posts: post?._id } }
      );
      const int = await Interest.findOne({ title: post.community.category });

      for (let i = 0; i < post.tags?.length; i++) {
        const t = await Tag.findOne({ title: post.tags[i].toLowerCase() });

        if (t) {
          await Tag.updateOne(
            { _id: t._id },
            { $inc: { count: -1 }, $pull: { post: post._id } }
          );
          if (int) {
            await Interest.updateOne(
              { _id: int._id },
              { $inc: { count: -1 }, $pull: { post: post._id, tags: t._id } }
            );
          }
        }
      }
      const topic = await Topic.findOne({
        community: post.community,
        nature: "post",
        title: "Posts",
      });
      console.log(topic, "topic");
      if (topic) {
        await Topic.updateOne(
          { _id: topic._id },
          { $pull: { posts: post._id }, $inc: { postcount: -1 } }
        );
      }
      for (let j = 0; j < post.post.length; j++) {
        const result = await s3.send(
          new DeleteObjectCommand({
            Bucket: POST_BUCKET,
            Key: post.post[j].content,
          })
        );
      }

      await Post.findByIdAndDelete(postId);

      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(404).json({ message: "Something went wrong", success: false });
  }
};

//get all posts
exports.getallposts = async (req, res) => {
  const { comId, userId, postId } = req.params;
  try {
    const user = await User.findById(userId);
    const coms = await Community.findById(comId);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else if (!coms) {
      res.status(404).json({ message: "Community not found", success: false });
    } else if (!coms.members.includes(user._id)) {
      const posts = await Post.find({ community: coms._id }).populate(
        "sender",
        "fullname profilepic username isverified"
      );

      let index = -1;

      for (let i = 0; i < posts.length; i++) {
        if (posts[i]._id.toString() === postId) {
          index = i;
          break;
        }
      }

      const comments = [];
      for (let i = 0; i < posts.length; i++) {
        const comment = await Comment.find({ postId: posts[i]._id.toString() })
          .limit(1)
          .sort({ createdAt: -1 });

        if (comment.length > 0) {
          comments.push(comment);
        } else {
          comments.push("no comment");
        }
      }
      const liked = [];
      const content = [];
      const dps = [];
      const tc = [];
      for (let i = 0; i < posts.length; i++) {
        const totalcomments = await Comment.find({ postId: posts[i]._id });
        tc.push(totalcomments.length);
      }
      for (let i = 0; i < posts.length; i++) {
        if (
          posts[i].likedby?.some((id) => id.toString() === user._id.toString())
        ) {
          liked.push(true);
        } else {
          liked.push(false);
        }
      }
      for (let i = 0; i < posts.length; i++) {
        const a = await generatePresignedUrl(
          "posts",
          posts[i].post.toString(),
          60 * 60
        );
        content.push(a);
      }
      for (let i = 0; i < posts.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          posts[i].sender.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
      }
      res.status(203).json({
        liked,
        posts,
        dps,
        content,
        comments,
        tc,
        message: "You must join the community first!",
        success: true,
        index,
      });
    } else {
      const posts = await Post.find({ community: coms._id }).populate(
        "sender",
        "fullname profilepic username isverified"
      );
      let index = -1;

      for (let i = 0; i < posts.length; i++) {
        if (posts[i]._id.toString() === postId) {
          index = i;
          break;
        }
      }
      const comments = [];
      for (let i = 0; i < posts.length; i++) {
        const comment = await Comment.find({ postId: posts[i]._id.toString() })
          .limit(1)
          .sort({ createdAt: -1 });

        if (comment.length > 0) {
          comments.push(comment);
        } else {
          comments.push("no comment");
        }
      }
      const liked = [];
      const content = [];
      const dps = [];
      const tc = [];
      for (let i = 0; i < posts.length; i++) {
        const totalcomments = await Comment.find({ postId: posts[i]._id });
        tc.push(totalcomments.length);
      }
      for (let i = 0; i < posts.length; i++) {
        if (
          posts[i].likedby?.some((id) => id.toString() === user._id.toString())
        ) {
          liked.push(true);
        } else {
          liked.push(false);
        }
      }
      for (let i = 0; i < posts.length; i++) {
        const a = await generatePresignedUrl(
          "posts",
          posts[i].post.toString(),
          60 * 60
        );
        content.push(a);
      }
      for (let i = 0; i < posts.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          posts[i].sender.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
      }

      res.status(200).json({
        liked,
        posts,
        dps,
        content,
        comments,
        tc,
        success: true,
        index,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.test = async (req, res) => {
  const video = req.file;
  const outputFileName = "compressed_video.mp4";
  console.log(video);
  ffmpeg(req.file.buffer)
    .size("640x320")
    .aspect("4:3")
    .on("error", function (err) {
      console.log("An error occurred: " + err.message);
    })
    .on("end", function () {
      console.log("Processing finished !");
    });
};

exports.updatesettings = async (req, res) => {
  const { id } = req.params;
  const { about, name, username } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      await User.updateOne({ _id: id }, { $set: { desc: about } });
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//post anything
exports.postanything = async (req, res) => {
  const { userId, comId } = req.params;
  try {
    const { title, desc, tags } = req.body;
    const tag = tags.split(",");
    const user = await User.findById(userId);
    const community = await Community.findById(comId);
    const topic = await Topic.find({ community: community._id }).find({
      title: "Posts",
    });

    if (user && community && topic && req.files.length > 0) {
      let pos = [];

      for (let i = 0; i < req?.files?.length; i++) {
        const uuidString = uuid();
        const bucketName = "posts";
        const objectName = `${Date.now()}_${uuidString}_${
          req.files[i].originalname
        }`;

        if (req.files[i].fieldname === "video") {
          await minioClient.putObject(
            bucketName,
            objectName,
            req.files[i].buffer
            // req.files[i].size,
            // req.files[i].mimetype
          );

          pos.push({ content: objectName, type: req.files[i].mimetype });
        } else {
          await sharp(req.files[i].buffer)
            .jpeg({ quality: 50 })
            .toBuffer()
            .then(async (data) => {
              await minioClient.putObject(bucketName, objectName, data);
            })
            .catch((err) => {
              console.log(err.message, "-error");
            });

          pos.push({ content: objectName, type: req.files[i].mimetype });
        }
      }
      const post = new Post({
        title,
        desc,
        community: comId,
        sender: userId,
        post: pos,
        tags: tag,
      });
      const savedpost = await post.save();
      await Community.updateOne(
        { _id: comId },
        { $push: { posts: savedpost._id }, $inc: { totalposts: 1 } }
      );
      await Topic.updateOne(
        { _id: topic[0]._id },
        { $push: { posts: savedpost._id }, $inc: { postcount: 1 } }
      );
      res.status(200).json({ savedpost, success: true });
    } else {
      res.status(404).json({
        message: "User or Community not found or no files where there!",
        success: false,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//fetch feed new according to user interest
exports.newfetchfeed = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    const dps = [];
    let current = [];
    const memdps = [];
    const subs = [];
    const liked = [];
    const ads = [];
    const urls = [];
    const content = [];
    const addp = [];

    //checking and removing posts with no communities
    const p = await Post.find();

    for (let i = 0; i < p.length; i++) {
      const com = await Community.findById(p[i].community);
      if (!com) {
        p[i].remove();
      }
    }
    //fetching post
    const post = await Post.aggregate([
      //{ $match: { tags: { $in: user.interest } } },
      { $sample: { size: 100 } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "community",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "community.members",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $addFields: {
          sender: { $arrayElemAt: ["$sender", 0] },
          community: { $arrayElemAt: ["$community", 0] },
        },
      },
      {
        $addFields: {
          "community.members": {
            $map: {
              input: { $slice: ["$members", 0, 4] },
              as: "member",
              in: {
                _id: "$$member._id",
                fullname: "$$member.fullname",
                profilepic: "$$member.profilepic",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          status: 1,
          likedby: 1,
          likes: 1,
          dislike: 1,
          comments: 1,
          totalcomments: 1,
          tags: 1,
          view: 1,
          desc: 1,
          isverified: 1,
          post: 1,
          contenttype: 1,
          date: 1,
          sharescount: 1,
          sender: {
            _id: 1,
            fullname: 1,
            profilepic: 1,
          },
          community: {
            _id: 1,
            title: 1,
            dp: 1,
            members: 1,
            memberscount: 1,
            isverified: 1,
          },
        },
      },
    ]);

    for (let i = 0; i < post.length; i++) {
      if (
        post[i].likedby?.some((id) => id.toString() === user._id.toString())
      ) {
        liked.push(true);
      } else {
        liked.push(false);
      }
    }

    for (let k = 0; k < post.length; k++) {
      const coms = await Community.findById(post[k].community);

      if (coms?.members?.includes(user._id)) {
        subs.push("subscribed");
      } else {
        subs.push("unsubscribed");
      }
    }

    if (!post) {
      res.status(201).json({ message: "No post found", success: false });
    } else {
      //fetching ad
      const birthdateString = user.DOB;
      const [birthDay, birthMonth, birthYear] = birthdateString
        .split("/")
        .map(Number);

      // Get the current date
      const currentDate = new Date();

      // Get the current day, month, and year
      const currentDay = currentDate.getDate();
      const currentMonth = currentDate.getMonth() + 1; // Month is zero-based
      const currentYear = currentDate.getFullYear();

      // Calculate the age
      let age = currentYear - birthYear;
      if (
        currentMonth < birthMonth ||
        (currentMonth === birthMonth && currentDay < birthDay)
      ) {
        age--;
      }

      //ads
      const ad = await Ads.aggregate([
        {
          $match: {
            tags: { $in: user.interest },
            // location: { $eq: user.location },
            status: { $eq: "Active" },
          },
        },
        {
          $lookup: {
            from: "users", // Assuming the collection name for users is "users"
            localField: "creator", // Assuming the field storing the creator ObjectId is "creator"
            foreignField: "_id",
            as: "creator",
          },
        },
        {
          $addFields: {
            creatorName: { $arrayElemAt: ["$creator.fullname", 0] },
            creatorProfilePic: { $arrayElemAt: ["$creator.profilepic", 0] },
            isverified: { $arrayElemAt: ["$creator.isverified", 0] },
          },
        },
        {
          $project: {
            creator: 0, // Exclude the creator field if needed
          },
        },
        { $sample: { size: 1 } },
      ]);

      for (let i = 0; i < ad.length; i++) {
        if (ad[i].ageup > age && ad[i].agedown < age) {
          ads.push(ad[i]);
        }
      }

      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "ads",
          ads[i].content.toString(),
          60 * 60
        );
        content.push(dp);
      }

      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "images",
          ads[i].creatorProfilePic.toString(),
          60 * 60
        );
        addp.push(dp);
      }

      //ad data
      const admerge = ads.map((a, i) => ({
        ad: a,
        content: content[i],
        dp: addp[i],
      }));

      //post
      for (let i = 0; i < post.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          post[i].community.dp.toString(),
          60 * 60
        );
        dps.push(a);
      }

      // let ur = [];
      // for (let i = 0; i < post?.length; i++) {
      //   for (let j = 0; j < post[i]?.post?.length; j++) {
      //     const a = process.env.URL + post[i].post[j]?.content;
      //     ur.push({ content: a, type: post[i].post[j]?.type });
      //   }
      //   urls.push(ur);
      //   ur = [];
    }
    let ur = [];
    for (let i = 0; i < post?.length; i++) {
      for (let j = 0; j < post[i]?.post?.length; j++) {
        const a = await generatePresignedUrl(
          "posts",
          post[i].post[j].content?.toString(),
          60 * 60
        );
        ur.push({ content: a, type: post[i].post[j]?.type });
      }
      urls.push(ur);
      ur = [];

      for (let i = 0; i < post.length; i++) {
        for (
          let j = 0;
          j < Math.min(4, post[i].community.members.length);
          j++
        ) {
          const a = await generatePresignedUrl(
            "images",
            post[i]?.community?.members[j]?.profilepic.toString(),
            60 * 60
          );
          current.push(a);
        }

        memdps.push(current);
        current = [];
      }

      //post data
      const dpData = dps;
      const memdpData = memdps;
      const urlData = urls;
      const postData = post;
      const subData = subs;
      const likeData = liked;

      const postsData = urlData.map((u, i) => ({
        dps: dpData[i],
        memdps: memdpData[i],
        urls: u,
        liked: likeData[i],
        subs: subData[i],
        posts: postData[i],
      }));

      //merging ad and post
      let mergedData = [];

      if (admerge.length > 0) {
        const firstAdItem = admerge.shift();
        mergedData.push(firstAdItem);
      }

      postsData.forEach((postItem, i) => {
        mergedData.push(postItem);

        if ((i + 1) % 10 === 0 && admerge.length > 0) {
          const adItem = admerge.shift();
          mergedData.push(adItem);
        }
      });
      console.log(mergedData?.length);
      res.status(200).json({
        mergedData,

        success: true,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err, success: false });
  }
};

//delete null posts
exports.delenu = async (req, res) => {
  try {
    const post = await Post.find();

    for (let i = 0; i < post.length; i++) {
      const com = await Community.findById(post[i].community);
      if (!com) {
        post[i].remove();
      }
    }
    res.status(200).send({ success: true });
  } catch (err) {
    console.log(ee);
  }
};

//create a poll for community post section
exports.createpollcom = async (req, res) => {
  try {
    const { id, comId, topicId } = req.params;
    const { options, title, tag, desc } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      let pos = [];
      if (req.files?.length > 0) {
        for (let i = 0; i < req?.files?.length; i++) {
          const uuidString = uuid();
          const bucketName = "posts";
          const objectName = `${Date.now()}_${uuidString}_${
            req.files[i].originalname
          }`;

          if (req.files[i].fieldname === "video") {
            await minioClient.putObject(
              bucketName,
              objectName,
              req.files[i].buffer
              // req.files[i].size,
              // req.files[i].mimetype
            );

            pos.push({ content: objectName, type: req.files[i].mimetype });
          } else {
            await sharp(req.files[i].buffer)
              .jpeg({ quality: 50 })
              .toBuffer()
              .then(async (data) => {
                await minioClient.putObject(bucketName, objectName, data);
              })
              .catch((err) => {
                console.log(err.message, "-error");
              });

            pos.push({ content: objectName, type: req.files[i].mimetype });
          }
        }
      }
      const poll = new Post({
        title,
        desc,
        options: options,
        community: comId,
        sender: user._id,
        post: pos,
        tags: tag,
        kind: "poll",
        type: "Poll",
        topicId,
      });

      const savedpost = await poll.save();
      await Community.updateOne(
        { _id: comId },
        { $push: { posts: savedpost._id }, $inc: { totalposts: 1 } }
      );

      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

exports.datadownload2 = async (req, res) => {
  try {
    const posts = await User.find();

    for (let i = 12; i < posts?.length; i++) {
      const presignedUrl = await generatePresignedUrl(
        "images",
        posts[i].profilepic.toString(),
        60 * 60
      );

      const response = await axios.get(presignedUrl, {
        responseType: "arraybuffer",
      });
      console.log(i, "count");
      const localFilePath = `./${posts[i].profilepic.toString()}`;

      fs.writeFile(localFilePath, response.data, "binary", (err) => {
        if (err) {
          console.error(`Error writing file: ${err.message}`);
          // Handle the error accordingly, e.g., log or send a response to the client
          console.log(err.message);
        }
        console.log(`File downloaded successfully to ${localFilePath}`);
        // Handle success, e.g., log or send a response to the client
      });
    }

    res
      .status(200)
      .json({ message: "Files downloaded successfully", success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//s3 bucket

//post anything with thumbnail and video
exports.postanythings3 = async (req, res) => {
  const { userId, comId, topicId } = req.params;
  try {
    const { title, desc, tags, category, type } = req.body;
    const tag = tags.split(",");

    const user = await User.findById(userId);
    const community = await Community.findById(comId);
    const topic = await Topic.findById(topicId);

    if (user && community && topic && req.files.length > 0) {
      let pos = [];
      if (type === "video") {
        let thumbail = "";
        let video = "";
        for (let i = 0; i < req?.files?.length; i++) {
          const uuidString = uuid();
          const bucketName = "posts";
          const objectName = `${Date.now()}_${uuidString}_${
            req.files[i].originalname
          }`;

          const result = await s3.send(
            new PutObjectCommand({
              Bucket: POST_BUCKET,
              Key: objectName,
              Body: req.files[i].buffer,
              ContentType: req.files[i].mimetype,
            })
          );

          if (req.files[i].fieldname === "thumbnail") {
            thumbail = objectName;
          } else {
            video = objectName;
          }
        }
        pos.push({
          content: video,
          thumbnail: thumbail,
          type: "video/mp4",
        });
      } else {
        for (let i = 0; i < req?.files?.length; i++) {
          const uuidString = uuid();
          const bucketName = "posts";
          const objectName = `${Date.now()}_${uuidString}_${
            req.files[i].originalname
          }`;

          // await minioClient.putObject(
          //   bucketName,
          //   objectName,
          //   req.files[i].buffer
          //   // req.files[i].size,
          //   // req.files[i].mimetype
          // );
          const result = await s3.send(
            new PutObjectCommand({
              Bucket: POST_BUCKET,
              Key: objectName,
              Body: req.files[i].buffer,
              ContentType: req.files[i].mimetype,
            })
          );
          //  const result = await uploader(req.files[i].buffer);

          pos.push({ content: objectName, type: req.files[i].mimetype });
        }
      }
      const post = new Post({
        title,
        desc,
        community: comId,
        sender: userId,
        post: pos,
        tags: tag,
        topicId: topicId,
      });
      const savedpost = await post.save();

      //sending video to a queue for compression
      if (type === "video") {
        for (let i = 0; i < req.files.length; i++) {
          if (req.files[i].fieldname !== "thumbnail") {
            // const readableStream = new stream.PassThrough();
            // readableStream.end(req.files[i].buffer);
            // console.log(req.files[i].buffer, readableStream);
            // compressVideo(readableStream);
            const r = await compressqueue.add(
              "compress-pending",
              { data: savedpost },
              { removeOnComplete: true, removeOnFail: true }
            );
            console.log(r.id, "Added to compression queue...");
          }
        }
      }

      //updating tags and interests
      const int = await Interest.findOne({ title: category });

      for (let i = 0; i < tag?.length; i++) {
        const t = await Tag.findOne({ title: tag[i].toLowerCase() });

        if (t) {
          await Tag.updateOne(
            { _id: t._id },
            { $inc: { count: 1 }, $addToSet: { post: post._id } }
          );
          if (int) {
            await Interest.updateOne(
              { _id: int._id },
              { $inc: { count: 1 }, $addToSet: { post: post._id, tags: t._id } }
            );
          }
        } else {
          const newtag = new Tag({
            title: tag[i].toLowerCase(),
            post: post._id,
            count: 1,
          });
          await newtag.save();
          if (int) {
            await Interest.updateOne(
              { _id: int._id },
              {
                $inc: { count: 1 },
                $addToSet: { post: post._id, tags: newtag._id },
              }
            );
          }
        }
      }

      await Community.updateOne(
        { _id: comId },
        { $push: { posts: savedpost._id }, $inc: { totalposts: 1 } }
      );
      await Topic.updateOne(
        { _id: topic._id },
        { $push: { posts: savedpost._id }, $inc: { postcount: 1 } }
      );

      let tokens = [];

      for (let u of community.members) {
        const user = await User.findById(u);

        if (user.notificationtoken && user._id.toString() !== userId) {
          if (user.notificationtoken) {
            tokens.push(user.notificationtoken);
          }
        }
      }

      if (tokens?.length > 0) {
        let link = process.env.POST_URL + post.post[0].content;
        const timestamp = `${new Date()}`;
        const msg = {
          notification: {
            title: `${community.title} - Posted!`,
            body: `${post.title}`,
          },
          data: {
            screen: "CommunityChat",
            sender_fullname: `${user?.fullname}`,
            sender_id: `${user?._id}`,
            text: `${post.title}`,
            comId: `${community?._id}`,
            createdAt: `${timestamp}`,
            type: "post",
            link,
          },
          tokens: tokens,
        };

        await admin
          .messaging()
          .sendMulticast(msg)
          .then((response) => {
            console.log("Successfully sent message");
          })
          .catch((error) => {
            console.log("Error sending message:", error);
          });
      }

      res.status(200).json({ savedpost, success: true });
    } else {
      res.status(404).json({
        message:
          "User or Community or Topic not found or no files where there!",
        success: false,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//new for you
exports.newfetchfeeds3 = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    const dps = [];
    let current = [];
    const memdps = [];
    const subs = [];
    const liked = [];
    const ads = [];
    const urls = [];
    const content = [];
    const addp = [];

    //checking and removing posts with no communities
    // const p = await Post.find();

    // for (let i = 0; i < p.length; i++) {
    //   const com = await Community.findById(p[i].community);
    //   if (!com) {
    //     p[i].remove();
    //   }
    // }

    //fetching post
    const post = await Post.aggregate([
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "communityInfo",
        },
      },
      {
        $match: {
          "communityInfo.category": { $in: user.interest },
        },
      },
      { $sample: { size: 10 } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "community",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "community.members",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "community.type",
          foreignField: "_id",
          as: "type",
        },
      },
      {
        $addFields: {
          sender: { $arrayElemAt: ["$sender", 0] },
          community: { $arrayElemAt: ["$community", 0] },
        },
      },
      {
        $addFields: {
          "community.members": {
            $map: {
              input: { $slice: ["$members", 0, 4] },
              as: "member",
              in: {
                _id: "$$member._id",
                fullname: "$$member.fullname",
                profilepic: "$$member.profilepic",
              },
            },
          },
        },
      },
      {
        $match: {
          "community.type": { $eq: "public" }, // Excluding posts with community type other than "public"
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          status: 1,
          likedby: 1,
          likes: 1,
          dislike: 1,
          comments: 1,
          totalcomments: 1,
          tags: 1,
          view: 1,
          desc: 1,
          isverified: 1,
          post: 1,
          contenttype: 1,
          date: 1,
          sharescount: 1,
          sender: {
            _id: 1,
            fullname: 1,
            profilepic: 1,
          },
          community: {
            _id: 1,
            title: 1,
            dp: 1,
            members: 1,
            memberscount: 1,
            isverified: 1,
            type: 1,
          },
          topicId: 1,
        },
      },
    ]);

    //fetching ads
    const firstad = await Ads.findOne({
      status: "active",
      $or: [{ type: "banner" }],
    })
      .populate({
        path: "postid",
        select:
          "desc post title kind likes likedby comments members community cta ctalink sender totalcomments adtype date createdAt",
        populate: [
          {
            path: "community",
            select: "dp title isverified memberscount members",
            populate: { path: "members", select: "profilepic" },
          },
          { path: "sender", select: "profilepic fullname" },
        ],
      })
      .limit(1);

    const infeedad = await Ads.find({
      status: "active",
      $or: [{ type: "infeed" }],
    }).populate({
      path: "postid",
      select:
        "desc post title kind likes comments community cta ctalink likedby sender totalcomments adtype date createdAt",
      populate: [
        {
          path: "community",
          select: "dp title isverified memberscount members",
          populate: { path: "members", select: "profilepic" },
        },
        { path: "sender", select: "profilepic fullname" },
      ],
    });

    function getRandomIndex() {
      const min = 6;
      return min + Math.floor(Math.random() * (post.length - min));
    }

    let feedad = [];
    for (let i = 0; i < infeedad.length; i++) {
      feedad.push(infeedad[i].postid);
    }

    //merging ads
    if (firstad) {
      post.unshift(firstad.postid);
    }

    if (
      feedad?.length > 0 &&
      (!feedad.includes(null) || !feedad.includes("null"))
    ) {
      for (let i = 0; i < feedad.length; i++) {
        const randomIndex = getRandomIndex();
        post.splice(randomIndex, 0, feedad[i]);
      }
    }

    for (let i = 0; i < post.length; i++) {
      if (
        post[i].likedby?.some((id) => id.toString() === user._id.toString())
      ) {
        liked.push(true);
      } else {
        liked.push(false);
      }
    }

    for (let k = 0; k < post.length; k++) {
      const coms = await Community.findById(post[k].community);

      if (coms?.members?.includes(user._id)) {
        subs.push("subscribed");
      } else {
        subs.push("unsubscribed");
      }
    }

    if (!post) {
      res.status(201).json({ message: "No post found", success: false });
    } else {
      //post
      for (let i = 0; i < post.length; i++) {
        const a = process.env.URL + post[i].community.dp;
        dps.push(a);
      }

      let ur = [];
      for (let i = 0; i < post?.length; i++) {
        for (let j = 0; j < post[i]?.post?.length; j++) {
          if (post[i].post[j].thumbnail) {
            const a =
              post[i].post[j].link === true
                ? process.env.POST_URL + post[i].post[j].content + "640.mp4"
                : process.env.POST_URL + post[i].post[j].content;
            const t = process.env.POST_URL + post[i].post[j].thumbnail;

            ur.push({ content: a, thumbnail: t, type: post[i].post[j]?.type });
          } else {
            const a = process.env.POST_URL + post[i].post[j].content;
            ur.push({ content: a, type: post[i].post[j]?.type });
          }
        }
        urls.push(ur);
        ur = [];
      }

      for (let i = 0; i < post.length; i++) {
        for (
          let j = 0;
          j < Math.min(4, post[i].community.members.length);
          j++
        ) {
          const a =
            process.env.URL + post[i]?.community?.members[j]?.profilepic;
          current.push(a);
        }

        memdps.push(current);
        current = [];
      }

      //post data
      const dpData = dps;
      const memdpData = memdps;
      const urlData = urls;
      const postData = post;
      const subData = subs;
      const likeData = liked;

      const mergedData = urlData.map((u, i) => ({
        dps: dpData[i],
        memdps: memdpData[i],
        urls: u,
        liked: likeData[i],
        subs: subData[i],
        posts: postData[i],
      }));

      res.status(200).json({
        mergedData,
        success: true,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err, success: false });
  }
};

//community feed
exports.joinedcomnews3 = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  try {
    const communities = await Community.find({
      members: { $in: user._id },
    })
      .populate("members", "profilepic")
      .populate("creator", "fullname");

    const ownedcoms = await Community.find({ creator: user._id.toString() });

    if (!communities || communities.length === 0) {
      res.status(200).json({ message: "No communities found", success: true });
      return;
    }

    const dps = [];
    const urls = [];
    const posts = [];
    const liked = [];
    let current = [];
    const memdps = [];

    // Sort communities based on whether they have a post and the latest post first
    communities.sort((a, b) => {
      const postA = a.posts.length > 0 ? a.posts[0].createdAt : 0;
      const postB = b.posts.length > 0 ? b.posts[0].createdAt : 0;
      return postB - postA;
    });

    for (const community of communities) {
      const post = await Post.find({
        community: community._id,
        type: "Post",
      })
        .populate("sender", "fullname")
        .sort({ createdAt: -1 })
        .limit(1);
      posts.push(post);

      for (let j = 0; j < Math.min(4, community.members.length); j++) {
        const a = process.env.URL + community.members[j].profilepic;

        current.push(a);
      }

      memdps.push(current);
      current = [];

      if (post.length > 0) {
        const like = post[0]?.likedby?.includes(user._id);
        liked.push(like);
      } else {
        liked.push(false);
      }

      let ur = [];
      for (let j = 0; j < post[0]?.post?.length; j++) {
        if (post[0].post[j].thumbnail) {
          const a =
            post[0].post[j].link === true
              ? process.env.POST_URL + post[0].post[j].content + "640.mp4"
              : process.env.POST_URL + post[0].post[j].content;
          const t = process.env.POST_URL + post[0].post[j].thumbnail;

          ur.push({ content: a, thumbnail: t, type: post[0].post[j]?.type });
        } else {
          const a = process.env.POST_URL + post[0].post[j].content;

          ur.push({ content: a, type: post[0].post[j]?.type });
        }
      }

      urls.push(ur);
      const a = process.env.URL + community.dp;

      dps.push(a);
    }

    const dpData = dps;
    const memdpData = memdps;
    const urlData = urls;
    const postData = posts;
    const communityData = communities;
    const likeData = liked;

    const mergedData = communityData.map((c, i) => ({
      dps: dpData[i],
      memdps: memdpData[i],
      urls: urlData[i],
      liked: likeData[i],
      community: c,
      posts: postData[i],
    }));

    //arrange acc ot latest post first
    mergedData.sort((a, b) => {
      const timeA = a?.posts[0]?.createdAt || 0;
      const timeB = b?.posts[0]?.createdAt || 0;

      return timeB - timeA;
    });

    res.status(200).json({
      mergedData,
      success: true,
      cancreate: ownedcoms?.length >= 2 ? false : true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetching the interests
exports.fetchinterest = async (req, res) => {
  try {
    // const interest = await Interest.find({ count: 0 });
    const interest = await Interest.find({ count: { $gt: 0 } });

    let finals = [];
    let dps = [];
    for (let i = 0; i < interest.length; i++) {
      finals.push(interest[i].title);
      let a = process.env.URL + interest[i].pic + ".png";

      dps.push(a);
    }
    let merged = finals.map((f, i) => ({
      f,
      dp: dps[i],
    }));

    res.status(200).json({ success: true, interests: merged });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

//reset everyones cart
exports.reseteverycart = async (req, res) => {
  try {
    const user = await User.find();
    for (let i = 0; i < user.length; i++) {
      await User.updateOne(
        { _id: user[i]._id },
        {
          $unset: {
            puchase_history: [],
            puchase_products: [],
            cart: [],
            cart_history: [],
            cartproducts: [],
          },
        }
      );
    }
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//fetch more data
exports.fetchmoredata = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    const dps = [];
    let current = [];
    const memdps = [];
    const subs = [];
    const liked = [];
    const ads = [];
    const urls = [];
    const content = [];
    const addp = [];

    //checking and removing posts with no communities
    // const p = await Post.find();

    // for (let i = 0; i < p.length; i++) {
    //   const com = await Community.findById(p[i].community);
    //   if (!com) {
    //     p[i].remove();
    //   }
    // }

    //fetching post
    const post = await Post.aggregate([
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "communityInfo",
        },
      },
      {
        $match: {
          "communityInfo.category": { $in: user.interest },
        },
      },
      { $sample: { size: 10 } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "communities",
          localField: "community",
          foreignField: "_id",
          as: "community",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "community.members",
          foreignField: "_id",
          as: "members",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "community.type",
          foreignField: "_id",
          as: "type",
        },
      },
      {
        $addFields: {
          sender: { $arrayElemAt: ["$sender", 0] },
          community: { $arrayElemAt: ["$community", 0] },
        },
      },
      {
        $addFields: {
          "community.members": {
            $map: {
              input: { $slice: ["$members", 0, 4] },
              as: "member",
              in: {
                _id: "$$member._id",
                fullname: "$$member.fullname",
                profilepic: "$$member.profilepic",
              },
            },
          },
        },
      },
      {
        $match: {
          "community.type": { $eq: "public" }, // Excluding posts with community type other than "public"
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          status: 1,
          likedby: 1,
          likes: 1,
          dislike: 1,
          comments: 1,
          totalcomments: 1,
          tags: 1,
          view: 1,
          desc: 1,
          isverified: 1,
          post: 1,
          contenttype: 1,
          date: 1,
          sharescount: 1,
          sender: {
            _id: 1,
            fullname: 1,
            profilepic: 1,
          },
          community: {
            _id: 1,
            title: 1,
            dp: 1,
            members: 1,
            memberscount: 1,
            isverified: 1,
            type: 1,
          },
          topicId: 1,
        },
      },
    ]);

    //fetching ads
    const firstad = await Ads.findOne({
      status: "active",
      $or: [{ type: "banner" }],
    })
      .populate({
        path: "postid",
        select:
          "desc post title kind likes likedby comments members community cta ctalink sender totalcomments adtype date createdAt",
        populate: [
          {
            path: "community",
            select: "dp title isverified memberscount members",
            populate: { path: "members", select: "profilepic" },
          },
          { path: "sender", select: "profilepic fullname" },
        ],
      })
      .limit(1);

    const infeedad = await Ads.find({
      status: "active",
      $or: [{ type: "infeed" }],
    }).populate({
      path: "postid",
      select:
        "desc post title kind likes comments community cta ctalink likedby sender totalcomments adtype date createdAt",
      populate: [
        {
          path: "community",
          select: "dp title isverified memberscount members",
          populate: { path: "members", select: "profilepic" },
        },
        { path: "sender", select: "profilepic fullname" },
      ],
    });

    function getRandomIndex() {
      const min = 6;
      return min + Math.floor(Math.random() * (post.length - min));
    }

    let feedad = [];
    for (let i = 0; i < infeedad.length; i++) {
      feedad.push(infeedad[i].postid);
    }

    //merging ads
    if (firstad) {
      post.unshift(firstad.postid);
    }

    if (
      feedad?.length > 0 &&
      (!feedad.includes(null) || !feedad.includes("null"))
    ) {
      for (let i = 0; i < feedad.length; i++) {
        const randomIndex = getRandomIndex();
        post.splice(randomIndex, 0, feedad[i]);
      }
    }

    for (let i = 0; i < post.length; i++) {
      if (
        post[i].likedby?.some((id) => id.toString() === user._id.toString())
      ) {
        liked.push(true);
      } else {
        liked.push(false);
      }
    }

    for (let k = 0; k < post.length; k++) {
      const coms = await Community.findById(post[k].community);

      if (coms?.members?.includes(user._id)) {
        subs.push("subscribed");
      } else {
        subs.push("unsubscribed");
      }
    }

    if (!post) {
      res.status(201).json({ message: "No post found", success: false });
    } else {
      //post
      for (let i = 0; i < post.length; i++) {
        const a = process.env.URL + post[i].community.dp;
        dps.push(a);
      }

      let ur = [];
      for (let i = 0; i < post?.length; i++) {
        for (let j = 0; j < post[i]?.post?.length; j++) {
          if (post[i].post[j].thumbnail) {
            const a =
              post[i].post[j].link === true
                ? process.env.POST_URL + post[i].post[j].content + "640.mp4"
                : process.env.POST_URL + post[i].post[j].content;
            const t = process.env.POST_URL + post[i].post[j].thumbnail;

            ur.push({ content: a, thumbnail: t, type: post[i].post[j]?.type });
          } else {
            const a = process.env.POST_URL + post[i].post[j].content;
            ur.push({ content: a, type: post[i].post[j]?.type });
          }
        }
        urls.push(ur);
        ur = [];
      }

      for (let i = 0; i < post.length; i++) {
        for (
          let j = 0;
          j < Math.min(4, post[i].community.members.length);
          j++
        ) {
          const a =
            process.env.URL + post[i]?.community?.members[j]?.profilepic;
          current.push(a);
        }

        memdps.push(current);
        current = [];
      }

      //post data
      const dpData = dps;
      const memdpData = memdps;
      const urlData = urls;
      const postData = post;
      const subData = subs;
      const likeData = liked;

      const mergedData = urlData.map((u, i) => ({
        dps: dpData[i],
        memdps: memdpData[i],
        urls: u,
        liked: likeData[i],
        subs: subData[i],
        posts: postData[i],
      }));

      res.status(200).json({
        mergedData,
        success: true,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err, success: false });
  }
};

async function compressVideo(filePath) {
  try {
    new ffmpeg({ source: filePath })
      .withSize("640x?")
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
      })
      .on("end", function () {
        console.log("Processing finished!");
      })
      .saveToFile("output.mp4");
  } catch (e) {
    console.log(e.code);
    console.log(e.msg);
  }
}

// compressVideo("f.mp4");
