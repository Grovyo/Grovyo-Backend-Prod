const Minio = require("minio");
const aesjs = require("aes-js");
const User = require("../models/userAuth");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const Topic = require("../models/topic");
const Analytics = require("../models/Analytics");
const Community = require("../models/community");
const uuid = require("uuid").v4;
const Post = require("../models/post");
require("dotenv").config();
const Collection = require("../models/Collectionss");
const Product = require("../models/product");
const Order = require("../models/orders");
const multer = require("multer");
const Image = require("../models/Image");
const DevPost = require("../models/DevPost");
const Color = require("../models/Color");
const Font = require("../models/Font");
const Button = require("../models/Button");
// const BackGround = require("../models/BackGround");
const BackColor = require("../models/BackColor");
const Temp = require("../models/Temp");
const Lottie = require("../models/Lottie");
const mongoose = require("mongoose");
const Prosite = require("../models/prosite");

const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.xyz",
  useSSL: true,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});

function generateAccessToken(data) {
  const access_token = jwt.sign(data, process.env.MY_SECRET_KEY, {
    expiresIn: "1h",
  });
  return access_token;
}

function generateRefreshToken(data) {
  const refresh_token = jwt.sign(data, process.env.MY_SECRET_KEY, {
    expiresIn: "10d",
  });
  return refresh_token;
}

// function to generate a presignedurl of minio
async function generatePresignedUrl(bucketName, objectName, expiry = 604800) {
  try {
    const presignedUrl = await minioClient.presignedGetObject(
      bucketName,
      objectName,
      expiry
    );
    return presignedUrl;
  } catch (er) {
    console.error(er);
    throw new Error("Failed to generate presigned URL");
  }
}

//function for decryption of data
const decryptaes = async (data) => {
  try {
    const encryptedBytes = aesjs.utils.hex.toBytes(data);
    const aesCtr = new aesjs.ModeOfOperation.ctr(
      JSON.parse(process.env.key),
      new aesjs.Counter(5)
    );
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);
    const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
    return decryptedText;
  } catch (e) {
    console.log(e);
  }
};

//function for encrypting data
const encryptaes = async (data) => {
  try {
    const textBytes = aesjs.utils.utf8.toBytes(data);
    const aesCtr = new aesjs.ModeOfOperation.ctr(
      JSON.parse(process.env.key),
      new aesjs.Counter(5)
    );
    const encryptedBytes = aesCtr.encrypt(textBytes);
    const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
    return encryptedHex;
  } catch (e) {
    console.log(e);
  }
};

// for checking if user exists
exports.checkid = async (req, res) => {
  try {
    const { phone } = req.body;
    const dphone = await decryptaes(phone);
    const user = await User.findOne({ phone: 91 + dphone });
    if (user) {
      const dp = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      const data = {
        id: user._id.toString(),
        fullname: user.fullname,
        username: user.username,
      };
      const access_token = generateAccessToken(data);
      const refresh_token = generateRefreshToken(data);
      res.cookie("access_token", access_token, {
        httpOnly: true,
        secure: true,
      });
      res.cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: true,
      });
      res.header("Authorization", `Bearer ${access_token}`);
      const dat = {
        dp,
        fullname: user.fullname,
        username: user.username,
        id: user._id,
      };
      const endata = await encryptaes(JSON.stringify(dat));
      res
        .status(200)
        .json({ dp, access_token, refresh_token, endata, success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: "Something Went Wrong", success: false });
  }
};

exports.checkqr = async (req, res) => {
  console.log(req.body);
  try {
    const { id } = req.body;
    const user = await User.findById(id);
    if (user) {
      const dp = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      const data = {
        id: user._id.toString(),
        fullname: user.fullname,
        username: user.username,
      };
      const access_token = generateAccessToken(data);
      const refresh_token = generateRefreshToken(data);
      res.cookie("access_token", access_token, {
        httpOnly: true,
        secure: true,
      });
      res.cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: true,
      });
      res.header("Authorization", `Bearer ${access_token}`);
      const dat = {
        dp,
        fullname: user.fullname,
        username: user.username,
        id: user._id,
      };
      const endata = await encryptaes(JSON.stringify(dat));
      return res
        .status(200)
        .json({ dp, access_token, refresh_token, endata, success: true });
    } else {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// email
exports.checkemail = async (req, res) => {
  try {
    // const info = await transport.sendMail({
    // 	from: 'traceit241@grovyo.com',
    // 	to: "fsayush@gmail.com",
    // 	subject: "Hello ✔",
    // 	text: "Hello world?",
    // 	html: "<b>Hello world?</b>",
    // });
    console.log("Message sent: %s", info.messageId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false });
  }
};

