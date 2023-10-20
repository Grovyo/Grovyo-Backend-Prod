const Reply = require("../models/reply");
const User = require("../models/userAuth");
const Comment = require("../models/comment");

//addreply
exports.addreply = async (req, res) => {
  const { userId, commentId } = req.params;
  const { text } = req.body;
  const comment = await Comment.findById(commentId);
  const user = await User.findById(userId);
  if (!comment) {
    res.status(404).json({ message: "Post not found" });
  }
  try {
    const newReply = new Reply({
      senderId: userId,
      commentId: commentId,
      text: text,
    });
    await Comment.updateOne(
      { _id: commentId },
      { $push: { repliedby: user._id }, $inc: { replycount: 1 } }
    );
    await newReply.save();
    res.status(200).json(newReply);
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//like reply
exports.likereply = async (req, res) => {
  const { replyId } = req.params;
  const reply = await Reply.findById(replyId);
  if (!reply) {
    res.status(404).json({ message: "Reply not found" });
  }
  try {
    await Reply.updateOne({ _id: replyId }, { $inc: { like: 1 } });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

//dislike comment
exports.dislikereply = async (req, res) => {
  const { replyId } = req.params;
  const reply = await Reply.findById(replyId);
  if (!reply) {
    res.status(404).json({ message: "Reply not found" });
  }
  try {
    await Reply.updateOne({ _id: replyId }, { $inc: { like: -1 } });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

//deletecomment
exports.deletereply = async (req, res) => {
  const { userId, replyId } = req.params;
  const reply = await Reply.findById(replyId);
  if (!reply) {
    res.status(404).json({ message: "Reply not found" });
  } else if (reply.senderId.toSting() !== userId) {
    res.status(400).json({ message: "You can't delete others reply" });
  } else {
    await Reply.findByIdAndDelete(replyId);
    res.status(200).json({ success: true });
  }
};
