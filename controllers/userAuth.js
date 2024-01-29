const User = require("../models/userAuth");
const Deluser = require("../models/deluser");
const jwt = require("jsonwebtoken");
const sng = require("@sendgrid/mail");
const { errorHandler } = require("../helpers/dbErrorHandler");
const Minio = require("minio");
const Test = require("../models/test");
const uuid = require("uuid").v4;
const sharp = require("sharp");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const aesjs = require("aes-js");
const Community = require("../models/community");
const Topic = require("../models/topic");

const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.xyz",

  useSSL: true,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});

let k = [16, 12, 3, 7, 9, 5, 11, 6, 3, 2, 10, 1, 13, 3, 13, 4];

//encryption and decryption
const encryptaes = (data) => {
  try {
    const textBytes = aesjs.utils.utf8.toBytes(data);
    const aesCtr = new aesjs.ModeOfOperation.ctr(k, new aesjs.Counter(5));
    const encryptedBytes = aesCtr.encrypt(textBytes);
    const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
    return encryptedHex;
  } catch (e) {
    console.log(e);
  }
};

const decryptaes = (data) => {
  try {
    if (data === undefined) {
      throw new Error("Invalid data for decryption");
    }

    let d;
    if (typeof data !== "string") {
      d = JSON.stringify(data);
    } else {
      d = data;
    }

    const encryptedBytes = aesjs.utils.hex.toBytes(d);

    if (encryptedBytes.some(isNaN)) {
      throw new Error("Invalid data for decryption");
    }

    const aesCtr = new aesjs.ModeOfOperation.ctr(k, new aesjs.Counter(5));
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);

    if (decryptedBytes.some(isNaN)) {
      throw new Error("Invalid data after decryption");
    }

    const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
    return decryptedText;
  } catch (e) {
    console.error("Decryption error:", e);
    throw new Error("Decryption failed");
  }
};

//function to ge nerate a presignedurl of minio
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

