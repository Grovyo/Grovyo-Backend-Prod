const Questions = require("../models/questions");
const User = require("../models/userAuth");
const uuid = require("uuid").v4;
const Minio = require("minio");
const { response } = require("express");
const Product = require("../models/product");

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

//add a review
exports.create = async (req, res) => {
  const { userId, productId } = req.params;
  const { text } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!productId) {
      res.status(400).json({ message: "Product not found" });
    } else if (userId === product.creator.toString()) {
      res.status(400).json({ message: "Creator can only reqply to questions" });
    } else {
      const ques = new Questions({
        senderId: userId,
        productId: productId,
        ques: text,
      });
      await Product.updateOne({ _id: productId }, { $inc: { questions: 1 } });
      await ques.save();
      res.status(200).json(ques);
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//delete a review
exports.deleteques = async (req, res) => {
  const { userId, quesId, productId } = req.params;
  const ques = await Questions.findById(quesId);
  try {
    if (!ques) {
      res.status(404).json({ message: "Question not found" });
    } else if (ques.senderId.toString() != userId) {
      res.status(201).json({ message: "You can't delete others questions" });
    } else {
      await Product.updateOne({ _id: productId }, { $inc: { questions: -1 } });
      await Questions.findByIdAndDelete(quesId);
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//like a review
exports.like = async (req, res) => {
  const { userId, quesId } = req.params;
  const user = await User.findById(userId);
  const ques = await Questions.findById(quesId);
  if (!ques) {
    res.status(400).json({ message: "No questions found" });
  } else if (ques.likedby.includes(user._id)) {
    try {
      await Questions.updateOne(
        { _id: quesId },
        { $pull: { likedby: user._id }, $inc: { like: -1 } }
      );
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  } else {
    try {
      await Questions.updateOne(
        { _id: quesId },
        { $push: { likedby: user._id }, $inc: { like: 1 } }
      );
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
};

//get questions with productid
exports.getques = async (req, res) => {
  const { prodId } = req.params;
  console.log(prodId);
  const ques = await Questions.find({ productId: prodId }).populate(
    "senderId",
    "fullname profilepic isverified"
  );
  try {
    if (!ques) {
      res.status(400).json({ message: "No questions", success: false });
    } else {
      let dps = [];
      for (let i = 0; i < ques.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          ques[i].senderId.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
      }
      res.status(200).json({ data: { ques, dps } });
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
