const Community = require("../models/community");
const User = require("../models/userAuth");
const uuid = require("uuid").v4;
const Minio = require("minio");
const Topic = require("../models/topic");
const sharp = require("sharp");
const Post = require("../models/post");
const Comment = require("../models/comment");
const Message = require("../models/message");
const Ads = require("../models/Ads");
const Conversation = require("../models/conversation");
const Report = require("../models/reports");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Analytics = require("../models/Analytics");
const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");
const fs = require("fs");
require("dotenv").config();
const Subscriptions = require("../models/Subscriptions");

const BUCKET_NAME = process.env.BUCKET_NAME;

const s3 = new S3Client({
  region: process.env.BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

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

//creating a community
exports.createa = async (req, res) => {
  const { title, desc, topic, type, price, category, nature } = req.body;
  const { userId } = req.params;
  const image = req.file;
  const uuidString = uuid();

  if (!image) {
    res.status(400).json({ message: "Please upload an image", success: false });
  } else if (topic) {
    try {
      const user = await User.findById(userId);
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;
      a = objectName;
      await minioClient.putObject(
        bucketName,
        objectName,
        image.buffer,
        image.buffer.length
      );
      const community = new Community({
        title,
        creator: userId,
        dp: objectName,
        desc: desc,
        category: category,
      });
      const savedcom = await community.save();
      const topic1 = new Topic({
        title: "Posts",
        creator: userId,
        community: savedcom._id,
      });
      await topic1.save();

      const topic2 = new Topic({
        title: "All",
        creator: userId,
        community: savedcom._id,
      });
      await topic2.save();

      const topic3 = new Topic({
        title: topic,
        creator: userId,
        community: savedcom._id,
        type: type,
        price: price,
      });
      await topic3.save();

      await Community.updateOne(
        { _id: savedcom._id },
        {
          $push: { members: userId, admins: user._id },
          $inc: { memberscount: 1 },
        }
      );

      await Community.updateMany(
        { _id: savedcom._id },
        {
          $push: { topics: [topic1._id, topic2._id, topic3._id] },
          $inc: { totaltopics: 1 },
        }
      );
      await User.updateOne(
        { _id: user._id },
        {
          $push: { communitycreated: community._id },
        }
      );

      await Topic.updateOne(
        { _id: topic1._id },
        { $push: { members: user._id }, $inc: { memberscount: 1 } }
      );
      await Topic.updateOne(
        { _id: topic2._id },
        { $push: { members: user._id }, $inc: { memberscount: 1 } }
      );
      await Topic.updateOne(
        { _id: topic3._id },
        { $push: { members: user._id }, $inc: { memberscount: 1 } }
      );
      await Topic.updateOne(
        { _id: topic1._id },
        { $push: { notifications: user._id } }
      );
      await Topic.updateOne(
        { _id: topic2._id },
        { $push: { notifications: user._id } }
      );
      await Topic.updateOne(
        { _id: topic3._id },
        { $push: { notifications: user._id } }
      );

      await User.updateMany(
        { _id: userId },
        {
          $push: {
            topicsjoined: [topic1._id, topic2._id, topic3._id],
            communityjoined: savedcom._id,
          },
          $inc: { totaltopics: 3, totalcom: 1 },
        }
      );
      res.status(200).json({ community: savedcom, success: true });
    } catch (e) {
      res.status(400).json({ message: e.message, success: false });
    }
  } else {
    try {
      const user = await User.findById(userId);
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;
      a = objectName;
      await minioClient.putObject(
        bucketName,
        objectName,
        image.buffer,
        image.buffer.length
      );
      const community = new Community({
        title,
        creator: userId,
        dp: objectName,
        desc: desc,
        category: category,
      });
      const savedcom = await community.save();
      const topic1 = new Topic({
        title: "Posts",
        creator: userId,
        community: savedcom._id,
      });
      await topic1.save();
      const topic2 = new Topic({
        title: "All",
        creator: userId,
        community: savedcom._id,
      });
      await topic2.save();

      await Community.updateOne(
        { _id: savedcom._id },
        {
          $push: { members: userId, admins: user._id },
          $inc: { memberscount: 1 },
        }
      );
      await Community.updateMany(
        { _id: savedcom._id },
        { $push: { topics: [topic1._id, topic2._id] } }
      );

      await Topic.updateOne(
        { _id: topic1._id },
        { $push: { members: user._id }, $inc: { memberscount: 1 } }
      );
      await Topic.updateOne(
        { _id: topic2._id },
        { $push: { members: user._id }, $inc: { memberscount: 1 } }
      );
      await Topic.updateOne(
        { _id: topic1._id },
        { $push: { notifications: user._id } }
      );
      await Topic.updateOne(
        { _id: topic2._id },
        { $push: { notifications: user._id } }
      );

      await User.updateMany(
        { _id: userId },
        {
          $push: {
            topicsjoined: [topic1._id, topic2._id],
            communityjoined: savedcom._id,
          },
          $inc: { totaltopics: 2, totalcom: 1 },
        }
      );
      res.status(200).json({ community: savedcom, success: true });
    } catch (e) {
      res.status(400).json({ message: e.message, success: false });
    }
  }
};

//community join
exports.joinmember = async (req, res) => {
  const { userId, comId } = req.params;
  const user = await User.findById(userId);
  const community = await Community.findById(comId);
  if (!community) {
    res.status(400).json({ message: "Community not found" });
  } else {
    let publictopic = [];
    for (let i = 0; i < community.topics.length; i++) {
      const topic = await Topic.findById({ _id: community.topics[i] });

      if (topic.type === "free") {
        publictopic.push(topic);
      }
    }

    try {
      const isOwner = community.creator.equals(user._id);
      const isSubscriber = community.members.includes(user._id);
      if (isOwner) {
        res.status(201).json({
          message: "You already have joined your own community!",
          success: false,
        });
      } else if (isSubscriber) {
        res
          .status(201)
          .json({ message: "Already Subscriber", success: false, publictopic });
      } else if (community.type === "public") {
        //members count increase
        let today = new Date();

        let year = today.getFullYear();
        let month = String(today.getMonth() + 1).padStart(2, "0");
        let day = String(today.getDate()).padStart(2, "0");

        let formattedDate = `${day}/${month}/${year}`;

        const birthdateString = user.DOB;
        const birthdate = new Date(
          birthdateString.split("/").reverse().join("/")
        );

        const currentDate = new Date(); // Current date

        // Calculate age
        let age = currentDate.getFullYear() - birthdate.getFullYear();

        // Adjust age based on the birthdate and current date
        if (
          currentDate.getMonth() < birthdate.getMonth() ||
          (currentDate.getMonth() === birthdate.getMonth() &&
            currentDate.getDate() < birthdate.getDate())
        ) {
          age--;
        }

        // Update age range & Update gender
        if (user.gender === "Male") {
          if (age >= 18 && age <= 24) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.male": 1,
                  "demographics.age.18-24": 1,
                },
              },
              {
                new: true,
              }
            );
          } else if (age >= 25 && age <= 34) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.male": 1,
                  "demographics.age.25-34": 1,
                },
              },
              {
                new: true,
              }
            );
          } else if (age >= 35 && age <= 44) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.male": 1,
                  "demographics.age.35-44": 1,
                },
              },
              {
                new: true,
              }
            );
          } else if (age >= 45 && age <= 64) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.male": 1,
                  "demographics.age.45-64": 1,
                },
              },
              {
                new: true,
              }
            );
          } else if (age >= 65) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.male": 1,
                  "demographics.age.65+": 1,
                },
              },
              {
                new: true,
              }
            );
          }
        } else if (user.gender === "Female") {
          if (age >= 18 && age <= 24) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.female": 1,
                  "demographics.age.18-24": 1,
                },
              },
              {
                new: true,
              }
            );
          } else if (age >= 25 && age <= 34) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.female": 1,
                  "demographics.age.25-34": 1,
                },
              },
              {
                new: true,
              }
            );
          } else if (age >= 35 && age <= 44) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.female": 1,
                  "demographics.age.35-44": 1,
                },
              },
              {
                new: true,
              }
            );
          } else if (age >= 45 && age <= 64) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.female": 1,
                  "demographics.age.45-64": 1,
                },
              },
              {
                new: true,
              }
            );
          } else if (age >= 65) {
            await Community.updateOne(
              { _id: community._id },
              {
                $inc: {
                  "demographics.gender.female": 1,
                  "demographics.age.65+": 1,
                },
              },
              {
                new: true,
              }
            );
          }
        }

        //member count inc per day
        let analytcis = await Analytics.findOne({
          date: formattedDate,
          id: community._id,
        });
        if (analytcis) {
          await Analytics.updateOne(
            { _id: analytcis._id },
            {
              $inc: {
                Y1: 1,
              },
            }
          );
        } else {
          const an = new Analytics({
            date: formattedDate,
            id: community._id,
            Y1: 1,
          });
          await an.save();
        }

        let address = user?.address?.state
          ?.toLocaleLowerCase()
          ?.toString()
          ?.trim();

        if (community.location[address]) {
          community.location[address]++;
        } else {
          community.location[address] = 1;
        }

        await community.save();

        //other updations
        let notif = { id: user._id, muted: false };

        await Community.updateOne(
          { _id: comId },
          {
            $push: { members: user._id, notifications: notif },
            $inc: { memberscount: 1 },
          }
        );
        await User.updateOne(
          { _id: userId },
          { $push: { communityjoined: community._id }, $inc: { totalcom: 1 } }
        );

        const topicIds = publictopic.map((topic) => topic._id);

        await Topic.updateMany(
          { _id: { $in: topicIds } },
          {
            $push: { members: user._id, notifications: notif },
            $inc: { memberscount: 1 },
          }
        );

        await User.updateMany(
          { _id: userId },
          {
            $push: { topicsjoined: topicIds },
            $inc: { totaltopics: 2 },
          }
        );

        res.status(200).json({ success: true });
      }
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: e.message, success: false });
    }
  }
};

