const User = require("../models/userAuth");
const Order = require("../models/orders");
const Post = require("../models/post");
const Product = require("../models/product");
const Comment = require("../models/comment");
const Conversation = require("../models/conversation");
const Msgs = require("../models/message");
const Report = require("../models/reports");
const Job = require("../models/jobs");
const Revenue = require("../models/revenue");
const Advertiser = require("../models/Advertiser");
const DelUser = require("../models/deluser");
const Community = require("../models/community");
const Interest = require("../models/Interest");
const Topic = require("../models/topic");
const Approvals = require("../models/Approvals");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Minio = require("minio");
require("dotenv").config();
const aesjs = require("aes-js");

const { faker } = require("@faker-js/faker/locale/en_IN");

let k = "[16, 12, 3, 7, 9, 5, 11, 6, 3, 2, 10, 1, 13, 3, 13, 4]";

//encryption
const encryptaes = (data) => {
  try {
    const textBytes = aesjs.utils.utf8.toBytes(data);
    const aesCtr = new aesjs.ModeOfOperation.ctr(
      JSON.parse(k),
      new aesjs.Counter(5)
    );
    const encryptedBytes = aesCtr.encrypt(textBytes);
    const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
    return encryptedHex;
  } catch (e) {
    console.log(e);
  }
};

const decryptaes = (data) => {
  try {
    const encryptedBytes = aesjs.utils.hex.toBytes(data);
    const aesCtr = new aesjs.ModeOfOperation.ctr(
      JSON.parse(k),
      new aesjs.Counter(5)
    );
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);
    const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
    return decryptedText;
  } catch (e) {
    console.log(e);
  }
};

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

async function generateFakeIndianUser() {
  const firstName = faker.name.firstName("female");
  const lastName = faker.name.lastName("female");

  const email = faker.internet
    .email({ firstName, provider: "gmail.com", allowSpecialCharacters: true })
    .toLowerCase();
  const gender = "female";
  const bio = faker.person.bio();
  // const phoneNumber = faker.phone.number("+91##########");
  const address = {
    street: faker.address.streetAddress({ useFullAddress: false }),
    city: faker.address.city(),
    state: faker.address.state(),
    pincode: faker.address.zipCode(),
    country: "India",
    coordinates: {
      latitude: faker.address.latitude(),
      longitude: faker.address.longitude(),
    },
  };

  return {
    firstName,
    lastName,
    email,
    bio,
    address,
    gender,
    // personImageUrl,
  };
}

