const Post = require("../models/post");
const Community = require("../models/community");
const User = require("../models/userAuth");
const Minio = require("minio");

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
  const { query } = req.query;
  try {
    if (!query) {
      res.status(400).json({ success: false });
    } else {
      const dps = [];
      const creatordps = [];
      const coms = await Community.find({
        title: { $regex: `.*${query}.*`, $options: "i" },
      })
        .populate("creator", "fullname username profilepic isverified")
        .exec();
      for (let i = 0; i < coms.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          coms[i].dp.toString(),
          60 * 60
        );
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
      }).exec();
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