//signup via email
exports.signup = async (req, res) => {
  // sng.setApiKey(process.env.SENDGRID_API_KEY);
  const otp = Math.floor(10000 + Math.random() * 90000);
  const { email } = await req.body;
  const newUser = new User({ email, otp });
  const oldUser = await User.findOne({ email });
  if (oldUser) {
    try {
      const otp = Math.floor(10000 + Math.random() * 90000);
      const token = jwt.sign({ email }, process.env.JWT_ACCOUNT_ACTIVATION, {
        expiresIn: "10m",
      });
      const emailData = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Hi, Your Otp for Grovyo",
        html: `<p>Your OTP is</p> <h1>${otp}</h1> and <br/>${token}
      <hr/>
      <p>This email may contain sensitive information<p/>
      <p>${process.env.CLIENT_URL}<p/>`,
      };
      oldUser.otp = otp;
      await oldUser.save();
      sng.send(emailData);
      return res.status(200).json({ message: "User exists but Otp Sent" });
    } catch (err) {
      res.status(400).json({ message: "Access Denied" });
    }
  }
  try {
    const token = jwt.sign({ email }, process.env.JWT_ACCOUNT_ACTIVATION, {
      expiresIn: "10m",
    });
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Hi, Your Otp for Grovyo",
      html: `<p>Your OTP is</p> <h1>${otp}</h1> and <br/>${token}
      <hr/>
      <p>This email may contain sensitive information<p/>
      <p>${process.env.CLIENT_URL}<p/>`,
    };

    await newUser.save();
    sng.send(emailData).then(() => {
      return res
        .status(200)
        .json({ message: `Email has been sent to ${email}.` });
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

//signup via mobile
exports.signupmobile = async (req, res) => {
  const { phone, loc, device, contacts, type, time, token } = req.body;

  try {
    const user = await User.findOne({ phone: phone });

    if (user) {
      const a = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60 * 24
      );
      const newEditCount = {
        time: time,
        deviceinfo: device,
        type: type,
        location: loc,
      };
      await User.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
          $addToSet: { contacts: contacts },
          $set: { notificationtoken: token },
        }
      );
      res.status(200).json({
        message: "user exists signup via mobile success",
        user,
        userexists: true,
        a,
        success: true,
      });
    } else if (!user) {
      res.status(200).json({
        message: "signup via mobile success",
        userexists: false,
        success: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//signup for delivery
exports.signupmobiledelivery = async (req, res) => {
  const { phone, loc, device, contacts, type, time, token } = req.body;

  try {
    const user = await Deluser.findOne({ phone: phone });

    if (user) {
      let dp = [];
      for (let i = 0; i < user.photos?.length; i++) {
        if (user?.photos[i].type === "dp") {
          const d = await generatePresignedUrl(
            "documents",
            user.photos[i].content.toString(),
            60 * 60
          );
          dp.push(d);
        }
      }

      const newEditCount = {
        time: time,
        deviceinfo: device,
        type: type,
        location: loc,
      };
      await Deluser.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
          $addToSet: { contacts: contacts },
          $set: { notificationtoken: token },
        }
      );
      res.status(200).json({
        message: "user exists signup via mobile success",
        user,
        userexists: true,
        a: dp[0],
        success: true,
      });
    } else if (!user) {
      res.status(200).json({
        message: "signup via mobile success",
        userexists: false,
        success: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.signout = async (req, res) => {
  const { id } = req.params;
  const { time, device, type, loc } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const newEditCount = {
        time: time,
        deviceinfo: device,
        type: type,
        location: loc,
      };
      await User.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
          $set: { notificationtoken: "" },
        }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

exports.verify = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }
    if (user.otp === otp) {
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.cookie("t", token, { expire: new Date() + 9999 });
      const { _id, email, role } = user;
      return res.status(200).json({ token, user: { email, role, _id } });
    } else {
      return res.status(400).json({ message: "Invalid Otp" });
    }
  } catch (err) {
    res.status(400).json({ message: "Access Denied" });
  }
};

exports.filldetails = async (req, res, next) => {
  const { originalname, buffer } = req.file;
  const { fullname, username, phone, DOB } = req.body;
  const { userId } = req.params;
  const uuidString = uuid();
  try {
    // Save image to Minio
    const bucketName = "images";
    const objectName = `${Date.now()}_${uuidString}_${originalname}`;
    await minioClient.putObject(bucketName, objectName, buffer, buffer.length);

    const image = await User.findByIdAndUpdate(
      { _id: userId },
      {
        $set: {
          fullname: fullname,
          profilepic: objectName,
          username: username,
          phone: phone,
          DOB: DOB,
        },
      },
      { new: true }
    );

    res.status(200).json(image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.filldetailsphone = async (req, res) => {
  const { originalname, buffer } = req.file;
  const { fullname, username, gender, DOB } = req.body;
  const { userId } = req.params;
  const uuidString = uuid();
  const user = await User.findById(userId);

  if (userId === user._id.toString()) {
    try {
      // Save image to Minio
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${originalname}`;
      const updated = await User.findByIdAndUpdate(
        { _id: userId },
        {
          $set: {
            fullname: fullname,
            profilepic: objectName,
            username: username,
            gender: gender,
            DOB: DOB,
          },
        },
        { new: true }
      );
      await minioClient.putObject(
        bucketName,
        objectName,
        buffer,
        buffer.length
      );

      {
        /*  console.log(user.profilepic);
      const a = await generatePresignedUrl(
        "images",
        user.profilepic,
        60 * 60 * 24
      );*/
      }
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  } else {
    res.status(500).json({ message: "Id mismatch" });
  }
};

exports.returnuser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user) {
      const dp = await generatePresignedUrl(
        "images",
        user.profilepic,
        60 * 60 * 24
      );
      res.status(200).json({ user, dp, success: true });
    } else {
      res.status(404).json({ message: e.message, success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.interests = async (req, res) => {
  try {
    const userId = req.params.userId;
    const interest = req.body.data;
    await User.findByIdAndUpdate(
      { _id: userId },
      { $addToSet: { interest: interest } },
      { new: true }
    )
      .then((updatedUser) => {
        res.json(updatedUser);
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({ error: "Failed to update user interests" });
      });
  } catch (err) {
    return res.status(400).json({
      error: errorHandler(err),
    });
  }
};

exports.test = async (req, res) => {
  console.log(req.file, "file", req.files);
  console.log(req.body.name, "body");
};

//admin login
exports.adminlogin = async (req, res) => {
  const { number } = req.body;
  try {
    const user = await User.findOne({ phone: number });
    if (user) {
      res.status(200).json({
        message: "user exists signup via mobile success",
        user,
        userexists: true,
      });
    }
    if (!user) {
      const user = new User({ phone: number, role: "admin" });

      await user.save();
      res.status(200).json({
        message: "signup via mobile success",
        user,
        userexists: false,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.checkusername = async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username });
  try {
    if (user) {
      return res.status(200).json({
        message: "username exists",
        userexists: true,
        success: true,
      });
    } else {
      return res.status(200).json({
        message: "username does not exist",
        userexists: false,
        success: true,
      });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

//creating a new account mobile
exports.createnewaccount = async (req, res) => {
  const {
    fullname,
    gender,
    username,
    number,
    bio,
    image,
    interest,
    dob,
    loc,
    device,
    contacts,
    type,
    time,
    token,
  } = req.body;
  const uuidString = uuid();

  const interestsArray = [interest];
  const interestsString = interestsArray[0];
  const individualInterests = interestsString.split(",");

  const contactsfinal = JSON.parse(contacts);

  function generateRandomCode() {
    let code = "";
    for (let i = 0; i < 6; i++) {
      const digit = Math.floor(Math.random() * 9) + 1;
      code += digit.toString();
    }
    return code;
  }

  const randomCode = generateRandomCode();
  //encrypted secret code
  const ecrndmcode = encryptaes(randomCode);

  const newEditCount = {
    time: time,
    deviceinfo: device,
    type: type,
    location: loc,
  };

  if (req.file) {
    try {
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${req.file.originalname}`;
      await sharp(req.file.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, objectName, data);
        })
        .catch((err) => {
          console.log(err.message, "-Sharp error");
        });

      const user = new User({
        fullname: fullname,
        username: username,
        phone: number,
        profilepic: objectName,
        desc: bio,
        interest: individualInterests,
        gender: gender,
        DOB: dob,
      });
      await user.save();
      await User.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
          $addToSet: { contacts: contactsfinal },
          $set: { notificationtoken: token },
        }
      );

      //joining community by default of Grovyo
      let comId = "65a66eb9e953a4573e6c8f44";
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
      let pic = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );

      res.status(200).json({
        message: "Account created successfully",
        user,
        pic,
        success: true,
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        message: "Account creation failed",
        success: false,
      });
    }
  } else {
    try {
      const user = new User({
        fullname: fullname,
        username: username,
        phone: number,
        profilepic: image,
        desc: bio,
        interest: individualInterests,
        gender: gender,
        DOB: dob,
      });
      await user.save();
      await User.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
          $addToSet: { contacts: contactsfinal },
          $set: { notificationtoken: token },
        }
      );
      let pic = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );

      //joining community by default of Grovyo
      let comId = "65a66eb9e953a4573e6c8f44";
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

      res.status(200).json({
        message: "Account created successfully",
        user,
        pic,
        success: true,
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        message: "Account creation failed",
        success: false,
      });
    }
  }
};

