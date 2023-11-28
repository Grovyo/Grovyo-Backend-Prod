const User = require("../models/userAuth");
const Order = require("../models/orders");
const Post = require("../models/post");
const Product = require("../models/product");
const Community = require("../models/community");
const Report = require("../models/reports");
const Job = require("../models/jobs");
const Revenue = require("../models/revenue");
const Minio = require("minio");

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

exports.getuserstotal = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
    } else if (user.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
      const users = await User.countDocuments();
      const orders = await Order.countDocuments();
      const posts = await Post.countDocuments();
      const products = await Product.countDocuments();
      const comms = await Community.countDocuments();
      const reports = await Report.countDocuments();
      const jobs = await Job.countDocuments();
      const revenue = await Revenue.find();
      {
        /* proper representation of revenue and best selling product left cause its done on behalf of orders */
      }
      res.status(200).json({
        users,
        orders,
        posts,
        comms,
        products,
        reports,
        jobs,
        revenue,
        success: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.findUser = async (req, res) => {
  const { userId, id } = req.params;
  try {
    const main = await User.findById(id);
    const user = await User.findById(userId).find({ role: "User" });
    if (!user) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
    }
    res.status(200).json({
      user,
      success: true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
exports.findCreator = async (req, res) => {
  const { userId, id } = req.params;
  try {
    const main = await User.findById(id);
    const user = await User.findById(userId).find({ role: "Creator" });
    if (!user) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
    }
    res.status(200).json({
      user,
      success: true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
exports.findBusiness = async (req, res) => {
  const { userId, id } = req.params;
  try {
    const main = await User.findById(id);
    const user = await User.findById(userId).find({ role: "Business" });
    if (!user) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
    }
    res.status(200).json({
      user,
      success: true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
exports.findDeliveryPartners = async (req, res) => {
  const { userId, id } = req.params;
  try {
    const main = await User.findById(id);
    const user = await User.findById(userId).find({ role: "Delivery" });
    if (!user) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
    }
    res.status(200).json({
      user,
      success: true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
exports.findcoms = async (req, res) => {
  const { comId, id } = req.params;
  try {
    const main = await User.findById(id);
    const coms = await Community.findById(comId);
    if (!coms) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
    }
    res.status(200).json({
      coms,
      success: true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
exports.findposts = async (req, res) => {
  const { postId, id } = req.params;
  try {
    const main = await User.findById(id);
    const posts = await Post.findById(postId);
    if (!posts) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
    }
    res.status(200).json({
      posts,
      success: true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.blockcomms = async (req, res) => {
  const { comId, id } = req.params;
  try {
    const main = await User.findById(id);
    const coms = await Community.findById(comId);
    if (!coms) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
      if (coms.status === "Block") {
        const current = await Community.updateOne(
          { _id: comId },
          { $set: { status: "Unblock" } }
        );
        res.status(200).json({
          current,
          success: true,
        });
      } else if (coms.status === "Unblock") {
        const current = await Community.updateOne(
          { _id: comId },
          { $set: { status: "Block" } }
        );
        res.status(200).json({
          current,
          success: true,
        });
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.blockuser = async (req, res) => {
  const { userId, id } = req.params;
  try {
    const main = await User.findById(id);
    const user = await User.findById(userId).find({ role: "User" });
    if (!user) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
      if (user[0].status === "Block") {
        const current = await User.updateOne(
          { _id: userId },
          { $set: { status: "Unblock" } }
        );
        res.status(200).json({
          current,
          success: true,
        });
      } else if (user[0].status === "Unblock") {
        const current = await User.updateOne(
          { _id: userId },
          { $set: { status: "Block" } }
        );
        res.status(200).json({
          current,
          success: true,
        });
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.blockposts = async (req, res) => {
  const { postId, id } = req.params;
  try {
    const main = await User.findById(id);
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
      if (post.status === "Block") {
        const current = await Post.updateOne(
          { _id: postId },
          { $set: { status: "Unblock" } }
        );
        res.status(200).json({
          current,
          success: true,
        });
      } else if (post.status === "Unblock") {
        const current = await Post.updateOne(
          { _id: postId },
          { $set: { status: "Block" } }
        );
        res.status(200).json({
          current,
          success: true,
        });
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.findproducts = async (req, res) => {
  const { prodId, id } = req.params;
  try {
    const main = await User.findById(id);
    const prod = await Product.findById(prodId);
    if (!prod) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
    }
    res.status(200).json({
      prod,
      success: true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.blockproducts = async (req, res) => {
  const { prodId, id } = req.params;
  try {
    const main = await User.findById(id);
    const prod = await Product.findById(prodId);
    if (!prod) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
      if (prod.status === "Block") {
        const current = await Product.updateOne(
          { _id: prodId },
          { $set: { status: "Unblock" } }
        );
        res.status(200).json({
          current,
          success: true,
        });
      } else if (prod.status === "Unblock") {
        const current = await Product.updateOne(
          { _id: prodId },
          { $set: { status: "Block" } }
        );
        res.status(200).json({
          current,
          success: true,
        });
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.findreports = async (req, res) => {
  const { id } = req.params;
  try {
    const main = await User.findById(id);
    const report = await Report.find();
    if (!report) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
    }
    res.status(200).json({
      report,
      success: true,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.markreports = async (req, res) => {
  const { reportId, id } = req.params;
  try {
    const main = await User.findById(id);
    const report = await Report.findById(reportId);
    if (!report) {
      res.status(404).json({ message: "User not found" });
    } else if (main.role !== "Admin") {
      res.status(404).json({ message: "UnAuthorized" });
    } else {
      const current = await Report.updateOne(
        { _id: reportId },
        { $set: { status: "Resolved" } }
      );
      res.status(200).json({
        current,
        success: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.getdp = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (user) {
      const dp = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      res.status(200).json({ success: true, dp });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};