// refresh and access token generation
exports.refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res
        .status(200)
        .json({ success: false, message: "Refresh token not provided" });
    }
    jwt.verify(
      refresh_token,
      process.env.MY_SECRET_KEY,
      async (err, payload) => {
        try {
          if (err) {
            return res
              .status(400)
              .json({ success: false, message: "Invalid refresh token" });
          }
          const user = await User.findById(payload.id);
          if (!user) {
            return res
              .status(400)
              .json({ success: false, message: "User not found" });
          }
          const data = {
            id: user._id.toString(),
            fullname: user.fullname,
            username: user.username,
          };
          const access_token = generateAccessToken(data);

          res.status(200).json({ success: true, access_token });
        } catch (err) {
          console.log(err);
          res.status(400).json({ success: true, access_token });
        }
      }
    );
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: "Internal server error" });
  }
};

// all analytics of Dashboard
exports.analyticsuser = async (req, res) => {
  try {
    const { userid } = req.params;
    const user = await User.findById(userid);
    if (user) {
      // const find = await Analytics.findOne({ userid: user._id.toString() });

      const community = await Community.find({
        creator: user._id.toString(),
      }).populate("topics");

      const dps = await Promise.all(
        community.map(async (d) => {
          const dp = d?.dp?.toString();
          const presignedUrl = await generatePresignedUrl(
            "images",
            dp,
            60 * 60
          );
          return presignedUrl;
        })
      );

      const commerged = community.map((f, i) => {
        return {
          name: f?.title,
          image: dps[i],
          popularity: f?.popularity,
          topic: f?.topics,
          stats: f?.stats,
        };
      });
      const product = await Product.find({ creator: user._id.toString() });

      const productdps = await Promise.all(
        product.map(async (f) => {
          const dp = f?.images[0].content?.toString();
          const presignedUrl = await generatePresignedUrl(
            "products",
            dp,
            60 * 60
          );
          return presignedUrl;
        })
      );

      const promerged = product.map((f, i) => {
        return { ...f.toObject(), dps: productdps[i] };
      });

      const posts = await Post.find({ sender: user._id.toString() }).populate(
        "community",
        "title"
      );
      const postsdps = await Promise.all(
        posts.map(async (f) => {
          const dp = f?.post[0].content?.toString();
          const presignedUrl = await generatePresignedUrl("posts", dp, 60 * 60);
          return presignedUrl;
        })
      );

      const postmerged = posts.map((f, i) => {
        return {
          ...f.toObject(),
          dps: postsdps[i],
        };
      });

      const demo = {
        total: 100,
        ageof18_24man: 15,
        ageof18_24woman: 10,
        ageof25_34man: 20,
        ageof25_34woman: 10,
        ageof35_44man: 5,
        ageof35_44woman: 2,
        ageof45_64man: 10,
        ageof45_64woman: 12,
        age65man: 10,
        age65woman: 6,
      };

      res
        .status(200)
        .json({ success: true, commerged, promerged, postmerged, demo });
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: err.message, success: false });
  }
};

// middleware
exports.authenticateUser = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers["authorization"];
    const token = authorizationHeader && authorizationHeader.split(" ")[1];
    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Unauthorized: Access token not provided",
      });
    }
    const decodedToken = jwt.verify(token, process.env.MY_SECRET_KEY);
    const user = await User.findById(decodedToken.id);
    if (!user) {
      return res
        .status(500)
        .json({ success: false, message: "Unauthorized: User not found" });
    }
    req.user = { id: user._id, fullname: user.fullname };
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Invalid access token" });
  }
};