async function generateIndianloc() {
  const address = {
    street: faker.address.streetAddress({ useFullAddress: false }),
    city: faker.address.city(),
    state: faker.address.state(),
    pincode: faker.address.zipCode(),
    country: "India",
    coordinates: {
      latitude: faker.address.latitude(),
      longitude: faker.address.longitude(),
    },
  };

  return {
    address,
  };
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
    const user = await User.findById(userId)
      .select("profilepic conversations guide")
      .lean();
    if (user) {
      const dp = process.env.URL + user.profilepic.toString();

      let isbanned = false;
      if (user.status === "Block") {
        isbanned = true;
      }

      //unread msgs
      let unread = 0;
      const convs = user.conversations;
      for (let i = 0; i < convs.length; i++) {
        const conv = await Conversation.findById(convs[i]);
        if (conv) {
          const msgCount = await Msgs.countDocuments({
            conversationId: conv._id,
            status: "active",
            readby: { $nin: [userId] },
          }).lean();
          unread += msgCount; // Increment unread count with the number of unread messages
        }
      }

      res
        .status(200)
        .json({ success: true, dp, isbanned, unread, guide: user.guide });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//new apis

//getting all user data for dashboard
exports.getalldata = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user) {
      let data = {
        users: await User.countDocuments(),
        orders: await Order.countDocuments(),
        posts: await Post.countDocuments(),
        products: await Product.countDocuments(),
        communities: await Community.countDocuments(),
        reports: await Report.countDocuments(),
        jobs: await Job.countDocuments(),
        revenue: await Revenue.find(),
        advertisers: await Advertiser.countDocuments(),
        deliverypartners: await DelUser.countDocuments(),
        pendingapprovals: await Approvals.countDocuments(),
      };
      res.status(200).json({ data, success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//finding and blocking all users
exports.findandblock = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, id, action } = req.body;
    const user = await User.findById(userId);
    if (user) {
      if (type === "community") {
        await Community.updateOne({ _id: id }, { $set: { status: action } });
      } else if (type === "user") {
        await User.updateOne({ _id: id }, { $set: { status: action } });
      } else if (type === "product") {
        await Product.updateOne({ _id: id }, { $set: { status: action } });
      } else if (type === "deliverypartner") {
        await DelUser.updateOne({ _id: id }, { $set: { accstatus: action } });
      } else if (type === "advertiser") {
        await Advertiser.updateOne({ _id: id }, { $set: { idstatus: action } });
      } else {
        await Post.updateOne({ _id: id }, { $set: { status: action } });
      }
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//all approvals pending
exports.allapprovals = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (user) {
      const approvals = await Approvals.find();
      res.status(200).json({ approvals, success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//approve or rejects the pending approvals
exports.approvalactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { id, action } = req.body;
    const user = await User.findById(userId);
    if (user) {
      await Approvals.updateOne({ _id: id }, { $set: { status: action } });
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

exports.trnsfrcommems = async (req, res) => {
  try {
    const { comId } = req.params;

    const community = await Community.findById(comId);
    const user = await User.find({ email: { $exists: true } });

    if (community) {
      let publictopic = [];
      for (let i = 0; i < community.topics.length; i++) {
        const topic = await Topic.findById({ _id: community.topics[i] });

        if (topic.type === "free") {
          publictopic.push(topic);
        }
      }
      //other updations
      for (let i = 0; i < user.length; i++) {
        let notif = { id: user[i]._id, muted: false };

        await Community.updateOne(
          { _id: comId },
          {
            $addToSet: { members: user[i]._id, notifications: notif },
            $inc: { memberscount: 1 },
          }
        );
        await User.updateOne(
          { _id: user[i]._id },
          {
            $addToSet: { communityjoined: community._id },
            $inc: { totalcom: 1 },
          }
        );

        const topicIds = publictopic.map((topic) => topic._id);

        await Topic.updateMany(
          { _id: { $in: topicIds } },
          {
            $addToSet: { members: user[i]._id, notifications: notif },
            $inc: { memberscount: 1 },
          }
        );

        await User.updateMany(
          { _id: user[i]._id },
          {
            $addToSet: { topicsjoined: topicIds },
            $inc: { totaltopics: 2 },
          }
        );
      }
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//create accs
exports.creataccs = async (req, res) => {
  try {
    let users = [];
    for (let i = 1; i < 1024; i++) {
      const user = await generateFakeIndianUser();
      const personImageUrl = `p (${i}).jpg`;
      let d = { user, personImageUrl };
      function generateRandomNumber() {
        let min = 10000;
        let max = 99999;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      function generateRandomDOB() {
        // Generate random day, month, and year
        const day = String(Math.floor(Math.random() * 31) + 1).padStart(2, "0");
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(
          2,
          "0"
        );
        const year = String(Math.floor(Math.random() * (2003 - 1950)) + 1950);

        return `${day}/${month}/${year}`;
      }

      let pass = await generateRandomNumber();

      const encrptedpass = encryptaes(pass);

      const us = new User({
        fullname: user.firstName + " " + user.lastName,
        username:
          i % 2 === 0
            ? user.firstName + `${i}` + generateRandomNumber()
            : user.firstName + generateRandomNumber() + `${i}`,
        email: user.email,
        passw: encrptedpass,
        profilepic: personImageUrl,
        desc: user.bio,
        // interest: individualInterests,
        gender: user.gender,
        DOB: generateRandomDOB(),
        gr: 1,
        creation: Date.now(),
        address: user.address,
      });
      await us.save();

      let comId = "65d313d46a4e4ae4c6eabd15";
      let publictopic = [];
      const community = await Community.findById(comId);
      for (let i = 0; i < community.topics.length; i++) {
        const topic = await Topic.findById({ _id: community.topics[i] });

        if (topic.type === "free") {
          publictopic.push(topic);
        }
      }

      await Community.updateOne(
        { _id: comId },
        { $push: { members: user._id }, $inc: { memberscount: 1 } }
      );
      await User.updateOne(
        { _id: user._id },
        { $push: { communityjoined: community._id }, $inc: { totalcom: 1 } }
      );

      const topicIds = publictopic.map((topic) => topic._id);

      await Topic.updateMany(
        { _id: { $in: topicIds } },
        {
          $push: { members: user._id, notifications: user._id },
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

      users.push(d);
    }

    res.json(users);
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

exports.changegender = async (req, res) => {
  try {
    const pro = await Product.find();

    // for (let i = 0; i < user.length; i++) {
    //   const regexPattern = /\b(?:C|fem|A|B|f|l)\b/;
    //   if (regexPattern.test(user[i].profilepic)) {
    //     await User.updateOne(
    //       { _id: user[i]._id },
    //       { $set: { profilepic: "defaultuser.png" } }
    //     );
    //     console.log("true", user[i].gr);
    //   }
    // }

    for (let i = 0; i < pro.length; i++) {
      await Product.updateOne(
        { _id: pro[i]._id },
        { $set: { isverified: "verified" } }
      );
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

exports.recentSearch = async (req, res) => {
  try {
    const users = [];
    if (req.body.length > 0) {
      for (let i = 0; i < req.body.length; i++) {
        const id = decryptaes(req.body[i]);
        const userselect = await User.findById(id);
        const dp = process.env.URL + userselect.profilepic;

        const user = {
          dp,
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
    res.status(500).json({ message: error.message, success: false });
    console.log(error);
  }
};

exports.countactive = async (req, res) => {
  try {
    const active = await Adm.findById("");
    let ac = active.activity;
    let au = active.activity[ac.length - 1].activeuser;
    res.status(200).json({ success: true, active: au });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

exports.increasefollowers = async (req, res) => {
  try {
    const { count, comId, stats } = req.body;

    const community = await Community.findById(comId);
    const users = await User.find();
    for (let i = 0; i < parseInt(count); i++) {
      const user = await User.findById(users[i]);

      let publictopic = [];
      for (let i = 0; i < community.topics.length; i++) {
        const topic = await Topic.findById({ _id: community.topics[i] });

        if (topic.type === "free") {
          publictopic.push(topic);
        }
      }

      //other updations
      let notif = { id: user._id, muted: false };

      await Community.updateOne(
        { _id: comId },
        {
          $addToSet: { members: user._id, notifications: notif },
          $inc: { memberscount: 1 },
        }
      );

      await User.updateOne(
        { _id: user._id },
        { $addToSet: { communityjoined: community._id }, $inc: { totalcom: 1 } }
      );

      const topicIds = publictopic.map((topic) => topic._id);

      await Topic.updateMany(
        { _id: { $in: topicIds } },
        {
          $addToSet: { members: user._id, notifications: notif },
          $inc: { memberscount: 1 },
        }
      );

      await User.updateMany(
        { _id: user._id },
        {
          $addToSet: { topicsjoined: topicIds },
          $inc: { totaltopics: 2 },
        }
      );
    }
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

exports.inclike = async (req, res) => {
  try {
    const { count, postId, stats } = req.body;

    const post = await Post.findById(postId);
    const users = await User.find();

    for (let i = 0; i < parseInt(count); i++) {
      if (!post) {
        console.log("no post");
      } else if (post.likedby.includes(users[i]._id)) {
        try {
          await Post.updateOne(
            { _id: postId },
            { $pull: { likedby: users[i]._id }, $inc: { likes: -1 } }
          );
          await User.updateOne(
            { _id: users[i]._id },
            { $pull: { likedposts: post._id } }
          );
        } catch (e) {
          console.log(e);
        }
      } else {
        try {
          await Post.updateOne(
            { _id: postId },
            { $push: { likedby: users[i]._id }, $inc: { likes: 1 } }
          );
          await User.updateOne(
            { _id: users[i]._id },
            { $push: { likedposts: post._id } }
          );

          if (users[i]._id.toString() !== post.sender._id.toString()) {
            // const not = new Notification({
            //   senderId: users[i]._id,
            //   recId: post.sender,
            //   text: users[i].fullname + " liked your post",
            // });
            // await not.save();
            // await User.updateOne(
            //   { _id: not.recId },
            //   { $push: { notifications: not._id }, $inc: { notificationscount: 1 } }
            // );
            console.log("noti");
          } else if (users[i]._id.toString() === post.sender._id.toString()) {
            null;
            console.log("no noti");
          }
        } catch (e) {
          console.log(e);
        }
      }
    }
    await Post.updateOne({ _id: postId }, { $inc: { views: count * 4 } });
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

exports.randomcomments = async (req, res) => {
  try {
    const { list, postId } = req.body;

    for (let i = 0; i < list.length; i++) {
      const user = await User.findOne({});
      const newComment = new Comment({
        senderId: user._id,
        postId: postId,
        text: list[i],
      });
      await newComment.save();
      await Post.updateOne(
        { _id: postId },
        { $addToSet: { comments: newComment._id }, $inc: { totalcomments: 1 } }
      );
    }
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

exports.incview = async (req, res) => {
  try {
    const { count, postId } = req.body;
    await Post.updateOne({ _id: postId }, { $inc: { views: count } });
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

exports.incshr = async (req, res) => {
  try {
    const { count, postId } = req.body;
    await Post.updateOne({ _id: postId }, { $inc: { sharescount: count } });
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

exports.incoms = async (req, res) => {
  try {
    const { count, postId } = req.body;
    const post = await Post.findById(postId);
    const com = await Community.findById(post.community).populate(
      "members",
      "gr"
    );

    for (let i = 150; i < Math.min(count, com.members.length); i++) {
      const mem = com.members[i];
      const user = await User.findById(mem);

      if (user && user.gr === 1) {
        const newComment = new Comment({
          senderId: mem,
          postId: postId,
          text: "Interested",
        });

        try {
          await newComment.save();

          await Post.updateOne(
            { _id: postId },
            { $push: { comments: newComment._id }, $inc: { totalcomments: 1 } }
          );
        } catch (error) {
          console.error("Error saving comment:", error);
        }
      }
    }
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};