exports.createnewaccountweb = async (req, res) => {
  const {
    fullname,
    gender,
    username,
    number,
    bio,
    image,
    interest,
    dob,
    loc,
    device,
    type,
    time,
  } = req.body;
  const uuidString = uuid();

  const interestsArray = [interest];
  const interestsString = interestsArray[0];
  const individualInterests = interestsString.split(",");

  const newEditCount = {
    time: time,
    deviceinfo: device,
    type: type,
    location: loc,
  };

  if (req.file) {
    try {
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${req.file.originalname}`;
      await sharp(req.file.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, objectName, data);
        })
        .catch((err) => {
          console.log(err.message, "-Sharp error");
        });

      const user = new User({
        fullname: fullname,
        username: username,
        phone: number,
        profilepic: objectName,
        desc: bio,
        interest: individualInterests,
        gender: gender,
        DOB: dob,
      });
      await user.save();
      await User.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
        }
      );
      let pic = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );

      res.status(200).json({
        message: "Account created successfully",
        user,
        pic,
        success: true,
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        message: "Account creation failed",
        success: false,
      });
    }
  } else {
    try {
      const user = new User({
        fullname: fullname,
        username: username,
        phone: number,
        profilepic: image,
        desc: bio,
        interest: individualInterests,
        gender: gender,
        DOB: dob,
      });
      await user.save();
      await User.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
        }
      );
      let pic = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );

      res.status(200).json({
        message: "Account created successfully",
        user,
        pic,
        success: true,
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        message: "Account creation failed",
        success: false,
      });
    }
  }
};

exports.createnewaccountemail = async (req, res) => {
  const {
    fullname,
    gender,
    username,
    email,
    pass,
    bio,
    image,
    interest,
    dob,
    loc,
    device,
    contacts,
    type,
    time,
    token,
  } = req.body;
  const uuidString = uuid();

  const interestsArray = [interest];
  const interestsString = interestsArray[0];

  const individualInterests = interestsString.split(",");
  const newEditCount = {
    time: time,
    deviceinfo: device,
    type: type,
    location: loc,
  };

  //encrypting password
  const encrptedpass = encryptaes(pass);

  if (req.file) {
    try {
      const bucketName = "images";
      const objectName = `${Date.now()}_${uuidString}_${req.file.originalname}`;
      await sharp(req.file.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, objectName, data);
        })
        .catch((err) => {
          console.log(err.message, "-Sharp error");
        });

      const user = new User({
        fullname: fullname,
        username: username,
        email: email,
        passw: encrptedpass,
        profilepic: objectName,
        desc: bio,
        interest: individualInterests,
        gender: gender,
        DOB: dob,
      });
      await user.save();
      await User.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
          $addToSet: { contacts: contacts },
          $set: { notificationtoken: token },
        }
      );
      let pic = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      //joining community by default of Grovyo
      let comId = "65a66eb9e953a4573e6c8f44";
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
      res.status(200).json({
        message: "Account created successfully",
        user,
        pic,
        success: true,
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        message: "Account creation failed",
        success: false,
      });
    }
  } else {
    try {
      const user = new User({
        fullname: fullname,
        username: username,
        email: email,
        passw: encrptedpass,
        profilepic: image,
        desc: bio,
        interest: individualInterests,
        gender: gender,
        DOB: dob,
      });
      await user.save();
      await User.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
          $addToSet: { contacts: contacts },
          $set: { notificationtoken: token },
        }
      );
      let pic = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      //joining community by default of Grovyo
      let comId = "65a66eb9e953a4573e6c8f44";
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

      res.status(200).json({
        message: "Account created successfully",
        user,
        pic,
        success: true,
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        message: "Account creation failed",
        success: false,
      });
    }
  }
};

//for checking the user via email
exports.checkemail = async (req, res) => {
  const { email, password, time, type, contacts, loc, device, token } =
    req.body;

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      res.status(203).json({
        message: "No user found with that email",
        success: true,
        userexists: false,
      });
    } else {
      const pass = decryptaes(user?.passw) || null;
      if (password === pass.toString()) {
        let pic = await generatePresignedUrl(
          "images",
          user.profilepic.toString(),
          60 * 60
        );

        const newEditCount = {
          time: time,
          deviceinfo: device,
          type: type,
          location: loc,
        };
        await User.updateOne(
          { _id: user._id },
          {
            $push: { activity: newEditCount },
            $addToSet: { contacts: contacts },
            $set: { notificationtoken: token },
          }
        );
        res.status(200).json({
          user,
          pic,
          success: true,
          userexists: true,
        });
      } else {
        res.status(201).json({
          message: "Incorrect password",
          success: false,
          userexists: true,
        });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: "Something went wrong...",
      success: false,
    });
  }
};

exports.getdetails = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(203).json({ message: "User not found", success: true });
    } else {
      let pic = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      res.status(200).json({ user, pic, success: true });
    }
  } catch (e) {
    res.status(500).json({
      message: "Something went wrong...",
      success: false,
    });
  }
};

exports.postdetails = async (req, res) => {
  const { id } = req.params;
  const { device, lastlogin } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(203).json({ message: "User not found", success: true });
    } else {
      await User.updateOne(
        { _id: id },
        { $push: { lastlogin: lastlogin, device: device } }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: "Something went wrong...",
      success: false,
    });
  }
};

exports.updatedetails = async (req, res) => {
  const { id } = req.params;
  const { device, time, type, loc } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(203).json({ message: "User not found", success: true });
    } else {
      const newEditCount = {
        time: time,
        deviceinfo: device,
        type: type,
        location: loc,
      };
      await User.updateOne(
        { _id: user._id },
        {
          $push: { activity: newEditCount },
        }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: "Something went wrong...",
      success: false,
    });
  }
};

exports.screentrack = async (req, res) => {
  const { id } = req.params;
  console.log(req.body);
  try {
    console.log("hit");
  } catch (e) {
    console.log(e);
  }
};

exports.appcheck = async (req, res) => {
  try {
    const userAgent = req.headers["user-agent"];
    if (userAgent.includes("Mobile")) {
      const customUrlScheme = "grovyo://app/library";
      res.redirect(customUrlScheme);
    } else {
      res.redirect(
        "https://play.google.com/store/apps/details?id=com.grovyomain"
      );
    }
  } catch (e) {
    console.log(e);
  }
};

//update user account
exports.updateaccount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullname,
      username,
      mobile,
      email,
      bio,
      social,
      socialtype,
      time,
      device,
      type,
      loc,
      snap,
      insta,
      x,
      yt,
      linkdin,
    } = req.body;
    const user = await User.findById(id);
    const uuidString = uuid();

    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      if (req.file) {
        const bucketName = "images";
        const objectName = `${Date.now()}_${uuidString}_${
          req.file.originalname
        }`;
        await sharp(req.file.buffer)
          .jpeg({ quality: 50 })
          .toBuffer()
          .then(async (data) => {
            await minioClient.putObject(bucketName, objectName, data);
          })
          .catch((err) => {
            console.log(err.message, "-Sharp error");
          });

        const newEditCount = {
          time: time,
          deviceinfo: device,
          type: type,
          location: loc,
        };
        await User.updateOne(
          { _id: id },
          {
            $set: {
              fullname,
              username: username,
              phone: mobile,
              email: email,
              desc: bio,
              profilepic: objectName,
              snap: snap,
              x: x,
              insta: insta,
              yt: yt,
              linkdin: linkdin,
            },
            $push: {
              links: social,
              linkstype: socialtype,
              activity: newEditCount,
            },
          }
        );
        const dp = await generatePresignedUrl(
          "images",
          objectName,
          60 * 60 * 24
        );

        res.status(200).json({ dp, success: true });
      } else {
        const newEditCount = {
          time: time,
          deviceinfo: device,
          type: type,
          location: loc,
        };

        await User.updateOne(
          { _id: id },
          {
            $set: {
              fullname,
              username: username,
              phone: mobile,
              email: email,
              desc: bio,
            },
            $push: {
              links: social,
              linkstype: socialtype,
              activity: newEditCount,
            },
          }
        );
        res.status(200).json({ success: true });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//block and unblock people
exports.blockpeople = async (req, res) => {
  try {
    const { id } = req.params;
    const { userid, time } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const userblock = await User.findById(userid);
      if (!userblock) {
        res
          .status(404)
          .json({ message: "No blockable User found", success: false });
      } else {
        let isBlocked = false;
        for (const blockedUser of user.blockedpeople) {
          if (blockedUser.id.toString() === userid) {
            isBlocked = true;
            break;
          }
        }

        if (isBlocked) {
          await User.updateOne(
            { _id: id },
            {
              $pull: {
                blockedpeople: { id: userid },
              },
            }
          );
          res.status(200).json({ success: true });
        } else {
          const block = {
            id: userid,
            time: time,
          };
          await User.updateOne(
            { _id: id },
            {
              $addToSet: {
                blockedpeople: block,
              },
            }
          );
          res.status(200).json({ success: true });
        }
      }
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//fetch block list
exports.fetchblocklist = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate({
      path: "blockedpeople.id",
      select: "fullname username profilepic",
    });
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      let dp = [];
      for (let i = 0; i < user.blockedpeople.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          user.blockedpeople[i].id.profilepic.toString(),
          60 * 60 * 24
        );
        dp.push(a);
      }

      res
        .status(200)
        .json({ blocklist: user.blockedpeople, dp, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//find suggestions on the basis of contacts
exports.contactsuggestions = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    let contactNumbers = [];

    for (let i = 0; i < user?.contacts[0]?.length; i++) {
      for (let j = 0; j < 4; j++) {
        const phoneNumber = user?.contacts[0][i]?.phoneNumbers[j]?.number;

        if (phoneNumber !== undefined) {
          contactNumbers.push(phoneNumber);
        }
      }
    }

    const cleanedContactNumbers = contactNumbers.map((phone) =>
      phone.replace(/[^0-9]/g, "")
    );
    const contacts = await User.find({ phone: { $in: cleanedContactNumbers } });
    let data = [];

    if (contacts?.length > 0) {
      for (let i = 0; i < contacts?.length; i++) {
        const isBlocked =
          contacts[i].blockedpeople.find((f) => f.id.toString() === id) ||
          user.blockedpeople.find(
            (f) => f.id.toString() === contacts[i]._id.toString()
          );

        if (!isBlocked) {
          let reqExists = false;

          const checkMessageRequests = (reqList) => {
            reqList.forEach((req) => {
              if (req.id.toString() === contacts[i]._id.toString()) {
                reqExists = true;
              }
            });
          };

          checkMessageRequests(user.messagerequests);
          checkMessageRequests(user.msgrequestsent);
          checkMessageRequests(contacts[i].msgrequestsent);
          checkMessageRequests(contacts[i].messagerequests);

          if (!reqExists) {
            let profilePic = await generatePresignedUrl(
              "images",
              contacts[i].profilepic.toString(),
              60 * 60
            );

            let suggestionData = {
              id: contacts[i]._id,
              name: contacts[i].fullname,
              uname: contacts[i].username,
              pic: profilePic,
              isverified: contacts[i].isverified,
            };

            let chatExists = false;

            if (user?.conversations?.length > 0) {
              chatExists = user.conversations.some((convId) =>
                contacts[i].conversations.includes(convId)
              );
            }

            if (!chatExists) {
              data.push(suggestionData);
            }
          }
        }
      }
    }

    return res.status(200).json({ data, success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message, success: false });
  }
};
//check for latest conversations and fetch them in chats
exports.checkconversations = async (req, res) => {
  try {
    const { id } = req.params;
    const { convlist } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      let conv = [];
      let msgs = [];
      let reqcount = user?.messagerequests?.length;
      let blockedby = "";
      let isblocked = false;
      if (user?.conversations?.length > 0) {
        for (let i = 0; i < user.conversations.length; i++) {
          const convs = await Conversation.findById(
            user.conversations[i]
          ).populate(
            "members",
            "fullname username profilepic isverified blockedpeople"
          );

          if (convlist[i] !== user.conversations[i].toString()) {
            //find latest message

            const msg = await Message.find({ conversationId: convs?._id })
              .limit(1)
              .sort({ createdAt: -1 });
            for (let j = 0; j < convs?.members?.length; j++) {
              if (id !== convs?.members[j]?._id?.toString()) {
                let pi = await generatePresignedUrl(
                  "images",
                  convs?.members[j]?.profilepic?.toString(),
                  60 * 60
                );

                const blockedPeopleIds =
                  user?.blockedpeople?.map((item) => item.id?.toString()) || [];

                const isBlocked = blockedPeopleIds.some((blockedId) => {
                  return convs.members.some((member) => {
                    if (blockedId === member?._id?.toString()) {
                      blockedby = member?._id?.toString();
                      isblocked = true;
                    }
                  });
                });

                let detail = {
                  convid: convs?._id,
                  id: convs?.members[j]?._id,
                  fullname: convs?.members[j]?.fullname,
                  username: convs?.members[j]?.username,
                  isverified: convs?.members[j]?.isverified,
                  pic: pi,
                  msgs: msg,
                  isblocked: isblocked,
                  blockedby: blockedby,
                };
                conv.push(detail);
              }
            }
          } else {
            const blockedPeopleIds =
              user?.blockedpeople?.map((item) => item.id?.toString()) || [];

            const isBlocked = blockedPeopleIds.some((blockedId) => {
              return convs.members.some((member) => {
                if (blockedId === member._id?.toString()) {
                  isblocked = true;
                  blockedby = member._id?.toString();
                }
              });
            });

            const msg = await Message.find({ conversationId: convs?._id })
              .limit(1)
              .sort({ createdAt: -1 });

            let detail = {
              convid: convs?._id,
              isblocked: isblocked,
              msgs: msg,
              blockedby: blockedby,
            };
            msgs.push(detail);
          }
        }
        if (conv?.length > 0) {
          res
            .status(200)
            .json({ conv, reqcount, uptodate: false, success: true });
        } else {
          res
            .status(200)
            .json({ msgs, reqcount, uptodate: true, success: true });
        }
      } else {
        res.status(200).json({ reqcount, uptodate: true, success: true });
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//new check for latest conversations and fetch them in chats
exports.checkconversationsnew = async (req, res) => {
  try {
    const { id } = req.params;
    const { convlist } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      let reqcount = user?.messagerequests?.length;

      if (convlist.length > 0) {
        if (user?.conversations?.length > 0) {
          function areArraysEqual(array1, array2) {
            let isUpdated = true;
            const mismatchedElements = [];

            for (const element2 of array1) {
              if (!array2.includes(element2)) {
                isUpdated = false;
                mismatchedElements.push(element2);
              }
            }

            return { isUpdated, mismatchedElements };
          }

          const result = areArraysEqual(user.conversations, convlist);

          //function gives out actual convs or msgs
          const newgetconv = async ({ mismatch }) => {
            if (!mismatch) {
              async function processConversation(convId) {
                const convs = await Conversation.findById(convId).populate(
                  "members",
                  "fullname username profilepic isverified blockedpeople"
                );

                if (!convs) return null;

                const msg = await Message.find({
                  conversationId: convs?._id,
                  status: "active",
                  hidden: { $nin: [user._id.toString()] },
                  deletedfor: { $nin: [user._id] },
                })
                  .limit(1)
                  .sort({ createdAt: -1 });

                const blockedPeopleIds =
                  user?.blockedpeople?.map((item) => item.id?.toString()) || [];
                const results = [];

                for (let j = 0; j < convs?.members?.length; j++) {
                  if (id !== convs?.members[j]?._id?.toString()) {
                    let isblocked = false;
                    let blockedby;

                    let pi = await generatePresignedUrl(
                      "images",
                      convs?.members[j]?.profilepic?.toString(),
                      60 * 60
                    );

                    blockedPeopleIds.some((blockedId) => {
                      return convs.members.some((member) => {
                        if (blockedId === member._id?.toString()) {
                          blockedby = member._id?.toString();
                          isblocked = true;
                        }
                      });
                    });

                    let detail = {
                      convid: convs?._id,
                      id: convs?.members[j]?._id,
                      fullname: convs?.members[j]?.fullname,
                      username: convs?.members[j]?.username,
                      isverified: convs?.members[j]?.isverified,
                      pic: pi,
                      msgs: msg,
                      isblocked: isblocked,
                      blockedby: blockedby,
                    };

                    results.push(detail);
                  }
                }

                return results;
              }

              async function handleResult(result) {
                const promises = [];

                if (result?.mismatchedElements?.length > 0) {
                  for (const e of result?.mismatchedElements) {
                    promises.push(processConversation(e, result?.isUpdated));
                  }
                } else {
                  for (const e of convlist) {
                    promises.push(processConversation(e, result?.isUpdated));
                  }
                }

                const results = await Promise.all(promises);
                const conv = results.flat();

                //sorting latest conv first
                conv.sort((c1, c2) => {
                  const timeC1 = c1?.msgs[0]?.createdAt || 0;
                  const timeC2 = c2?.msgs[0]?.createdAt || 0;
                  return timeC2 - timeC1;
                });
                const response = {
                  conv,
                  reqcount,
                  uptodate: false,
                  success: true,
                };

                res.status(200).json(response);
              }

              handleResult(result);
            } else {
              async function processConversation(convId) {
                const convs = await Conversation.findById(convId).populate(
                  "members",
                  "fullname username profilepic isverified blockedpeople"
                );

                if (!convs) return null;

                const msg = await Message.find({
                  conversationId: convs?._id,
                  status: "active",
                  hidden: { $nin: [user._id.toString()] },
                  deletedfor: { $nin: [user._id] },
                })
                  .limit(1)
                  .sort({ createdAt: -1 });

                const blockedPeopleIds =
                  user?.blockedpeople?.map((item) => item.id?.toString()) || [];
                const results = [];

                for (let j = 0; j < convs?.members?.length; j++) {
                  if (id !== convs?.members[j]?._id?.toString()) {
                    let isblocked = false;
                    let blockedby;

                    let pi = await generatePresignedUrl(
                      "images",
                      convs?.members[j]?.profilepic?.toString(),
                      60 * 60
                    );

                    blockedPeopleIds.some((blockedId) => {
                      return convs.members.some((member) => {
                        if (blockedId === member?._id?.toString()) {
                          blockedby = member?._id?.toString();
                          isblocked = true;
                        }
                      });
                    });

                    let detail = {
                      convid: convs?._id,
                      id: convs?.members[j]?._id,
                      fullname: convs?.members[j]?._fullname,
                      username: convs?.members[j]?.username,
                      isverified: convs?.members[j]?.isverified,
                      pic: pi,
                      msgs: msg,
                      isblocked: isblocked,
                      blockedby: blockedby,
                    };

                    results.push(detail);
                  }
                }

                return results;
              }

              async function handleResult(result) {
                const msgs = [];
                const convPromises = [];

                if (result?.mismatchedElements?.length > 0) {
                  for (const e of result?.mismatchedElements) {
                    for (let i = 0; i < user.conversations.length; i++) {
                      if (e === user.conversations[i].toString()) {
                        convPromises.push(
                          processConversation(user.conversations[i])
                        );
                      }
                    }
                  }
                } else {
                  for (const e of convlist) {
                    for (let i = 0; i < user.conversations.length; i++) {
                      if (e === user.conversations[i].toString()) {
                        convPromises.push(
                          processConversation(user.conversations[i])
                        );
                      }
                    }
                  }
                }

                const convResults = await Promise.all(convPromises);

                for (const convResult of convResults) {
                  if (convResult) {
                    msgs.push(...convResult);
                  }
                }

                res
                  .status(200)
                  .json({ msgs, reqcount, uptodate: true, success: true });
              }

              handleResult(result);
            }
          };

          //checking if there are any mismatched elements
          if (result?.mismatchedElements?.length > 0) {
            newgetconv({ mismatch: result?.isUpdated });
          } else {
            newgetconv({ mismatch: result?.isUpdated });
          }
        } else {
          res.status(200).json({ reqcount, uptodate: true, success: true });
        }
      } else {
        //function gives out actual convs or msgs

        async function processConversation(convId) {
          const convs = await Conversation.findById(convId).populate(
            "members",
            "fullname username profilepic isverified blockedpeople"
          );

          if (!convs) return null;

          const msg = await Message.find({ conversationId: convs?._id })
            .limit(1)
            .sort({ createdAt: -1 });

          const blockedPeopleIds =
            user?.blockedpeople?.map((item) => item.id?.toString()) || [];
          const results = [];

          for (let j = 0; j < convs?.members?.length; j++) {
            if (id !== convs?.members[j]?._id?.toString()) {
              let isblocked = false;
              let blockedby;

              let pi = await generatePresignedUrl(
                "images",
                convs?.members[j]?.profilepic?.toString(),
                60 * 60
              );

              blockedPeopleIds.some((blockedId) => {
                return convs.members.some((member) => {
                  if (blockedId === member._id?.toString()) {
                    blockedby = member._id?.toString();
                    isblocked = true;
                  }
                });
              });

              let detail = {
                convid: convs?._id,
                id: convs?.members[j]?._id,
                fullname: convs?.members[j]?.fullname,
                username: convs?.members[j]?.username,
                isverified: convs?.members[j]?.isverified,
                pic: pi,
                msgs: msg,
                isblocked: isblocked,
                blockedby: blockedby,
              };

              results.push(detail);
            }
          }

          return results;
        }

        async function handleResult() {
          const promises = [];

          if (user?.conversations?.length > 0) {
            for (const e of user?.conversations) {
              promises.push(processConversation(e));
            }
          }

          const results = await Promise.all(promises);
          console.log("worl");
          const conv = results.flat();
          conv.sort((c1, c2) => {
            const timeC1 = c1?.msgs[0]?.createdAt || 0;
            const timeC2 = c2?.msgs[0]?.createdAt || 0;
            return timeC2 - timeC1;
          });
          const response = {
            conv,
            reqcount,
            uptodate: false,
            success: true,
          };

          res.status(200).json(response);
        }

        handleResult();
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//check for latest message of a user chats
exports.checkLastConvMessage = async (req, res) => {
  const { convId, userId } = req.params;
  const { timestamp, mesId } = req.body;

  try {
    const user = await User.findById(userId);
    const conv = await Conversation.findById(convId);

    const messages = await Message.find({
      conversationId: { $eq: conv?._id },
      createdAt: { $gt: timestamp },
      mesId: { $ne: mesId },
    })
      .sort({ createdAt: -1 })
      .populate("sender", "profilepic fullname isverified");

    const reversed = messages.reverse();
    const dps = [];

    if (reversed?.length > 0) {
      for (let i = 0; i < reversed.length; i++) {
        if (reversed[i].sender === null) {
          reversed[i].remove();
        }

        const a = await generatePresignedUrl(
          "images",
          reversed[i].sender.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
      }
      if (!conv) {
        res.status(404).json({
          message: "No conversation found",
          success: false,
          nodata: true,
        });
      } else if (!user) {
        res
          .status(404)
          .json({ message: "No User found", success: false, nodata: true });
      } else {
        res.status(200).json({
          success: true,
          reversed,
          dps,
          nodata: false,
        });
      }
    } else {
      res.status(200).json({ success: true, nodata: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//check for latest message of a user chats
exports.checkLastConvMessagenew = async (req, res) => {
  const { convId, userId } = req.params;
  const { timestamp, mesId } = req.body;

  try {
    const user = await User.findById(userId);
    const conv = await Conversation.findById(convId);

    const messages = await Message.find({
      conversationId: { $eq: conv?._id },
      createdAt: { $gt: timestamp },
      mesId: { $ne: mesId },
    })
      .sort({ createdAt: -1 })
      .populate("sender", "profilepic fullname isverified");

    const reversed = messages.reverse();
    const dps = [];

    if (reversed?.length > 0) {
      for (let i = 0; i < reversed.length; i++) {
        if (reversed[i].sender === null) {
          reversed[i].remove();
        }

        const a = await generatePresignedUrl(
          "images",
          reversed[i].sender.profilepic.toString(),
          60 * 60
        );
        dps.push(a);
      }
      if (!conv) {
        res.status(404).json({
          message: "No conversation found",
          success: false,
          nodata: true,
        });
      } else if (!user) {
        res
          .status(404)
          .json({ message: "No User found", success: false, nodata: true });
      } else {
        res.status(200).json({
          success: true,
          reversed,
          dps,
          nodata: false,
        });
      }
    } else {
      res.status(200).json({ success: true, nodata: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//update notification token
exports.updatenotification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { token } = req.body;
    const user = await User.findById(userId);
    if (user) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { notificationtoken: token },
        }
      );
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//add bank
exports.addbank = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    const { acc, ifsc, name } = req.body;
    if (user) {
      const bank = {
        accno: acc,
        ifsc: ifsc,
        name: name,
      };
      await User.updateOne(
        { _id: id },
        {
          $set: { bank: bank },
        }
      );
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//for chats new

//fetch convs
exports.fetchconvs = async (req, res) => {
  try {
    const { id, convId, otherid } = req.params;
    const user = await User.findById(id);
    const otherperson = await User.findById(otherid);
    if (!user || !otherperson) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
    //blocking/unblocking status
    //am i blocked
    let isblocked = false;
    otherperson.blockedpeople.forEach((p) => {
      if (p?.id?.toString() === user._id.toString()) {
        isblocked = true;
      }
    });

    //can i block
    let canblock = false;
    user.blockedpeople.forEach((p) => {
      if (p?.id?.toString() === otherperson._id.toString()) {
        canblock = true;
      }
    });

    const msg = await Message.find({
      conversationId: convId,
      // status: "active",
      deletedfor: { $nin: [user._id.toString()] },
      hidden: { $nin: [user._id.toString()] },
    })
      .limit(20)
      .sort({ createdAt: -1 })
      .populate("sender", "profilepic fullname isverified");

    let messages = [];

    for (let i = 0; i < msg?.length; i++) {
      if (
        msg[i].typ === "image" ||
        msg[i].typ === "video" ||
        msg[i].typ === "doc" ||
        msg[i].typ === "glimpse"
      ) {
        const url = await generatePresignedUrl(
          "messages",
          msg[i]?.content?.uri?.toString(),
          60 * 60
        );

        messages.push({ ...msg[i].toObject(), url });
      } else {
        messages.push(msg[i].toObject());
      }
    }

    messages = messages.reverse();
    const msgids = messages.map((message) => message.mesId);
    await Message.updateMany(
      { mesId: { $in: msgids } },
      { $addToSet: { readby: user._id } }
    );
    if (isblocked) {
      res.status(200).json({ canblock, isblocked, success: true });
    } else {
      res.status(200).json({ canblock, isblocked, messages, success: true });
    }
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Something went wrong...", success: false });
  }
};

//send any file
exports.sendchatfile = async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);

    let pos = {};
    const uuidString = uuid();
    const bucketName = "messages";
    const objectName = `${Date.now()}_${uuidString}_${
      req.files[0].originalname
    }`;

    if (req.files[0].fieldname === "video") {
      await minioClient.putObject(
        bucketName,
        objectName,
        req.files[0].buffer
        // req.files[i].size,
        // req.files[i].mimetype
      );

      pos.uri = objectName;
      pos.type = req.files[0].mimetype;
      pos.name = data?.content?.name;
      pos.size = req.files[0].size;
    } else if (req.files[0].fieldname === "image") {
      await sharp(req.files[0].buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, objectName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });

      pos.uri = objectName;
      pos.type = req.files[0].mimetype;
      pos.name = data?.content?.name;
      pos.size = req.files[0].size;
    } else {
      await minioClient.putObject(
        bucketName,
        objectName,
        req.files[0].buffer,
        req.files[0].mimetype
      );
      pos.uri = objectName;
      pos.type = req.files[0].mimetype;
      pos.name = data?.content?.name;
      pos.size = req.files[0].size;
    }
    const message = new Message({
      text: data?.text,
      sender: data?.sender_id,
      conversationId: data?.convId,
      typ: data?.typ,
      mesId: data?.mesId,
      reply: data?.reply,
      dissapear: data?.dissapear,
      isread: data?.isread,
      sequence: data?.sequence,
      timestamp: data?.timestamp,
      content: pos,
    });
    await message.save();

    const a = await generatePresignedUrl(
      "messages",
      message?.content?.uri?.toString(),
      60 * 60
    );
    res.status(200).json({ success: true, link: a });
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//load more messages
exports.loadmorechatmsgs = async (req, res) => {
  try {
    const { id } = req.params;
    const { convId, sequence } = req.body;
    const user = await User.findById(id);

    if (user) {
      let gt = parseInt(sequence) - 1;
      let lt = gt - 10;

      const msg = await Message.find({
        conversationId: convId,
        sequence: { $gte: lt >= 1 ? lt : 1, $lte: gt },
        deletedfor: { $nin: [user._id] },
        hidden: { $nin: [user._id.toString()] },
        //status: "active",
      })
        .limit(20)
        .sort({ sequence: 1 })
        .populate("sender", "profilepic fullname isverified");

      let messages = [];

      for (let i = 0; i < msg?.length; i++) {
        if (
          msg[i].typ === "image" ||
          msg[i].typ === "video" ||
          msg[i].typ === "doc"
        ) {
          const url = await generatePresignedUrl(
            "messages",
            msg[i]?.content?.uri?.toString(),
            60 * 60
          );

          messages.push({ ...msg[i].toObject(), url });
        } else {
          messages.push(msg[i].toObject());
        }
      }

      res.status(200).json({ messages, success: true });
    } else {
      res.status(404).json({ messgae: "User not found!", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

//for deleting messsages from chats
exports.deletemessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { convId, msgIds, action } = req.body;
    const user = await User.findById(id);
    // const rec = await User.findById(recId);
    if (user) {
      if (action === "everyone") {
        await Message.updateMany(
          { mesId: { $in: msgIds }, conversationId: convId },
          { $set: { status: "deleted" } }
        );
      } else {
        await Message.updateMany(
          { mesId: { $in: msgIds }, conversationId: convId },
          { $push: { deletedfor: user._id } }
        );
      }
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found!", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

//fetch hidden conv
exports.fetchhiddenconv = async (req, res) => {
  try {
    const { id, convId } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const msg = await Message.find({
        conversationId: convId,
        status: "active",
        hidden: { $in: [user._id.toString()] },
        deletedfor: { $nin: [user._id] },
      })
        .limit(20)
        .sort({ createdAt: -1 })
        .populate("sender", "profilepic fullname isverified");

      let messages = [];

      for (let i = 0; i < msg?.length; i++) {
        if (
          msg[i].typ === "image" ||
          msg[i].typ === "video" ||
          msg[i].typ === "doc" ||
          msg[i].typ === "glimpse"
        ) {
          const url = await generatePresignedUrl(
            "messages",
            msg[i]?.content?.uri?.toString(),
            60 * 60
          );

          messages.push({ ...msg[i].toObject(), url });
        } else {
          messages.push(msg[i].toObject());
        }
      }

      messages = messages.reverse();
      res.status(200).json({ messages: messages, success: true });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//fetch more hidden conv
exports.fetchmorehiddenconv = async (req, res) => {
  try {
    const { id } = req.params;
    const { convId, sequence } = req.body;
    const user = await User.findById(id);

    if (user) {
      let gt = parseInt(sequence) - 1;
      let lt = gt - 10;
      const msg = await Message.find({
        conversationId: convId,
        status: "active",
        hidden: { $in: [user._id.toString()] },
        deletedfor: { $nin: [user._id] },
        sequence: { $gte: lt, $lte: gt },
      })
        .limit(20)
        .sort({ sequence: 1 })
        .populate("sender", "profilepic fullname isverified");

      let messages = [];

      for (let i = 0; i < msg?.length; i++) {
        if (
          msg[i].typ === "image" ||
          msg[i].typ === "video" ||
          msg[i].typ === "doc"
        ) {
          const url = await generatePresignedUrl(
            "messages",
            msg[i]?.content?.uri?.toString(),
            60 * 60
          );

          messages.push({ ...msg[i].toObject(), url });
        } else {
          messages.push(msg[i].toObject());
        }
      }

      res.status(200).json({ messages, success: true });
    } else {
      res.status(404).json({ messgae: "User not found!", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

//hide conv message
exports.hideconvmsg = async (req, res) => {
  try {
    const { id } = req.params;
    const { msgid } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      await Message.updateMany(
        { mesId: { $in: msgid } },
        { $push: { hidden: user?._id } }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//unhide conv message
exports.unhideconvmsg = async (req, res) => {
  try {
    const { id } = req.params;
    const { msgid } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      await Message.updateMany(
        { mesId: { $in: msgid } },
        { $pull: { hidden: user?._id } }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//new check for latest conversations and fetch them in chats
exports.checkconversationswork = async (req, res) => {
  try {
    const { id } = req.params;
    const { convlist } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      let results = [];
      let reqcount = user?.messagerequests?.length;
      for (let i = 0; i < user.conversations.length; i++) {
        const convs = await Conversation.findById(
          user.conversations[i]
        ).populate(
          "members",
          "fullname username profilepic isverified blockedpeople"
        );
        const msg = await Message.find({
          conversationId: convs?._id,
          status: "active",
          hidden: { $nin: [user._id.toString()] },
          deletedfor: { $nin: [user._id] },
        })
          .limit(1)
          .sort({ createdAt: -1 });
        for (let j = 0; j < convs.members.length; j++) {
          if (convs.members[j]?.toString() !== user._id.toString()) {
            let pi = await generatePresignedUrl(
              "images",
              convs?.members[j]?.profilepic?.toString(),
              60 * 60
            );
            let detail = {
              convid: convs?._id,
              id: convs?.members[j]?._id,
              fullname: convs?.members[j]?.fullname,
              username: convs?.members[j]?.username,
              isverified: convs?.members[j]?.isverified,
              pic: pi,
              msgs: msg,
            };
            console.log(detail);
            results.push(detail);
          }
        }
      }

      const conv = results.flat();

      //sorting latest conv first
      conv.sort((c1, c2) => {
        const timeC1 = c1?.msgs[0]?.createdAt || 0;
        const timeC2 = c2?.msgs[0]?.createdAt || 0;
        return timeC2 - timeC1;
      });
      const response = {
        conv,
        reqcount,
        success: true,
      };

      res.status(200).json(response);
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//magic code
exports.magiccode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const check = await User.findOne({ email: email });

    if (check) {
      const usercode = decryptaes(check.secretcode.toString());

      if (code === usercode) {
        res.status(200).json({ success: true });
      } else {
        res.status(203).json({ success: false, message: "Invalid code" });
      }
    } else {
      res.status(404).json({ success: false, message: "User not found!" });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//password change
exports.changepass = async (req, res) => {
  try {
    const { email, pass } = req.body;
    const check = await User.findOne({ email: email });
    if (check) {
      const givepass = encryptaes(pass);
      await User.updateOne(
        { _id: check._id },
        { $set: { secretcode: givepass } }
      );
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "User not found!" });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//reading bulk conv msgs
exports.readconvs = async (req, res) => {
  try {
    const { id } = req.params;
    const { msgids } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false });
    } else {
      await Message.updateMany(
        { mesId: { $in: msgids } },
        { $addToSet: { readby: user._id } }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//for muting and unmuting
exports.muting = async (req, res) => {
  try {
    const { id, convId } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found!" });
    } else {
      const exists = user.muted.includes(convId);

      if (exists) {
        await User.updateOne({ _id: user._id }, { $pull: { muted: convId } });
      } else {
        await User.updateOne(
          { _id: user._id },
          { $addToSet: { muted: convId } }
        );
      }
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//checking for if passcode exists
exports.passexist = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      if (user.passcode) {
        res.status(200).json({ success: true, exists: true });
      } else {
        res.status(200).json({ success: true, exists: false });
      }
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//entering for new passcode
exports.newpasscode = async (req, res) => {
  try {
    const { id } = req.params;
    const { pass } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      await User.updateOne({ _id: user._id }, { $set: { passcode: pass } });
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//checking if passcode is correc
exports.ispasscorrect = async (req, res) => {
  try {
    const { id } = req.params;
    const { pass } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      if (user.passcode === pass) {
        res.status(200).json({ success: true, correct: true });
      } else {
        res.status(200).json({ success: true, correct: false });
      }
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//update notification token for delivery
exports.updatenotificationdel = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.body;
    const user = await Deluser.findById(id);
    if (user) {
      await Deluser.updateOne(
        { _id: user._id },
        {
          $set: { notificationtoken: token },
        }
      );
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//for deleting messsages from chats
exports.deletemessagestopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { topicId, msgIds, action } = req.body;
    const user = await User.findById(id);
    if (user) {
      if (action === "everyone") {
        await Message.updateMany(
          { mesId: { $in: msgIds }, topicId: topicId },
          { $set: { status: "deleted" } }
        );
      } else {
        await Message.updateMany(
          { mesId: { $in: msgIds }, topicId: topicId },
          { $push: { deletedfor: user._id } }
        );
      }
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "User not found!", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};
