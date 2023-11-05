const User = require("../models/userAuth");
const jwt = require("jsonwebtoken");
const sng = require("@sendgrid/mail");
const { errorHandler } = require("../helpers/dbErrorHandler");
const Minio = require("minio");
const Test = require("../models/test");
const uuid = require("uuid").v4;
const sharp = require("sharp");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.site",

  useSSL: true,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});

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
  sng.setApiKey(process.env.SENDGRID_API_KEY);
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

exports.gettest = async (req, res) => {
  const { id } = req.params;
  try {
    // Find the image metadata in MongoDB
    const image = await Test.findById(id);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Get image file from Minio
    const [bucketName, objectName] = image.location.split("/");
    const stream = await minioClient.getObject(bucketName, objectName);

    // Set response headers
    res.setHeader("Content-Type", stream.headers["content-type"]);
    res.setHeader("Content-Length", stream.headers["content-length"]);
    res.setHeader("Content-Disposition", `inline; filename="${image.name}"`);

    // Pipe the file stream to the response
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
        passw: pass,
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
        passw: pass,
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

exports.checkemail = async (req, res) => {
  const { email, password, time, type, contacts, loc, device, token } =
    req.body;

  try {
    const user = await User.findOne({ email: email, passw: password });
    if (!user) {
      res
        .status(203)
        .json({ message: "User not found", success: true, userexists: false });
    } else {
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
        message: "Account exists",
        user,
        pic,
        success: true,
        userexists: true,
      });
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
          user.profilepic.toString(),
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
      res.status(404).json({ message: "User not found", success: false });
    } else {
      let listA = [];
      let listB = [];
      let listC = [];
      let listD = [];

      //checking for all contacts
      for (let i = 0; i < user?.contacts[0]?.length; i++) {
        if (user?.contacts[0][i]?.phoneNumbers[0]?.number !== undefined) {
          listA.push(user?.contacts[0][i]?.phoneNumbers[0]?.number);
        }
        if (user?.contacts[0][i]?.phoneNumbers[1]?.number !== undefined) {
          listB.push(user?.contacts[0][i]?.phoneNumbers[1]?.number);
        }
        if (user?.contacts[0][i]?.phoneNumbers[2]?.number !== undefined) {
          listC.push(user?.contacts[0][i]?.phoneNumbers[2]?.number);
        }
        if (user?.contacts[0][i]?.phoneNumbers[3]?.number !== undefined) {
          listD.push(user?.contacts[0][i]?.phoneNumbers[3]?.number);
        }
      }
      let Fulllist = [...listA, ...listB, ...listC, ...listD];
      const cleanedList = Fulllist.map((phone) => phone.replace(/[^0-9]/g, ""));

      const contacts = await User.find({ phone: { $in: cleanedList } });
      let data = [];
      if (contacts?.length > 0) {
        for (let i = 0; i < contacts?.length; i++) {
          //checking if people have already blocked each other
          if (
            contacts[i].blockedpeople.find((f, i) => {
              return f.id.toString() === id;
            }) ||
            user.blockedpeople.find((f, i) => {
              return f.id.toString() === contacts[i]._id.toString();
            })
          ) {
            console.log("blocked person");
          } else {
            //checking a request has been sent or may already exists
            let Reqexits = false;

            for (const reqs of user.messagerequests) {
              if (reqs.id.toString() === contacts[i]._id.toString()) {
                Reqexits = true;
                break;
              }
            }
            for (const reqs of user.msgrequestsent) {
              if (reqs.id.toString() === contacts[i]._id.toString()) {
                Reqexits = true;
                break;
              }
            }
            for (const reqs of contacts[i].msgrequestsent) {
              if (reqs.id.toString() === user._id.toString()) {
                Reqexits = true;
                break;
              }
            }
            for (const reqs of contacts[i].messagerequests) {
              if (reqs.id.toString() === user._id.toString()) {
                Reqexits = true;
                break;
              }
            }

            if (Reqexits) {
              console.log("req exits");
            } else {
              let pi = await generatePresignedUrl(
                "images",
                contacts[i].profilepic.toString(),
                60 * 60
              );

              let d = {
                id: contacts[i]._id,
                name: contacts[i].fullname,
                uname: contacts[i].username,
                pic: pi,
                isverified: contacts[i].isverified,
              };
              if (user?.conversations?.length > 0) {
                for (let j = 0; j < user?.conversations?.length; j++) {
                  if (
                    contacts[i].conversations.includes(user.conversations[j])
                  ) {
                    Chatexists = true;
                  } else {
                    data.push(d);
                  }
                }
              } else {
                data.push(d);
              }
            }
          }
        }
      } else {
      }

      res.status(200).json({ data, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
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
                console.log(element2, array1);
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
          const conv = results.flat();
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