// get all community
exports.allcoms = async (req, res) => {
  const { id } = req.params;
  try {
    const Co = await Community.find({ creator: id }).populate(
      "creator",
      "fullname"
    );
    const dps = [];
    let avgeng = [];
    for (let i = 0; i < Co.length; i++) {
      const a = await generatePresignedUrl(
        "images",
        Co[i].dp.toString(),
        60 * 60
      );
      dps.push(a);
    }
    const Com = Co.reverse();
    for (let i = 0; i < Co.length; i++) {
      const post = await Post.find({ community: Co[0]._id });

      let totalLikes = 0;
      let numberOfPosts = post.length;
      let totalshares = 0;

      for (let j = 0; j < post.length; j++) {
        totalLikes += post[j].likes;
        totalshares += post[j].sharescount;
      }
      const averageLikes =
        numberOfPosts > 0 ? (totalLikes / numberOfPosts) * 100 : 0;
      const averageshares =
        numberOfPosts > 0 ? (totalshares / numberOfPosts) * 100 : 0;
      avgeng.push(averageLikes + averageshares);
    }

    dps.reverse();
    avgeng.reverse();
    const dpdata = dps;
    const comData = Com;
    const merged = dpdata.map((d, i) => ({
      dps: d,
      c: comData[i],
    }));
    res.status(200).json({ merged, avgeng, success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.createcom = async (req, res) => {
  const { title, desc, topic, type, price, category, iddata } = req.body;
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

      // const topic3 = new Topic({
      // 	title: topic,
      // 	creator: userId,
      // 	community: savedcom._id,
      // 	type: type,
      // 	price: price,
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
      // await Community.updateMany(
      //   { _id: savedcom._id },
      //   {
      //     $push: { topics: [topic1._id, topic2._id, topic3._id] },
      //     $inc: { totaltopics: 1 },
      //   }
      // );

      // await Topic.updateOne(
      //   { _id: topic1._id },
      //   { $push: { members: user._id }, $inc: { memberscount: 1 } }
      // );
      // await Topic.updateOne(
      //   { _id: topic2._id },
      //   { $push: { members: user._id }, $inc: { memberscount: 1 } }
      // );
      // await Topic.updateOne(
      //   { _id: topic3._id },
      //   { $push: { members: user._id }, $inc: { memberscount: 1 } }
      // );
      // await Topic.updateOne(
      //   { _id: topic1._id },
      //   { $push: { notifications: user._id } }
      // );
      // await Topic.updateOne(
      //   { _id: topic2._id },
      //   { $push: { notifications: user._id } }
      // );
      // await Topic.updateOne(
      //   { _id: topic3._id },
      //   { $push: { notifications: user._id } }
      // );

      // await User.updateMany(
      //   { _id: userId },
      //   {
      //     $push: {
      //       topicsjoined: [topic1._id, topic2._id, topic3._id],
      //       communityjoined: savedcom._id,
      //     },
      //     $inc: { totaltopics: 3, totalcom: 1 },
      //   }
      // );
      res.status(200).json({ community: savedcom, success: true });
    } catch (e) {
      console.log(e);
      res.status(400).json({ message: e.message, success: false });
    }
  } else {
    try {
      console.log("first");
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

exports.getposts = async (req, res) => {
  try {
    const { id, comid } = req.params;
    const com = await Community.findOne({
      creator: id.toString(),
      _id: comid,
    }).populate("posts");
    if (com && com.posts) {
      const postdetails = com.posts.map((post) => {
        return {
          post,
          // like comment share views already present on post itself
          community: com.title,
          engagementrate: (post.likes + post.views) / 100,
        };
      });
      res.status(200).json({ success: true, postdetails });
    } else {
      res.status(400).json({ success: false, message: "Not found" });
    }
  } catch (err) {
    res.status(400).json({ message: "Cant get following information" });
    console.log(err);
  }
};

// Store API =>
// store registration
exports.registerstore = async (req, res) => {
  console.log(req.file, "file");
  console.log(req.body, "body");
  try {
    const { userId } = req.params;
    const {
      buildingno,
      postal,
      landmark,
      gst,
      businesscategory,
      documenttype,
      state,
      city,
    } = req.body;
    if (req.file == undefined) {
      return res.status(400).json({ message: "Please upload a document file" });
    }
    const uuidString = uuid();
    const bucketName = "products";
    const objectName = `${Date.now()}_${uuidString}_${req.file.originalname}`;
    console.log(objectName);
    await sharp(req.file.buffer)
      .jpeg({ quality: 50 })
      .toBuffer()
      .then(async (data) => {
        await minioClient.putObject(bucketName, objectName, data);
      })
      .catch((err) => {
        console.log(err.message, "-error");
      });
    const findStore = await User.findById(userId);
    const finaladdress = {
      buildingno: buildingno,
      city: city,
      state: state,
      postal: postal,
      landmark: landmark,
      gst: gst,
      businesscategory: businesscategory,
      documenttype: documenttype,
      documentfile: objectName,
    };

    if (findStore) {
      await User.updateOne(
        { _id: userId },
        { $set: { storeAddress: finaladdress } }
      );

      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "User Not Found" });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

// create collection
exports.createCollection = async (req, res) => {
  console.log(req.body, "body");
  console.log(req.file, "file");
  try {
    const { name, category } = req.body;
    const { userId } = req.params;
    let data;
    if (req.file) {
      const uuidString = uuid();
      const bucketName = "products";
      const objectName = `${Date.now()}_${uuidString}_${req.file.originalname}`;
      console.log(objectName);
      await sharp(req.file.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, objectName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });
      data = {
        name: name,
        category: category,
        creator: userId,
        verfication: objectName,
      };
    } else {
      data = {
        name: name,
        category: category,
        creator: userId,
      };
    }
    const newCol = new Collection(data);
    await newCol.save();
    await User.updateOne(
      { _id: userId },
      { $push: { collectionss: newCol._id } }
    );
    res.status(200).json({ status: "success" });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

// delete collection
exports.collectiondelete = async (req, res) => {
  try {
    const { userId, colid } = req.params;
    const collection = await Collection.findById(colid);
    const user = await User.findById(userId);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    } else {
      console.log(collection._id, user.collectionss);
      if (collection.creator.toString() !== userId) {
        return res
          .status(403)
          .json({ message: "You can't delete collections of other users" });
      } else {
        await Product.deleteMany({ _id: { $in: collection.products } });
        await User.updateOne(
          { _id: userId },
          { $pull: { collectionss: collection._id } }
        );
        await collection.deleteOne();
        res.status(200).json({ success: true });
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

// fetch Products
exports.fetchProduct = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (user) {
      const collectionsToSend = [];

      for (const collectionId of user.collectionss) {
        const find = await Collection.findById(
          collectionId.toString()
        ).populate("products");

        if (find) {
          const dps = await Promise.all(
            find.products.map(async (product) => {
              const imageUrl = product.images[0].content.toString();
              return await generatePresignedUrl("products", imageUrl, 60 * 60);
            })
          );
          const productsWithDps = find.products.map((product, index) => {
            return {
              ...product.toObject(),
              dp: dps[index],
            };
          });
          collectionsToSend.push({
            ...find.toObject(),
            products: productsWithDps,
          });
        }
      }
      res.json({ collections: collectionsToSend, user, success: true });
    } else {
      res.json({ message: "User Not Found" });
    }
  } catch (err) {
    res.status(404).json({ message: err.message, success: false });
    console.log(err);
  }
};

// add a product
exports.createproduct = async (req, res) => {
  const { userId, colid } = req.params;
  const {
    name,
    brandname,
    desc,
    quantity,
    shippingcost,
    price,
    discountedprice,
    sellername,
    totalstars,
    weight,
    type,
  } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    res.status(400).json({ message: "User not found", success: false });
  } else {
    if (req.files.length < 1) {
      res.status(400).json({ message: "Must have one image" });
    } else {
      try {
        let pos = [];

        for (let i = 0; i < req?.files?.length; i++) {
          const uuidString = uuid();
          const bucketName = "products";
          const objectName = `${Date.now()}_${uuidString}_${
            req.files[i].originalname
          } `;
          if (req.files[i].fieldname === "video") {
            await minioClient.putObject(
              bucketName,
              objectName,
              req.files[i].buffer,
              req.files[i].size,
              req.files[i].mimetype
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

        const p = new Product({
          name,
          brandname,
          desc,
          creator: userId,
          quantity,
          shippingcost,
          price,
          discountedprice,
          sellername,
          totalstars,
          images: pos,
          weight,
          type,
        });
        const data = await p.save();

        const collection = await Collection.findById(colid);
        if (!collection) {
          return res
            .status(404)
            .json({ message: "Collection not found", success: false });
        }

        collection.products.push(data);
        const actualdata = await collection.save();

        res.status(200).json({ actualdata, success: true });
      } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message, success: false });
      }
    }
  }
};

//delete a product
exports.deleteproduct = async (req, res) => {
  const { userId, colid, productId } = req.params;
  try {
    const collection = await Collection.findById(colid);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (collection.creator.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can't delete products in this collection" });
    }

    const product = collection.products.find(
      (p) => p._id.toString() === productId
    );

    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found in this collection" });
    }

    await Product.findByIdAndDelete(productId);

    collection.products = collection.products.filter(
      (p) => p._id.toString() !== productId
    );
    await collection.save();

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(400).json(e.message);
  }
};

// get a product
exports.getaproduct = async (req, res) => {
  const { id, productId } = req.params;
  const user = await User.findById(id);
  const product = await Product.findById(productId);
  try {
    if (!product) {
      res.status(404).json({ message: "Product not found", success: false });
    } else {
      const urls = [];
      let isreviewed = false;
      if (product.reviewed.includes(user?._id)) {
        isreviewed = true;
      }
      for (let i = 0; i < product.images.length; i++) {
        if (product.images[i] !== null) {
          const a = await generatePresignedUrl(
            "products",
            product.images[i].content.toString(),
            60 * 60
          );
          urls.push(a);
        }
      }
      res
        .status(200)
        .json({ data: { reviewed: isreviewed, product, urls, success: true } });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

// update product
exports.updateproduct = async (req, res) => {
  const { data } = req.body;

  try {
    const { userId, colid, productId } = req.params;

    const collection = await Collection.findById(colid);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (collection.creator.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can't update products in this collection" });
    }

    const product = collection.products.find(
      (p) => p._id.toString() === productId
    );

    if (!product) {
      res.status(404).json({ message: "Product not found", success: false });
    } else {
      await Product.updateOne({ _id: productId }, { $set: req.body });
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};
// orders
//fetch orders
exports.fetchallorders = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user) {
      const orders = await Order.find({ sellerId: user._id })
        .populate("productId")
        .populate("buyerId", "fullname")
        .limit(2);

      const pendingOrders = orders.filter(
        (order) => order.currentStatus === "pending"
      );
      const completedOrders = orders.filter(
        (order) => order.currentStatus === "completed"
      );
      const cancelled = orders.filter(
        (order) => order.currentStatus === "cancelled"
      );
      const returned = orders.filter(
        (order) => order.currentStatus === "returned"
      );
      const damaged = orders.filter(
        (order) => order.currentStatus === "damaged"
      );
      const allorders = orders.length;
      const customers = user?.customers?.length;

      let dp = await Promise.all(
        orders.map(async (d, i) => {
          if (d?.productId?.length > 0) {
            const l = await Promise.all(
              d?.productId?.map(async (f, il) => {
                return generatePresignedUrl(
                  "products",
                  d?.productId[il]?.images[0]?.content?.toString(),
                  60 * 60
                );
              })
            );
            return l;
          } else {
            return null; // You need to return a value for cases where d?.productId?.length is not greater than 0
          }
        })
      );

      const statswithorder = await Promise.all(
        orders.map((d, i) => {
          return { stats: d.stats[i] };
        })
      );

      res.status(200).json({
        pendingOrders,
        completedOrders,
        allorders,
        cancelled,
        returned,
        damaged,
        customers,
        orders,
        statswithorder,
        dp,
      });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.profileinfo = async (req, res) => {
  console.log(req.body);
  try {
    const { id } = req.params;
    const { name, phone, email, username } = req.body;
    const fun = async () => {
      const userChange = await User.findOne({
        username,
        phone,
        email,
        _id: { $ne: id },
      });
      if (userChange) {
        return res
          .status(400)
          .json({ message: "Cant Use this details", success: false });
      } else {
        const newUsername = username;
        const newPhone = phone;
        const newEmail = email;
        return [newUsername, newPhone, newEmail];
      }
    };
    const [newUsername, newPhone, newEmail] = await fun();
    const user = await User.findById(id);
    if (user) {
      user.fullname = name;
      user.phone = newPhone;
      user.email = newEmail;
      user.username = newUsername;
      await user.save();
      const dp = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      const data = {
        dp,
        fullname: user.fullname,
        username: user.username,
        id: user._id,
      };
      const endata = await encryptaes(JSON.stringify(data));
      return res.status(200).json({ success: true, endata });
    } else {
      res.status(400).json({ message: "User Not Found", success: false });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.profileStore = async (req, res) => {
  console.log(req.body);
  try {
    const { id } = req.params;
    const { storeAddress, city, landmark, state, postalCode } = req.body;

    const user = await User.findById(id);
    if (user) {
      user.storeAddress[0].buildingno = storeAddress;
      user.storeAddress[0].state = state;
      user.storeAddress[0].postal = postalCode;
      user.storeAddress[0].city = city;
      user.storeAddress[0].landmark = landmark;
      await user.save();
      const dp = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      const data = {
        dp,
        fullname: user.fullname,
        username: user.username,
        id: user._id,
      };
      const endata = await encryptaes(JSON.stringify(data));
      return res.status(200).json({ success: true, endata });
    } else {
      res.status(400).json({ message: "User Not Found", success: false });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getprofileinfo = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user) {
      const data = {
        name: user?.fullname,
        email: user?.email,
        phone: user?.phone,
        username: user?.username,
        storeAddress: user?.storeAddress[0]?.buildingno,
        city: user?.storeAddress[0]?.city,
        state: user?.storeAddress[0]?.state,
        postalCode: user?.storeAddress[0]?.postal,
        landmark: user?.storeAddress[0]?.landmark,
      };
      res.status(200).json({ success: true, data });
    } else {
      res.status(400).json({ success: false, message: "User Not Found" });
    }
  } catch (err) {
    res.status(400).json({ message: "Internal Server Error" });
    console.log(err);
  }
};

// create topic
exports.createtopic = async (req, res) => {
  const { title, message, type, price, comid } = req.body;
  const { userId } = req.params;
  try {
    const topic = new Topic({
      title: title,
      creator: userId,
      message: message,
      type: type,
      price: price,
    });

    await topic.save();

    await Topic.updateOne(
      { _id: topic._id },
      { $push: { members: userId }, $inc: { memberscount: 1 } }
    );
    // await Community.updateOne(
    //   { _id: comId },
    //   {
    //     $push: { topics: topic._id },
    //     $inc: { totaltopics: 1 },
    //   }
    // );
    await User.updateOne(
      { _id: userId },
      { $push: { topicsjoined: topic._id }, $inc: { totaltopics: 1 } }
    );

    if (comid) {
      await Community.findByIdAndUpdate(
        { _id: comid },
        { $push: { topics: topic._id } }
      );
    }
    res.status(200).json({ topic, success: true });
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

// fetchTopic
exports.fetchtopic = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const user = await User.findById(id);
    const community = await Community.findById(comId).populate("topics");
    if (!community) {
      res.json({ message: "Community Not Found" });
    } else {
      res.json({ topics: community.topics, success: true });
    }
  } catch (err) {
    res.status(400).json({ message: err.message, success: false });
    console.log(err);
  }
};

//Delete Topic
exports.deletetopic = async (req, res) => {
  const { topicId, userId } = req.params;
  console.log(topicId, "topicid");
  const { idtosend } = req.body;

  console.log(req.body, idtosend, "id");
  const topic = await Topic.findById(topicId);
  try {
    if (!topicId) {
      res.status(400).json({ message: "No topic found", success: false });
    } else if (topic.creator.toString() != userId.toString()) {
      res
        .status(400)
        .json({ message: "Not Authorized - You can't delete others topic" });
    } else {
      await Topic.findByIdAndDelete(topicId);
      console.log("1");
      if (idtosend) {
        console.log("2");
        await Community.findByIdAndUpdate(
          { _id: idtosend },
          { $pull: { topics: topicId } },
          { new: true }
        );
      }
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message });
  }
};

// edit topic
exports.edittopic = async (req, res) => {
  try {
    const { id, topicid } = req.params;
    const topic = await Topic.findById(topicid);
    if (!topic) {
      res.status(400).json({ message: "No topic found", success: false });
    } else if (topic.creator.toString() != id) {
      res
        .status(400)
        .json({ message: "Not Authorized - You can't edit others topic" });
    } else {
      const updatedTopic = await Topic.findOneAndUpdate(
        { _id: topicid },
        req.body,
        { new: true }
      );
      res.status(200).json({ updatedTopic, success: true });
    }
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", success: false });
    console.log(err);
  }
};

exports.updatecommunity = async (req, res) => {
  const { comId, userId } = req.params;
  const { category, title, desc, topicId, message, price, topicname, type } =
    req.body;
  const uuidString = uuid();
  console.log(req.file, req.body, userId, comId);
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
        const objectName = `${Date.now()}${uuidString}${
          req.file.originalname
        } `;
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
              title: title,
              desc: desc,
              dp: objectName,
            },
          }
        );
      }
      console.log("firsr");
      const commun = await Community.findByIdAndUpdate(
        { _id: com._id },
        {
          $set: { category: category, title: title, desc: desc },
        },
        {
          new: true,
        }
      );

      if (topicname) {
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
      }
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.checkStore = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user) {
      const store = user.storeAddress.length;
      if (store > 0) {
        return res.status(200).json({ exist: true });
      } else {
        return res.status(200).json({ exist: false });
      }
    } else {
      return res.status(400).json({ message: "User Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.earnings = async (req, res) => {
  try {
  } catch (err) {
    console.log(err);
  }
};

exports.deletecom = async (req, res) => {
  const { comid } = req.params;
  try {
    const find = await Community.findByIdAndDelete(comid);
    if (!find) {
      res.status(404).json({ message: "not found", success: false });
    } else {
      res
        .status(200)
        .json({ success: true, message: "Community Successfully Deleted" });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

// Prosite Functions
exports.base64upload = async (req, res) => {
  const body = req.body;
  try {
    const newImage = await Image.create(body);
    newImage.save();
    res
      .status(201)
      .json({ message: "new image uploaded", createdPost: newImage });
  } catch (error) {
    res.status(409).json({
      message: error.message,
    });
  }
};

exports.devpost = async (req, res) => {
  const body = req.body;
  try {
    const newImage = await DevPost.create(body);
    newImage.save();
    res
      .status(201)
      .json({ message: "new image uploaded", createdPost: newImage });
  } catch (error) {
    res.status(409).json({
      message: error.message,
    });
  }
};

exports.getDevpost = async (req, res) => {
  try {
    const post = await DevPost.find();
    res.status(200).json(post);
  } catch (error) {
    res.status(409).json({
      message: error.message,
    });
  }
};

exports.getimage = async (req, res) => {
  try {
    const find = await Image.find();
    if (find) {
      const reverse = find.reverse();
      res.json(reverse);
    } else {
      res.json({ post: "Not Found" });
    }
  } catch (err) {
    res.json({ message: err.message, success: false });
    console.log(err);
  }
};

exports.colors = async (req, res) => {
  const { color } = req.body;
  try {
    // console.log(color)
    const newColor = new Color({
      bg: color.c1,
      text: color.c2,
      button: color.c3,
      number: color.no,
    });

    // console.log(newColor)
    // Save the new color to your database
    await newColor.save();

    res.status(201).json(newColor);
  } catch (err) {
    console.log(err);
  }
};

exports.getColors = async (req, res) => {
  try {
    const data = await Color.findOne({});
    if (data) {
      // console.log(data)
      res.json(data);
    } else {
      res.json("not found");
    }
  } catch (err) {
    console.log(err);
  }
};

exports.fonts = async (req, res) => {
  const { data } = req.body;
  try {
    // console.log(data)
    const newfont = new Font({
      fontType: data.fontType,
      fontSize: data.fontSize,
      fontWeight: data.fontWeight,
      textShadow: data.textShadow,
    });
    // console.log(newfont)
    // Save the new color to your database
    await newfont.save();

    res.status(201).json({ newfont, success: true });
  } catch (err) {
    console.log(err);
  }
};

exports.getFonts = async (req, res) => {
  try {
    const data = await Font.find();
    if (data) {
      // console.log(data)
      res.json({ data, success: true });
    } else {
      res.json("not found");
    }
  } catch (err) {
    console.log(err);
  }
};

exports.button = async (req, res) => {
  const { data } = req.body;
  try {
    // console.log(data)
    const newButton = new Button({
      backgroundColor: data.backgroundColor,
      Color: data.Color,
      borderTop: data.borderTop,
      borderBottom: data.borderBottom,
      borderRight: data.borderRight,
      borderLeft: data.borderLeft,
      paddingX: data.paddingX,
      paddingY: data.paddingY,
      borderRadiusTop: data.borderRadiusTop,
      borderRadiusBottom: data.borderRadiusBottom,
      borderRadiusRight: data.borderRadiusRight,
      borderRadiusLeft: data.borderRadiusLeft,
      boxShadow: data.boxShadow,
      fontBold: data.fontBold,
    });

    // console.log(newButton)
    // Save the new color to your database
    await newButton.save();

    res.status(201).json({ newButton, success: true });
  } catch (err) {
    console.log(err);
  }
};

exports.getButton = async (req, res) => {
  try {
    const data = await Button.find();
    if (data) {
      console.log(data);
      res.json({ data, success: true });
    } else {
      res.json("not found");
    }
  } catch (err) {
    console.log(err);
  }
};

exports.background = async (req, res) => {
  const body = req.body;
  try {
    const newImage = await BackGround.create(body);
    newImage.save();
    res
      .status(201)
      .json({ message: "new image uploaded", createImage: newImage });
  } catch (error) {
    res.status(409).json({
      message: error.message,
    });
  }
};

exports.getBackground = async (req, res) => {
  try {
    const find = await BackGround.find();
    if (find) {
      res.json({ find, success: true });
    } else {
      res.json({ message: "Not Found" });
    }
  } catch (err) {
    console.log(err);
  }
};

exports.backColor = async (req, res) => {
  try {
    const body = req.body;
    const createcolor = new BackColor(body);
    const savethis = await createcolor.save();
    res.json(savethis);
  } catch (err) {
    console.log(err);
  }
};

exports.getbackColor = async (req, res) => {
  try {
    const find = await BackColor.find();
    if (find) {
      res.json(find);
    }
  } catch (err) {
    console.log(err);
  }
};

exports.temp = async (req, res) => {
  try {
    const { post, idd, setNm } = req.body;
    const iddd = await Temp.findOne({ idd });

    if (!iddd) {
      const neww = new Temp({ post, idd, setNm });
      await neww.save();
      res.status(201).json(neww);
    } else {
      await Temp.findOneAndUpdate({ idd }, { post }, { setNm });
      res.status(200).json({ message: "Temp updated successfully" });
    }
  } catch (error) {
    console.error("Error occurred", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.fetchData = async (req, res) => {
  try {
    const mew = await Temp.findOne();
    res.status(201).json(mew);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error", message: error.message });
  }
};

exports.lottie = async (req, res) => {
  try {
    const file = req.file;
    // console.log(req.file)
    const newLottie = new Lottie({
      lottieFile: file.buffer,
    });
    await newLottie.save();
    res.json({
      newLottie,
      message: "File uploaded successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.getLottie = async (req, res) => {
  try {
    const findlottie = await Lottie.find();
    if (findlottie) {
      res.json({ findlottie, success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.log(err);
  }
};

exports.getprositefull = async (req, res) => {
  try {
    const { username } = req.body;
    console.log(username);
    const atIndex = username.indexOf("@");

    if (atIndex === -1) {
      res
        .status(400)
        .json({ message: "Invalid username format", success: false });
      return;
    }
    const u = username.substring(atIndex + 1);

    const user = await User.findOne({ username: u }).populate(
      "prositeid",
      "htmlcontent"
    );
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      res
        .status(200)
        .json({ success: true, prosite: user?.prositeid?.htmlcontent });
    }
  } catch (e) {
    console.log(e);
    res
      .status(500)
      .json({ message: "Something went wrong...", success: false });
  }
};

exports.prosite = async (req, res) => {
  try {
    const { data, id } = req.body;
    const user = await User.findOne({ _id: id });
    const prosite = await Prosite.findOne({ creator: id });

    if (user) {
      if (prosite) {
        prosite.htmlcontent = data;
        await prosite.save();
        await User.updateOne(
          { _id: id },
          { $set: { prositeid: prosite._id } },
          { new: true }
        );
      } else {
        const newprosite = new Prosite({
          creator: id,
          htmlcontent: data,
        });
        const saved = await newprosite.save();
        await User.updateOne(
          { _id: id },
          { $set: { prositeid: saved._id } },
          { new: true }
        );
      }
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (err) {
    console.log(err);
  }
};
