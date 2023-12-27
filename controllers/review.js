const Review = require("../models/review");
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
//add a reveiw with image
exports.createrw = async (req, res) => {
  const { userId, productId } = req.params;
  const { text, stars, desc } = req.body;
  const uuidString = uuid();
  let a1, a2;
  if (!req.files) {
    res.status(400).json({ message: "Please upload an image" });
  }
  try {
    const bucketName = "reviewimages";
    const objectName = `${Date.now()}_${uuidString}_${
      req.files[0].originalname
    }`;
    a1 = objectName;
    a2 = req.files[0].mimetype;
    await minioClient.putObject(
      bucketName,
      objectName,
      req.files[0].buffer,
      req.files[0].buffer.length
    );
    const review = new Review({
      senderId: userId,
      productId: productId,
      text: text,
      content: a1,
      contentType: a2,
      stars: stars,
      desc: desc,
    });
    await Product.updateOne(
      { _id: productId },
      { $inc: { reviews: 1, totalstars: 1 } }
    );
    await review.save();
    res.status(200).json(review);
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//add a review
exports.create = async (req, res) => {
  const { userId, productId } = req.params;
  const { text, stars, desc } = req.body;

  const user = await User.findById(userId);
  try {
    const review = new Review({
      senderId: userId,
      productId: productId,
      text: text,
      stars: stars,
      desc: desc,
      name: user?.fullname,
      dp: user?.profilepic,
    });
    await review.save();
    await Product.updateOne(
      { _id: productId },
      {
        $push: { reviews: review._id, reviewed: user._id },
        $inc: { totalstars: 1 },
      }
    );
    res.status(200).json({ review, success: true });
  } catch (e) {
    res.status(400).json({ error: e.message, success: false });
  }
};

//delete a review
exports.deletereview = async (req, res) => {
  const { userId, reviewId, productId } = req.params;
  const review = await Review.findById(reviewId);
  try {
    if (!review) {
      res.status(404).json({ message: "Review not found" });
    } else if (review.senderId.toString() != userId) {
      res.status(201).json({ message: "You can't delete others reviews" });
    } else {
      await Product.updateOne(
        { _id: productId },
        { $inc: { reviews: -1, totalstars: -1 } }
      );
      await Review.findByIdAndDelete(reviewId);
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//like a review
exports.like = async (req, res) => {
  const { userId, reviewId } = req.params;
  const user = await User.findById(userId);
  const review = await Review.findById(reviewId);
  if (!review) {
    res.status(400).json({ message: "No review found" });
  } else if (review.likedby.includes(user._id)) {
    try {
      await Review.updateOne(
        { _id: reviewId },
        { $pull: { likedby: user._id }, $inc: { like: -1 } }
      );
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  } else {
    try {
      await Review.updateOne(
        { _id: reviewId },
        { $push: { likedby: user._id }, $inc: { like: 1 } }
      );
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
};

//get reveiws with productid
exports.getreviews = async (req, res) => {
  const { prodId } = req.params;
  const review = await Review.find({ productId: prodId })
    .populate("senderId", "fullname profilepic isverified")
    .limit(50)
    .sort({ createdAt: -1 });
  try {
    if (!review) {
      res.status(400).json({ message: "No reviews", success: false });
    } else {
      let dps = [];
      for (let i = 0; i < review.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          review[i].senderId.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
      }
      let reviewpics = [];
      for (let i = 0; i < review.length; i++) {
        if (review[i].content != null) {
          const a = await generatePresignedUrl(
            "review",
            review[i].content.toString(),
            60 * 60
          );
          reviewpics.push(a);
        }
      }
      const finalreviews = review.map((r, i) => ({ r, dp: dps[i] }));
      res.status(200).json({ finalreviews, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};
