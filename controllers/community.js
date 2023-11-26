const Community = require("../models/community");
const User = require("../models/userAuth");
const uuid = require("uuid").v4;
const Minio = require("minio");
const Topic = require("../models/topic");
const sharp = require("sharp");
const Post = require("../models/post");
const Comment = require("../models/comment");
const Message = require("../models/message");

const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.site",

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
exports.create = async (req, res) => {
  const { title, desc, topic, type, price, category } = req.body;
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
      if (topic.title === "Posts" || topic.title === "All") {
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
        await Community.updateOne(
          { _id: comId },
          { $push: { members: user._id }, $inc: { memberscount: 1 } }
        );
        await User.updateOne(
          { _id: userId },
          { $push: { communityjoined: community._id }, $inc: { totalcom: 1 } }
        );

        await Topic.updateOne(
          { _id: publictopic[0]._id },
          { $push: { members: user._id }, $inc: { memberscount: 1 } }
        );
        await Topic.updateOne(
          { _id: publictopic[0]._id },
          { $push: { notifications: user._id } }
        );
        await Topic.updateOne(
          { _id: publictopic[1]._id },
          { $push: { notifications: user._id } }
        );
        await Topic.updateOne(
          { _id: publictopic[1]._id },
          { $push: { members: user._id }, $inc: { memberscount: 1 } }
        );

        await User.updateMany(
          { _id: userId },
          {
            $push: { topicsjoined: [publictopic[0]._id, publictopic[1]._id] },
            $inc: { totaltopics: 2 },
          }
        );
        res.status(200).json({ success: true });
      }
    } catch (e) {
      res.status(400).json(e.message);
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

      await Topic.updateOne(
        { _id: publictopic[0]._id },
        { $pull: { members: user._id }, $inc: { memberscount: -1 } }
      );
      await Topic.updateOne(
        { _id: publictopic[0]._id },
        { $pull: { notifications: user._id } }
      );
      await Topic.updateOne(
        { _id: publictopic[1]._id },
        { $pull: { notifications: user._id } }
      );
      await Topic.updateOne(
        { _id: publictopic[1]._id },
        { $pull: { members: user._id }, $inc: { memberscount: -1 } }
      );

      await User.updateMany(
        { _id: userId },
        {
          $pull: { topicsjoined: [publictopic[0]._id, publictopic[1]._id] },
          $inc: { totaltopics: -2 },
        }
      );
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
  const { comId, userId } = req.params;
  const { text } = req.body;
  try {
    const topic1 = new Topic({
      title: text,
      creator: userId,
      community: comId,
    });
    await topic1.save();

    await Community.findByIdAndUpdate(
      { _id: comId },
      { $set: { topics: [topic1._id] } }
    );
    res.status(200).json({ success: true });
  } catch (e) {
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

//new community post feed
exports.compostfeed = async (req, res) => {
  try {
    const { id, comId, postId } = req.params;
    const user = await User.findById(id);
    const community = await Community.findById(comId).populate(
      "topics",
      "title type price"
    );
    if (user && community) {
      //community data
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

      //post data
      const posts = await Post.find({ community: community._id }).populate(
        "sender",
        "fullname profilepic username isverified"
      );
      let index = -1;

      //index of post that appears first
      for (let i = 0; i < posts.length; i++) {
        if (posts[i]._id.toString() === postId) {
          index = i;
          break;
        }
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
          const a = await generatePresignedUrl(
            "posts",
            posts[i].post[j].content?.toString(),
            60 * 60
          );
          ur.push({ content: a, type: posts[i].post[j]?.type });
        }
        urls.push(ur);
        ur = [];
      }

      //dp of the sender
      for (let i = 0; i < posts.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          posts[i].sender.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
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
        mergedData,
        index,
        dp,
        community,
        subs,
        canedit,
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
      const msg = await Message.find({ topicId: topicId })
        .limit(20)
        .sort({ createdAt: -1 })
        .populate("sender", "profilepic fullname isverified");

      const messages = msg.reverse();
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

//load more messages of a topic
exports.loadmoremessages = async (req, res) => {
  try {
    const { id, topicId, sequence } = req.params;

    const user = await User.findById(id);
    const topic = await Topic.findById(topicId);
    const community = await Community.find({ topics: { $in: [topic._id] } });
    if (community && topic && user) {
      let gt = parseInt(sequence);
      let lt = parseInt(sequence) + 10;

      const messages = await Message.find({
        topicId: topicId,
        sequence: { $gte: gt, $lte: lt },
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