//community unjoin
exports.unjoinmember = async (req, res) => {
  const { userId, comId } = req.params;
  const user = await User.findById(userId);
  const community = await Community.findById(comId);

  const isOwner = community.creator.equals(user._id);
  const isSubscriber = community.members.includes(user._id);
  try {
    let publictopic = [];
    for (let i = 0; i < community.topics.length; i++) {
      const topic = await Topic.findById({ _id: community.topics[i] });
      if (topic.title === "Posts" || topic.title === "All") {
        publictopic.push(topic);
      }
    }

    if (isOwner) {
      res.status(201).json({
        message: "You can't unjoin your own community!",
        success: false,
      });
    } else if (!isSubscriber) {
      res.status(201).json({ message: "Not Subscribed", success: false });
    } else {
      await Community.updateOne(
        { _id: comId },
        { $pull: { members: user._id }, $inc: { memberscount: -1 } }
      );
      await User.updateOne(
        { _id: userId },
        { $pull: { communityjoined: community._id }, $inc: { totalcom: -1 } }
      );

      await Community.updateOne(
        { _id: comId },
        { $pull: { notifications: { id: user._id } } }
      );

      //counting unjoin members in graph
      let today = new Date();

      let year = today.getFullYear();
      let month = String(today.getMonth() + 1).padStart(2, "0");
      let day = String(today.getDate()).padStart(2, "0");

      let formattedDate = `${day}/${month}/${year}`;

      let analytcis = await Analytics.findOne({
        date: formattedDate,
        id: community._id,
      });
      if (analytcis) {
        await Analytics.updateOne(
          { _id: analytcis._id },
          {
            $inc: {
              Y3: 1,
            },
          }
        );
      } else {
        const an = new Analytics({
          date: formattedDate,
          id: community._id,
          Y3: 1,
        });
        await an.save();
      }

      for (let i = 0; i < community.topics?.length; i++) {
        const topic = await Topic.findById(community.topics[i]);
        if (topic) {
          await Topic.updateOne(
            { _id: topic._id },
            {
              $pull: { members: user._id, notifications: { id: user._id } },
              $inc: { memberscount: -1 },
            }
          );
        }
        await User.updateMany(
          { _id: userId },
          {
            $pull: { topicsjoined: topic._id },
            $inc: { totaltopics: -1 },
          }
        );
      }

      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//get community
exports.getcommunity = async (req, res) => {
  const { comId, id } = req.params;
  const community = await Community.findById(comId).populate(
    "topics",
    "title type price"
  );
  const user = await User.findById(id);
  try {
    if (!community) {
      res.status(404).json({ message: "No community found", success: false });
    } else if (!user) {
      res.status(404).json({ message: "No User found", success: false });
    } else {
      const subs =
        community.admins.includes(user._id) ||
        community.moderators.includes(user._id) ||
        community.members.includes(user._id);
      const canedit =
        community.admins.includes(user._id) ||
        community.moderators.includes(user._id);

      const dp = await generatePresignedUrl(
        "images",
        community.dp.toString(),
        60 * 60
      );

      res.status(200).json({ dp, community, subs, canedit, success: true });
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//get a topic
exports.addTopic = async (req, res) => {
  const { userId, comId } = req.params;
  const { title, message, type, price, nature } = req.body;
  const user = await User.findById(userId);
  try {
    const topic1 = new Topic({
      title: title,
      message: message,
      type: type,
      creator: userId,
      price,
      price,
      community: comId,
      nature,
    });
    await topic1.save();
    await Topic.updateOne(
      { _id: topic1._id },
      { $push: { members: userId }, $inc: { memberscount: 1 } }
    );
    await Topic.updateOne(
      { _id: topic1._id },
      { $push: { notifications: user?._id } }
    );

    await User.updateOne(
      { _id: userId },
      { $push: { topicsjoined: topic1._id }, $inc: { totaltopics: 1 } }
    );

    await Community.updateOne(
      { _id: comId },
      { $push: { topics: topic1._id }, $inc: { totaltopics: 1 } }
    );
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json(e.message);
  }
};

//update community
exports.udpatecommunity = async (req, res) => {
  const { comId, userId } = req.params;
  const { category, name, desc, topicId, message, price, topicname, type } =
    req.body;
  const uuidString = uuid();
  try {
    const user = await User.findById(userId);
    const com = await Community.findById(comId);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else if (!com) {
      res.status(404).json({ message: "Community not found", success: false });
    } else {
      if (req.file) {
        const bucketName = "images";
        const objectName = `${Date.now()}${uuidString}${req.file.originalname}`;
        a1 = objectName;
        a2 = req.file.mimetype;

        await sharp(req.file.buffer)
          .jpeg({ quality: 50 })
          .toBuffer()
          .then(async (data) => {
            await minioClient.putObject(bucketName, objectName, data);
          })
          .catch((err) => {
            console.log(err.message, "-error");
          });
        await Community.updateOne(
          { _id: com._id },
          {
            $set: {
              category: category,
              title: name,
              desc: desc,
              dp: objectName,
            },
          }
        );
      }

      await Community.updateOne(
        { _id: com._id },
        {
          $set: { category: category, title: name, desc: desc },
        }
      );
      await Topic.updateOne(
        { _id: topicId },
        {
          $set: {
            title: topicname,
            message: message,
            price: price,
            type: type,
          },
        }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

//new community post feed and increasing visitors
exports.compostfeed = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const { postId } = req.body;

    const user = await User.findById(id);
    const community = await Community.findById(comId)
      .populate("topics", "title type price nature")
      .populate("creator", "fullname username profilepic isverified");

    let today = new Date();

    let year = today.getFullYear();
    let month = String(today.getMonth() + 1).padStart(2, "0");
    let day = String(today.getDate()).padStart(2, "0");

    let formattedDate = `${day}/${month}/${year}`;
    const incrementValue = 1;

    //muted and unmuted topics
    let muted = null;
    if (community?.notifications?.length > 0) {
      muted = community?.notifications?.filter((f, i) => {
        return f.id?.toString() === user._id.toString();
      });
    }

    if (user && community) {
      //visitor count
      let analytcis = await Analytics.findOne({
        date: formattedDate,
        id: community._id,
      });
      if (analytcis) {
        await Analytics.updateOne(
          { _id: analytcis._id },
          {
            $inc: {
              Y2: 1,
            },
          }
        );
      } else {
        const an = new Analytics({
          date: formattedDate,
          id: community._id,
          Y2: 1,
        });
        await an.save();
      }

      await Community.updateOne(
        { _id: community._id },
        {
          $inc: {
            visitors: 1,
          },
        }
      );

      //creator data
      const creatordp = process.env.URL + community.creator.profilepic;

      //community data
      const subs =
        community.admins.includes(user._id) ||
        community.moderators.includes(user._id) ||
        community.members.includes(user._id);

      //can edit topics
      const canedit =
        (community.admins.includes(user._id) ||
          community.moderators.includes(user._id)) &&
        community?.memberscount > 150;

      //can post
      const canpost =
        community.admins.includes(user._id) ||
        community.moderators.includes(user._id);
      const dp = process.env.URL + community.dp;

      //post data
      const posts = await Post.find({ community: community._id }).populate(
        "sender",
        "fullname profilepic username isverified"
      );
      let index = -1;
      posts.reverse();

      //index of post that appears first
      for (let i = 0; i < posts.length; i++) {
        if (posts[i]._id.toString() === postId) {
          index = i;
          break;
        }
      }

      if (!postId) {
        index = 0;
      }

      //comments
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
      const dps = [];
      const tc = [];
      let urls = [];

      //total comments of each post
      for (let i = 0; i < posts.length; i++) {
        const totalcomments = await Comment.find({ postId: posts[i]._id });
        tc.push(totalcomments.length);
      }

      //likes
      for (let i = 0; i < posts.length; i++) {
        if (
          posts[i].likedby?.some((id) => id.toString() === user._id.toString())
        ) {
          liked.push(true);
        } else {
          liked.push(false);
        }
      }

      //post content
      let ur = [];
      for (let i = 0; i < posts?.length; i++) {
        for (let j = 0; j < posts[i]?.post?.length; j++) {
          const a = process.env.POST_URL + posts[i].post[j].content;

          ur.push({ content: a, type: posts[i].post[j]?.type });
        }
        urls.push(ur);
        ur = [];
      }

      //dp of the sender
      for (let i = 0; i < posts.length; i++) {
        const a = process.env.URL + posts[i].sender.profilepic;

        dps.push(a);
      }

      let ismember;
      //cheking if community is private if person is member
      if (community?.type !== "public") {
        if (community?.members?.includes(user._id)) {
          ismember = true;
        } else {
          ismember = false;
        }
      }

      //mergeing all the data
      const urlData = urls;
      const postData = posts;
      const likeData = liked;
      const dpsdata = dps;
      const commentscount = tc;
      const commentdata = comments;

      const mergedData = urlData.map((u, i) => ({
        dpdata: dpsdata[i],
        urls: u,
        liked: likeData[i],
        posts: postData[i],
        totalcomments: commentscount[i],
        comments: commentdata[i],
      }));

      res.status(200).json({
        muted,
        mergedData,
        index,
        dp,
        community,
        creatordp,
        subs,
        canedit,
        canpost,
        ismember,
        category: community?.category,
        success: true,
      });
    } else {
      res.status(404).json({ message: "User or Community not found" });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//get topic messages
exports.gettopicmessages = async (req, res) => {
  try {
    const { id, topicId } = req.params;
    const user = await User.findById(id);
    const topic = await Topic.findById(topicId);
    const community = await Community.find({ topics: { $in: [topic._id] } });
    if (community && topic && user) {
      const msg = await Message.find({
        topicId: topicId,
        // status: "active",
        deletedfor: { $nin: [user._id.toString()] },
      })
        .limit(20)
        .sort({ createdAt: -1 })
        .populate("sender", "profilepic fullname isverified");

      const messages = msg.reverse();

      //muted and unmuted topics
      let muted = null;
      if (topic?.notifications?.length > 0) {
        muted = topic?.notifications?.filter((f, i) => {
          return f.id?.toString() === user._id.toString();
        });
      }

      if (!community[0].members.includes(user._id)) {
        res.status(203).json({
          message: "You are not the member of the Community",
          success: true,
          topicjoined: false,
        });
      } else {
        //checking if brought topic is valid
        let purchaseindex = topic.purchased.findIndex(
          (f, i) => f.id?.toString() === user._id?.toString()
        );

        const timestamp = topic.purchased[purchaseindex]?.broughton || 0;
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        const currentTimestamp = Date.now();

        const difference = currentTimestamp - timestamp;

        const isWithin30Days = difference <= thirtyDaysInMs;
        let topicdetail = {
          id: topic?._id,
          price: topic?.price,
          desc: topic?.message,
          members: topic?.memberscount,
          name: topic?.title,
        };

        if (
          topic.type !== "paid" &&
          topic.members.some((memberId) => memberId.equals(user?._id))
        ) {
          res.status(200).json({
            muted,
            messages,
            success: true,
            topicjoined: true,
          });
        } else {
          if (topic?.type === "paid") {
            if (
              topic.purchased.some((memberId) =>
                memberId.id.equals(user?._id)
              ) &&
              isWithin30Days
            ) {
              res.status(200).json({
                muted,
                messages,
                success: true,
                topicjoined: true,
              });
            } else {
              res.status(203).json({
                messages: "Not joined",
                success: true,
                topicjoined: false,
                topic: topicdetail,
              });
            }
          } else {
            res.status(200).json({
              muted,
              messages,
              success: true,
              topicjoined: true,
            });
          }
        }
      }
    } else {
      res.status(404).json({ message: "Something not found!", success: false });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//load more messages of a topic
exports.loadmoremessages = async (req, res) => {
  try {
    const { id, topicId, sequence } = req.params;

    const user = await User.findById(id);
    const topic = await Topic.findById(topicId);
    const community = await Community.find({ topics: { $in: [topic._id] } });
    if (community && topic && user) {
      let gt = parseInt(sequence) - 1;
      let lt = gt - 10;

      const messages = await Message.find({
        topicId: topicId,
        sequence: { $gte: lt >= 1 ? lt : 1, $lte: gt },
        deletedfor: { $nin: [user._id.toString()] },
      })
        .limit(20)
        .sort({ sequence: 1 })
        .populate("sender", "profilepic fullname isverified");

      if (!community[0].members.includes(user._id)) {
        res.status(203).json({
          message: "You are not the member of the Community",
          success: true,
          topicjoined: false,
        });
      } else {
        if (
          topic.type === "paid" &&
          topic.members.some((id) => id.toString() === user._id.toString())
        ) {
          res.status(203).json({
            message: "You need to join the topic first",
            success: true,
            topicjoined: false,
            id: topic?._id,
            price: topic?.price,
            desc: topic?.message,
            members: topic?.memberscount,
          });
        } else {
          res.status(200).json({
            messages,
            success: true,
            topicjoined: true,
          });
        }
      }
    } else {
      res.status(404).json({ message: "Somthing not found", success: false });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

exports.create = async (req, res) => {
  const { title, desc, topic, type, price, category, iddata, nature } =
    req.body;
  const { userId } = req.params;
  const image = req.file;
  const uuidString = uuid();

  if (!image) {
    res.status(400).json({ message: "Please upload an image", success: false });
  } else if (iddata != undefined) {
    try {
      const user = await User.findById(userId);
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;
      a = objectName;
      // await minioClient.putObject(
      //   bucketName,
      //   objectName,
      //   image.buffer,
      //   image.buffer.length
      // );
      const result = await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: objectName,
          Body: image.buffer,
          ContentType: image.mimetype,
        })
      );
      const community = new Community({
        title,
        creator: userId,
        dp: objectName,
        desc: desc,
        category: category,
        type: nature,
      });
      const savedcom = await community.save();
      const topic1 = new Topic({
        title: "Posts",
        creator: userId,
        community: savedcom._id,
      });
      await topic1.save();

      const topic2 = new Topic({
        title: "All",
        creator: userId,
        community: savedcom._id,
      });
      await topic2.save();

      // const topic3 = new Topic({
      //   title: topic,
      //   creator: userId,
      //   community: savedcom._id,
      //   type: type,
      //   price: price,
      // });
      // await topic3.save();

      await Community.updateOne(
        { _id: savedcom._id },
        {
          $push: { members: userId, admins: user._id },
          $inc: { memberscount: 1 },
        }
      );

      await Community.updateOne(
        { _id: savedcom._id },
        { $push: { topics: [topic1._id, topic2._id] } }
      );

      await User.findByIdAndUpdate(
        { _id: userId },
        {
          $push: {
            topicsjoined: [topic1._id, topic2._id],
            communityjoined: savedcom._id,
          },
          $inc: { totaltopics: 3, totalcom: 1 },
        }
      );

      for (let i = 0; i < iddata.length; i++) {
        const topicIdToStore = mongoose.Types.ObjectId(iddata[i]);
        await Community.updateOne(
          { _id: savedcom._id },
          { $push: { topics: topicIdToStore } }
        );
        await User.findByIdAndUpdate(
          { _id: userId },
          { $push: { topicsjoined: topicIdToStore } }
        );
      }

      res.status(200).json({ community: savedcom, success: true });
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: e.message, success: false });
    }
  } else {
    try {
      const user = await User.findById(userId);
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;
      a = objectName;
      // await minioClient.putObject(
      //   bucketName,
      //   objectName,
      //   image.buffer,
      //   image.buffer.length
      // );

      let notif = { id: user._id, muted: false };

      const result = await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: objectName,
          Body: image.buffer,
          ContentType: image.mimetype,
        })
      );
      const community = new Community({
        title,
        creator: userId,
        dp: objectName,
        desc: desc,
        category: category,
        type: nature,
      });
      const savedcom = await community.save();
      const topic1 = new Topic({
        title: "Posts",
        creator: userId,
        community: savedcom._id,
        nature: "post",
      });
      await topic1.save();
      const topic2 = new Topic({
        title: "All",
        creator: userId,
        community: savedcom._id,
      });
      await topic2.save();

      await Community.updateOne(
        { _id: savedcom._id },
        {
          $push: { members: userId, admins: user._id },
          $inc: { memberscount: 1 },
        }
      );
      await Community.updateMany(
        { _id: savedcom._id },
        { $push: { topics: [topic1._id, topic2._id] } }
      );

      await Topic.updateOne(
        { _id: topic1._id },
        { $push: { members: user._id }, $inc: { memberscount: 1 } }
      );
      await Topic.updateOne(
        { _id: topic2._id },
        { $push: { members: user._id }, $inc: { memberscount: 1 } }
      );
      await Topic.updateOne(
        { _id: topic1._id },
        { $push: { notifications: notif } }
      );
      await Topic.updateOne(
        { _id: topic2._id },
        { $push: { notifications: notif } }
      );

      await User.updateMany(
        { _id: userId },
        {
          $push: {
            topicsjoined: [topic1._id, topic2._id],
            communityjoined: savedcom._id,
          },
          $inc: { totaltopics: 2, totalcom: 1 },
        }
      );
      res.status(200).json({ community: savedcom, success: true });
    } catch (e) {
      res.status(400).json({ message: e.message, success: false });
    }
  }
};

//get all members
exports.getallmembers = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const community = await Community.findById(comId)
        .populate({
          path: "members",
          select: "fullname pic isverified username profilepic",
          options: { limit: 150 },
        })
        .populate({
          path: "admins",
          model: "User",
          select: "fullname pic isverified username profilepic",
        })
        .populate({
          path: "blocked",
          model: "User",
          select: "fullname pic isverified username profilepic",
        });

      if (!community) {
        res
          .status(404)
          .json({ message: "Community not found", success: false });
      } else {
        let dps = [];

        let isadmin =
          community?.admins[0]._id?.toString === user._id?.toString();
        const admindp = process.env.URL + community?.admins[0].profilepic;

        for (let j = 0; j < community?.members?.length; j++) {
          const a = process.env.URL + community.members[j].profilepic;

          dps.push(a);
        }

        let block = [];
        community?.members?.some((blockedId) =>
          community.blocked?.some((b, i) => {
            block.push(blockedId?._id?.toString() === b?._id?.toString());
          })
        );

        const nonBlockedMembers = community.members?.map((c, i) => ({
          c,
          dp: dps[i],
          blocked: block[i],
        }));

        const members = nonBlockedMembers?.filter(
          (member) => member.c._id?.toString() !== community.creator.toString()
        );

        res.status(200).json({
          success: true,
          members,
          admin: community?.admins[0],
          admindp,
          isadmin,
        });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

//mute topics/community
exports.mutecom = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const user = await User.findById(id);
    const com = await Community.findById(comId);

    if (!user || !com) {
      return res
        .status(404)
        .json({ message: "User or Community not found", success: false });
    }

    //muting the whole community
    if (com.notifications?.length > 0) {
      const notificationIndex = com.notifications.findIndex(
        (notification) => notification.id.toString() === user._id.toString()
      );

      if (notificationIndex !== -1) {
        com.notifications[notificationIndex].muted =
          !com.notifications[notificationIndex].muted;
        await com.save();
      }
    }

    //muting topics individually
    for (let i = 0; i < com.topics.length; i++) {
      const topic = await Topic.findById(com.topics[i]);

      if (topic) {
        const notificationIndex = topic.notifications.findIndex(
          (notification) => notification.id?.toString() === user._id?.toString()
        );

        if (notificationIndex !== -1) {
          topic.notifications[notificationIndex].muted =
            !topic.notifications[notificationIndex].muted;
          await topic.save();
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

//block people from community
exports.blockpcom = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const user = await User.findById(id);
    const com = await Community.findById(comId);

    if (!user || !com) {
      return res
        .status(404)
        .json({ message: "User or Community not found", success: false });
    }

    if (com.blocked.includes(user._id)) {
      await Community.updateOne(
        { _id: com._id },
        {
          $pull: {
            blocked: user._id,
          },
        }
      );
    } else {
      await Community.updateOne(
        { _id: com._id },
        {
          $push: {
            blocked: user._id,
          },
        }
      );
    }
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//vote in community poll
exports.votenowpoll = async (req, res) => {
  try {
    const { id, postId, opId } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
    } else {
      await Post.updateOne(
        { _id: postId, "options._id": opId },
        {
          $inc: { "options.$.strength": 1, totalvotes: 1 },
          $addToSet: { "options.$.votedby": user._id, votedby: user._id },
        }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//remove the community along posts
exports.removecomwithposts = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const user = await User.findById(id);
    if (user) {
      const community = await Community.findById(comId);
      if (community) {
        for (let i = 0; i < community.posts.length; i++) {
          const post = await Post.findById(community.posts[i]);
          if (post) {
            post.remove();
          }
        }
        //)
        community.remove();
      }
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found!", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//fetch all posts
exports.fetchallposts = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const { postId, topicId } = req.body;
    const user = await User.findById(id);
    const community = await Community.findById(comId);

    let topic;
    let feedad = [];
    let vidadarray = [];
    let post = [];
    if (!topicId) {
      topic = await Topic.findOne({
        title: "Posts",
        community: community._id.toString(),
      });
    } else {
      topic = await Topic.findById(topicId);
    }

    if (user && community) {
      const postold = await Post.find({ topicId: topic?._id }).populate(
        "sender",
        "fullname profilepic"
      );

      if (
        community.type === "public" &&
        topic.postcount > 0 &&
        community.ismonetized
      ) {
        //removing un existing posts
        for (let i = 0; i < topic.posts.length; i++) {
          const post = await Post.findById(topic.posts[i]);
          if (!post) {
            await Topic.updateOne(
              { _id: topic._id },
              { $pull: { posts: topic.posts[i] }, $inc: { postcount: -1 } }
            );
          }
        }
        //fetching ads
        const infeedad = await Ads.find({
          status: "active",
          type: "infeed",
        }).populate({
          path: "postid",
          select:
            "desc post title kind likes comments community cta ctalink sender totalcomments adtype date createdAt",
          populate: [
            { path: "community", select: "dp title isverified memberscount" },
            { path: "sender", select: "profilepic fullname" },
          ],
        });

        for (let i = 0; i < infeedad.length; i++) {
          feedad.push(infeedad[i].postid);
        }

        const vidad = await Ads.find({
          status: "active",
          $or: [{ type: "skipable" }, { type: "non-skipable" }],
        }).populate({
          path: "postid",
          select:
            "desc post title kind likes comments community cta ctalink sender totalcomments adtype date createdAt",
          populate: [
            { path: "community", select: "dp title isverified memberscount" },
            { path: "sender", select: "profilepic fullname" },
          ],
        });

        for (let i = 0; i < vidad.length; i++) {
          let a = process.env.AD_URL + vidad[i].postid?.post[0].content;
          let comdp = process.env.URL + vidad[i].postid?.community?.dp;
          let final = {
            _id: vidad[i].postid?._id,
            likes: vidad[i].postid?.likes,
            comments: vidad[i].postid?.likes,
            totalcomments: vidad[i].postid?.totalcomments,
            title: vidad[i].postid?.title,
            desc: vidad[i].postid?.desc,
            community: vidad[i].postid?.community,
            sender: vidad[i].postid?.sender,
            post: vidad[i].postid?.post,
            kind: vidad[i].postid?.kind,
            date: vidad[i].postid?.date,
            adtype: vidad[i].postid?.adtype,
            cta: vidad[i].postid?.cta,
            ctalink: vidad[i].postid?.ctalink,
            createdAt: vidad[i].postid?.createdAt,
            desc: vidad[i].desc,
            headline: vidad[i].headline,
            url: a,
            comdp,
          };
          vidadarray.push(final);
        }
      }

      for (let i = 0; i < postold.length; i++) {
        //object of post
        let po = {
          _id: postold[i]._id,
          likedby: postold[i].likedby,
          likes: postold[i].likes,
          dislike: postold[i].dislike,
          dislikedby: postold[i].dislikedby,
          comments: postold[i].comments,
          totalcomments: postold[i].totalcomments,
          tags: postold[i].tags,
          views: postold[i].views,
          title: postold[i].title,
          desc: postold[i].desc,
          community: postold[i].community,
          sender: postold[i].sender,
          isverified: postold[i].isverified,
          kind: postold[i].kind,
          post: postold[i].post,
          votedby: postold[i].votedby,
          totalvotes: postold[i].totalvotes,
          contenttype: postold[i].contenttype,
          date: postold[i].date,
          status: postold[i].status,
          sharescount: postold[i].sharescount,
          type: postold[i].type,
          options: postold[i].options,
          createdAt: postold[i].createdAt,
          topicId: postold[i].topicId,
        };
        post.push(po);
      }
      //mixing skipable and non-skipable ads with posts
      for (let j = 0; j < vidadarray.length; j++) {
        if (post.length > 0) {
          const randomIndex = getRandomIndexforad();
          if (post[randomIndex].post[0].type === "video/mp4") {
            post[randomIndex].ad = vidadarray[j];
          }
        }
      }

      //muted and unmuted topics
      let muted = null;
      if (topic?.notifications?.length > 0) {
        muted = topic?.notifications?.filter((f, i) => {
          return f.id?.toString() === user._id.toString();
        });
      }
      let index = -1;
      post.reverse();

      //mixing the infeed ad with posts
      function getRandomIndex() {
        return Math.floor(Math.random() * (Math.floor(post.length / 2) + 1));
      }
      function getRandomIndexforad() {
        return Math.floor(Math.random() * Math.floor(post.length / 2));
      }

      for (let i = 0; i < feedad.length; i++) {
        const randomIndex = getRandomIndex();
        post.splice(randomIndex, 0, feedad[i]);
      }
      //index of post that appears first
      for (let i = 0; i < post.length; i++) {
        if (post[i]._id.toString() === postId) {
          index = i;
          break;
        }
      }

      if (!postId) {
        index = 0;
      }

      //comments
      const comments = [];
      for (let i = 0; i < post.length; i++) {
        const comment = await Comment.find({ postId: post[i]._id.toString() })
          .limit(1)
          .sort({ createdAt: -1 });

        if (comment.length > 0) {
          comments.push(comment);
        } else {
          comments.push("no comment");
        }
      }

      const liked = [];
      const dps = [];
      const tc = [];
      let urls = [];

      //total comments of each post
      for (let i = 0; i < post.length; i++) {
        const totalcomments = await Comment.find({ postId: post[i]._id });
        tc.push(totalcomments.length);
      }

      //likes
      for (let i = 0; i < post.length; i++) {
        if (
          post[i].likedby?.some((id) => id.toString() === user._id.toString())
        ) {
          liked.push(true);
        } else {
          liked.push(false);
        }
      }

      //post content
      let ur = [];
      for (let i = 0; i < post?.length; i++) {
        for (let j = 0; j < post[i]?.post?.length; j++) {
          if (post[i].post[j].thumbnail) {
            const a = process.env.POST_URL + post[i].post[j].content;
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

      //dp of the sender
      for (let i = 0; i < post.length; i++) {
        let a;
        if (post[i].kind === "ad") {
          a = process.env.URL + post[i].community.dp;
        } else {
          a = process.env.URL + post[i].sender.profilepic;
        }
        dps.push(a);
      }

      //merging all the data
      const urlData = urls;
      const postData = post;
      const likeData = liked;
      const dpsdata = dps;
      const commentscount = tc;
      const commentdata = comments;

      const mergedData = urlData.map((u, i) => ({
        dpdata: dpsdata[i],
        urls: u,
        liked: likeData[i],
        posts: postData[i],
        totalcomments: commentscount[i],
        comments: commentdata[i],
      }));

      if (!community.members.includes(user._id)) {
        res.status(203).json({
          message: "You are not the member of the Community",
          success: true,
          topicjoined: false,
          mergedData,
        });
      } else {
        //checking if brought topic is valid
        let purchaseindex = topic.purchased.findIndex(
          (f, i) => f.id?.toString() === user._id?.toString()
        );

        const timestamp = topic.purchased[purchaseindex]?.broughton || 0;
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        const currentTimestamp = Date.now();

        const difference = currentTimestamp - timestamp;

        const isWithin30Days =
          topic?.title === "Posts" ? true : difference <= thirtyDaysInMs;
        let topicdetail = {
          id: topic?._id,
          price: topic?.price,
          desc: topic?.message,
          members: topic?.memberscount,
          name: topic?.title,
        };

        if (
          topic.type !== "paid" &&
          topic?.members.some((memberId) => memberId.equals(user?._id))
        ) {
          res.status(200).json({
            muted,
            mergedData,
            index,
            success: true,
            topicjoined: true,
          });
        } else {
          if (topic?.type === "paid") {
            if (
              topic.purchased.some(
                (memberId) => memberId.id.equals(user?._id) && isWithin30Days
              )
            ) {
              res.status(200).json({
                muted,
                mergedData,
                index,
                success: true,
                topicjoined: true,
              });
            } else {
              res.status(203).json({
                messages: "Not joined",
                success: true,
                topicjoined: false,
                topic: topicdetail,
                mergedData,
              });
            }
          } else {
            res.status(200).json({
              muted,
              mergedData,
              index,
              success: true,
              topicjoined: true,
            });
          }
        }
      }

      // res.status(200).json({ success: true, mergedData, index });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Something went wrong..." });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//fetch all subscriptions
exports.fetchallsubscriptions = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user) {
      const subs = await Subscriptions.find({
        purchasedby: user._id.toString(),
      });
      let status = [];
      for (let i = 0; i < subs.length; i++) {
        //checking if brought topic is valid
        let topic = await Topic.findById(subs[i].topic).populate(
          "community",
          "title dp"
        );

        if (!topic) {
          subs[i].remove();
          topic?.remove();
        } else {
          let purchaseindex = topic?.purchased.findIndex(
            (f, i) => f.id?.toString() === user._id?.toString()
          );

          const timestamp = topic?.purchased[purchaseindex]?.broughton || 0;
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

          const currentTimestamp = Date.now();

          const difference = currentTimestamp - timestamp;

          const isWithin30Days = difference <= thirtyDaysInMs;
          status.push({
            topic: topic?.title,
            community: topic?.community?.title,
            validity: isWithin30Days ? "Active" : "Expired",
            dp: process.env.URL + topic?.community?.dp,
          });
        }
      }
      let merged = subs.map((s, i) => ({
        s,
        status: status[i],
      }));
      res.status(200).json({ success: true, merged });
    } else {
      res.status(404).json({ message: "Something went wrong", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false, message: "Something went wrong" });
  }
};

//fetching members to invite in community private
exports.fetchmembers = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const user = await User.findById(id);
    const com = await Community.findById(comId);
    if (user && com) {
      let users = [];
      //finding all the users
      for (let member of user.conversations) {
        const convs = await Conversation.findById(member);
        if (convs && convs.members?.includes(user._id)) {
          for (const id of convs.members) {
            if (id?.toString() !== user._id?.toString()) {
              users.push(id.toString());
              break;
            }
          }
        }
      }

      let final = [];
      //getting details of all those users
      for (let newids of users) {
        if (!com.members.includes(newids)) {
          let u = await User.findById(newids);
          let dp = process.env.URL + u.profilepic;
          let d = { id: u._id, fullname: u.fullname, username: u.username, dp };
          final.push(d);
        }
      }

      res.status(200).json({ final, success: true });
    } else {
      res.status(404).json({ message: "User not found!", success: false });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ success: false, message: "Something went wrong..." });
  }
};

//join the members inside the community
exports.forcejoincom = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const user = await User.findById(id);
    const com = await Community.findById(comId);
    if (user && com) {
      let publictopic = [];
      for (let i = 0; i < com.topics.length; i++) {
        const topic = await Topic.findById({ _id: com.topics[i] });

        if (topic.type === "free") {
          publictopic.push(topic);
        }
      }

      //other updations
      let notif = { id: user._id, muted: false };

      await Community.updateOne(
        { _id: comId },
        {
          $push: { members: user._id, notifications: notif },
          $inc: { memberscount: 1 },
        }
      );
      await User.updateOne(
        { _id: user._id },
        { $push: { communityjoined: com._id }, $inc: { totalcom: 1 } }
      );

      const topicIds = publictopic.map((topic) => topic._id);

      await Topic.updateMany(
        { _id: { $in: topicIds } },
        {
          $push: { members: user._id, notifications: notif },
          $inc: { memberscount: 1 },
        }
      );

      await User.updateMany(
        { _id: user._id },
        {
          $push: { topicsjoined: topicIds },
          $inc: { totaltopics: 2 },
        }
      );
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found!", success: false });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ success: false, message: "Something went wrong..." });
  }
};

//join the members inside the community
exports.setcomtype = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const user = await User.findById(id);
    const com = await Community.findById(comId);
    if (user && com) {
      console.log(com.type);
      await Community.updateOne(
        { _id: comId },
        {
          $set: { type: com.type === "public" ? "private" : "public" },
        }
      );

      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found!", success: false });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ success: false, message: "Something went wrong..." });
  }
};

//submiting reports
exports.reporting = async (req, res) => {
  try {
    const { userid } = req.params;
    const { data, id, type } = req.body;
    const user = await User.findById(userid);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const report = new Report({
        senderId: user._id,
        desc: data,
        reportedid: { id: id, what: type },
      });
      await report.save();
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false, message: "Something went wrong" });
  }
};
