const Comment = require("../models/comment");
const User = require("../models/userAuth");
const Post = require("../models/post");
const Minio = require("minio");
const Notification = require("../models/notification");

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

//addcomment
exports.create = async (req, res) => {
  const { userId, postId } = req.params;
  const { text } = req.body;
  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json({ message: "Post not found" });
  } else {
    try {
      const newComment = new Comment({
        senderId: userId,
        postId: postId,
        text: text,
      });
      await newComment.save();
      await Post.updateOne(
        { _id: postId },
        { $push: { comments: newComment._id }, $inc: { totalcomments: 1 } }
      );
      res.status(200).json(newComment);
    } catch (e) {
      res.status(400).json(e.message);
    }
  }
};

//like comment
exports.likecomment = async (req, res) => {
  const { commentId, userId } = req.params;
  const user = await User.findById(userId);
  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404).json({ message: "Comment not found" });
  } else if (comment.likedby.includes(user._id)) {
    await Comment.updateOne(
      { _id: commentId },
      { $pull: { likedby: user._id }, $inc: { like: -1 } }
    );
    kde;
    try {
      await Comment.updateOne({ _id: commentId }, { $inc: { like: 1 } });
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  } else {
    try {
      await Comment.updateOne(
        { _id: commentId },
        { $push: { likedby: user._id }, $inc: { like: 1 } }
      );
      if (user._id.toString() !== comment.senderId.toString()) {
        const not = new Notification({
          senderId: user._id,
          recId: comment.senderId,
          text: user.fullname + " liked your Comment",
        });
        await not.save();
        await User.updateOne(
          { _id: not.recId },
          { $push: { notifications: not._id }, $inc: { notificationscount: 1 } }
        );
        console.log("noti");
        res.status(200).json({ success: true });
      } else if (user._id.toString() === comment.senderId.toString()) {
        null;
        console.log("no noti");
      }
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
};

//dislike comment
exports.dislikecomment = async (req, res) => {
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404).json({ message: "Comment not found" });
  }
  try {
    await Comment.updateOne({ _id: commentId }, { $inc: { like: -1 } });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

//deletecomment
exports.deletecomment = async (req, res) => {
  const { userId, commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404).json({ message: "Comment not found" });
  } else if (comment.senderId.toString() !== userId) {
    res.status(400).json({ message: "You can't delete others comments" });
  } else {
    await Comment.findByIdAndDelete(commentId);
    res.status(200).json({ success: true });
  }
};

//fetch all comments
exports.fetchallcomments = async (req, res) => {
  const { userId, postId } = req.params;
  try {
    const user = await User.findById(userId);
    const comment = await Comment.find({ postId: postId })
      .populate("senderId", "fullname profilepic username")
      .limit(50)
      .sort({ createdAt: -1 });

    if (!comment) {
      res.status(404).json({ success: false });
    } else {
      const liked = [];
      for (let i = 0; i < comment.length; i++) {
        if (comment[i].likedby.includes(user._id)) {
          liked.push("liked");
        } else {
          liked.push("not liked");
        }
      }
      const dps = [];
      for (let i = 0; i < comment.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          comment[i].senderId.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
      }

      //merging all the data
      const merged = dps?.map((dp, i) => ({
        dp,
        comments: comment[i],
        likes: liked[i],
      }));
      res.status(200).json({ success: true, merged });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};
