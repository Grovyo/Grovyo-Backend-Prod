const User = require("../models/userAuth");
const Community = require("../models/community");
const Minio = require("minio");
const Qr = require("../models/qrcode");
const Order = require("../models/orders");
const Payment = require("../models/paymenthistory");
const Prosite = require("../models/prosite");
const sharp = require("sharp");
const uuid = require("uuid").v4;
const fs = require("fs");
const Product = require("../models/product");
const Ads = require("../models/Ads");

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

const generate17DigitNumber = () => {
  let seventeenDigitNumber = "";
  for (let i = 0; i < 17; i++) {
    const digit = Math.floor(Math.random() * 10); // Generate a random digit between 0 and 9
    seventeenDigitNumber += digit.toString(); // Append the digit to the number string
  }
  return seventeenDigitNumber;
};

exports.login = async (req, res) => {
  const { id } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const dp = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      res.status(200).json({
        message: "user exists signup success",
        user,
        dp,
        userexists: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.allcoms = async (req, res) => {
  const { id } = req.params;
  try {
    const Co = await Community.find({ creator: id }).populate(
      "creator",
      "fullname"
    );
    const dps = [];
    for (let i = 0; i < Co.length; i++) {
      const a = await generatePresignedUrl(
        "images",
        Co[i].dp.toString(),
        60 * 60
      );
      dps.push(a);
    }
    const Com = Co.reverse();
    dps.reverse();
    res.status(200).json({ Com, dps, success: true });
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.getmembers = async (req, res) => {
  const { id, comId } = req.params;
  try {
    const user = await User.findById(id);
    const community = await Community.findById(comId).populate(
      "members",
      "fullname isverified username profilepic username"
    );
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else if (!community) {
      res.status(404).json({ message: "Community not found", success: false });
    } else {
      const members = community.members;
      const dps = [];
      for (let i = 0; i < community.members.length; i++) {
        const dp = await generatePresignedUrl(
          "images",
          community.members[i].profilepic.toString(),
          60 * 60
        );
        dps.push(dp);
      }
      res.status(200).json({ success: true, members, dps });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.mycode = async (req, res) => {
  const { rid } = req.params;
  try {
    if (!rid) {
      res.status(400).json({ message: "UnAuthorized", success: false });
    } else {
      const newid = new Qr({ rid });
      await newid.save();
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.qrlogin = async (req, res) => {
  const { id, rid } = req.params;
  try {
    const user = await User.findById(id);
    if (user && rid.length === 17) {
      res.status(200).json({ success: true });
      await Qr.updateOne(
        { rid: rid },
        {
          $set: { user: user._id },
        }
      );
    } else {
      res.status(200).json({ success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.fetchmyid = async (req, res) => {
  const { rid } = req.params;
  try {
    if (rid.length === 17) {
      const qr = await Qr.findOne({ rid: rid }).populate(
        "user",
        "fullname profilepic"
      );
      if (qr.user) {
        const dp = await generatePresignedUrl(
          "images",
          qr.user.profilepic.toString(),
          60 * 60
        );
        res.status(200).json({ success: true, qr, dp });

        await User.updateOne(
          { _id: qr.user._id },
          {
            $push: { currentlogin: rid },
          }
        );
      } else {
        res.status(404).json({ message: "Not found", success: false });
      }
    } else {
      res.status(200).json({ success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.addmoney = async (req, res) => {
  const orderId = generate17DigitNumber();
  let oi = `order_${orderId}`;
  const { id } = req.params;
  const { amount } = req.body;
  try {
    const user = await User.findById(id);
    if (user) {
      const payment = new Payment({
        amount: amount,
        paymentId: oi,
        buyerId: id,
        status: "pending",
      });
      await payment.save();
      await User.updateOne(
        { _id: id },
        {
          $push: { paymenthistory: payment._id },
        }
      );
      res.status(200).json({ success: true, oi });
    } else {
      res.status(404).json({ message: "User not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.updateorderstatus = async (req, res) => {
  const { id } = req.params;
  const { success, ori, amount } = req.body;
  try {
    const user = await User.findById(id);

    if (user) {
      if (success) {
        await Payment.updateOne(
          { paymentId: ori },
          {
            $set: { status: "completed" },
          }
        );

        await User.updateOne(
          { _id: id },
          {
            $inc: { currentmoney: parseFloat(amount) },
          }
        );

        res.status(200).json({ success: true });
      } else {
        await Payment.updateOne(
          { paymentId: ori },
          {
            $set: { status: "failed" },
          }
        );
        res.status(200).json({ success: true });
      }
    } else {
      res.status(404).json({ message: "User not found...", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.fetchpayhistory = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);

    if (user) {
      const payments = [];
      for (let i = 0; i < user.paymenthistory?.length; i++) {
        const p = await Payment.findById(user.paymenthistory[i]);
        payments.push(p);
      }
      res.status(200).json({
        money: user.currentmoney,
        payments: payments.reverse(),

        success: true,
      });
    } else {
      res.status(404).json({ message: "User not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.fetchprositecollection = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (user) {
      const prosite = await Prosite.find();
      res.status(200).json({ prosite, success: true });
    } else {
      res.status(404).json({ message: "User not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.createprosite = async (req, res) => {
  const { id } = req.params;

  const uuidString = uuid();

  const base64ImageData = req.body.image; // Replace with your base64 image data
  const bucketName = "materials"; // Replace with your desired bucket name
  const objectName = "your-object-name.png"; // Replace with the desired object name

  let base64String = req.body.image;
  let base64Image = base64String.split(";base64,").pop();
  // Upload the buffer to MinIO

  const buffer = Buffer.from(base64Image, "base64");
  minioClient.putObject(
    bucketName,
    objectName,
    buffer,
    buffer.length,
    (error, etag) => {
      if (error) {
        console.error("Error uploading image to MinIO:", error);
        return;
      }

      console.log("Image uploaded successfully. ETag:", etag);
    }
  );

  res.send("buffer");
};

exports.fetchsingleprosite = async (req, res) => {
  const { id, prositeId } = req.params;
  try {
    const user = await User.findById(id);
    const prosite = await Prosite.findById(prositeId);
    if (user && prosite) {
      res.status(200).json({ prosite, success: true });
    } else {
      res.status(404).json({ message: "Not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.fetchaworkspaceproducts = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (user) {
      const products = await Product.find({ creator: user._id });
      const urls = [];
      for (let i = 0; i < products.length; i++) {
        const a = await generatePresignedUrl(
          "products",
          products[i].images[0].toString(),
          60 * 60
        );
        urls.push(a);
      }
      res.status(200).json({ products, urls, success: true });
    } else {
      res.status(404).json({ message: "Not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};
