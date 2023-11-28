const Ads = require("../models/Ads");
const User = require("../models/userAuth");
const Minio = require("minio");
const Verification = require("../models/Veriification");
const Transaction = require("../models/AdTransactions");
const uuid = require("uuid").v4;
const sharp = require("sharp");

const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.xyz",

  useSSL: true,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});
const Advertiser = require("../models/Advertiser");

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

//genrate a random id
function generateUniqueID() {
  let advertiserID;
  advertiserID = Math.floor(100000000 + Math.random() * 900000000);

  return advertiserID.toString();
}

exports.checkaccount = async (req, res) => {
  const { phone, email, password } = req.body;
  try {
    let advertiser;
    if (email && password) {
      advertiser = await Advertiser.findOne({ email, password });
    } else if (phone) {
      advertiser = await Advertiser.findOne({ phone });
    } else {
      return res.status(400).json({
        message: "Invalid request. Please provide email, password, or phone.",
        success: false,
      });
    }

    if (advertiser) {
      const dp = await generatePresignedUrl(
        "images",
        advertiser.image.toString(),
        60 * 60
      );
      const newEditCount = {
        login: Date.now().toString(),
      };
      await Advertiser.updateOne(
        { _id: advertiser._id },
        {
          $push: { logs: newEditCount },
        }
      );
      return res
        .status(200)
        .json({ message: "Advertiser exists", advertiser, dp, success: true });
    } else {
      return res
        .status(404)
        .json({ message: "Advertiser not found", success: false });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

exports.createadvacc = async (req, res) => {
  const {
    firstname,
    lastname,
    city,
    state,
    landmark,
    email,
    phone,
    type,
    pincode,
    address,
    organizationname,
    pan,
    gst,
    password,
    retypepassword,
  } = req.body;

  try {
    const advid = generateUniqueID();
    const uuidString = uuid();
    const image = req.file;
    const bucketName = "images";
    const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;
    const adv = new Advertiser({
      firstname,
      lastname,
      city,
      state,
      landmark,
      email,
      phone,
      type,
      pincode,
      address,
      advertiserid: advid,
      image: objectName,
      organizationname,
      pan,
      gst,
      password,
      retypepassword,
    });

    await sharp(image.buffer)
      .jpeg({ quality: 60 })
      .toBuffer()
      .then(async (data) => {
        await minioClient.putObject(bucketName, objectName, data);
      })
      .catch((err) => {
        console.log(err.message, "-error");
      });

    await adv.save();
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

exports.newad = async (req, res) => {
  const { id } = req.params;
  const {
    adname,
    startdate,
    enddate,
    cta,
    ctalink,
    goal,
    headline,
    desc,
    preferedsection,
    tags,
    location,
    agerange,
    maxage,
    minage,
    totalbudget,
    dailybudget,
    estaudience,
    category,
    contenttype,
    adid,
    gender,
    advertiserid,
  } = req.body;

  try {
    const user = await Advertiser.findById(id);
    const uuidString = uuid();
    if (!user) {
      res.status(404).json({ message: "No user found!", success: false });
    } else {
      if (contenttype === "image") {
        const image = req.files[0];
        const bucketName = "ads";
        const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;

        await sharp(image.buffer)
          .jpeg({ quality: 60 })
          .toBuffer()
          .then(async (data) => {
            await minioClient.putObject(bucketName, objectName, data);
          })
          .catch((err) => {
            console.log(err.message, "-error");
          });
        const contents = {
          extension: image.mimetype,
          name: objectName,
        };
        const newAd = new Ads({
          adname,
          startdate,
          enddate,
          cta,
          ctalink,
          goal,
          headline,
          desc,
          preferedsection,
          tags,
          location,
          agerange,
          maxage,
          minage,
          totalbudget,
          dailybudget,
          estaudience,
          category,
          content: contents,

          adid: adid,
          gender,
          advertiserid,
        });
        await newAd.save();
        res.status(200).json({ success: true });
      } else {
        const { originalname, buffer, mimetype } = req.files[0];

        const size = buffer.byteLength;
        const bucketName = "ads";
        const objectName = `${Date.now()}_${uuidString}_${originalname}`;
        const contents = {
          extension: mimetype,
          name: objectName,
        };
        await minioClient.putObject(
          bucketName,
          objectName,
          buffer,
          size,
          mimetype
        );
        const newAd = new Ads({
          adname,
          startdate,
          enddate,
          cta,
          ctalink,
          goal,
          headline,
          desc,
          preferedsection,
          tags,
          location,
          agerange,
          maxage,
          minage,
          totalbudget,
          dailybudget,
          estaudience,
          category,
          content: contents,

          adid: adid,
          gender,
          advertiserid,
        });
        await newAd.save();
        res.status(200).json({ success: true });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.getad = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "No user found!", success: false });
    } else {
      const birthdateString = user.DOB;
      const [birthDay, birthMonth, birthYear] = birthdateString
        .split("/")
        .map(Number);

      // Get the current date
      const currentDate = new Date();

      // Get the current day, month, and year
      const currentDay = currentDate.getDate();
      const currentMonth = currentDate.getMonth() + 1; // Month is zero-based
      const currentYear = currentDate.getFullYear();

      // Calculate the age
      let age = currentYear - birthYear;
      if (
        currentMonth < birthMonth ||
        (currentMonth === birthMonth && currentDay < birthDay)
      ) {
        age--; // Adjust age if birthday hasn't occurred yet this year
      }

      const ads = [];

      const ad = await Ads.aggregate([
        {
          $match: {
            tags: { $in: user.interest },
            // location: { $eq: user.location },
            status: { $eq: "Active" },
          },
        },
        {
          $lookup: {
            from: "users", // Assuming the collection name for users is "users"
            localField: "creator", // Assuming the field storing the creator ObjectId is "creator"
            foreignField: "_id",
            as: "creator",
          },
        },
        {
          $addFields: {
            creatorName: { $arrayElemAt: ["$creator.fullname", 0] },
            creatorProfilePic: { $arrayElemAt: ["$creator.profilepic", 0] },
            isverified: { $arrayElemAt: ["$creator.isverified", 0] },
          },
        },
        {
          $project: {
            creator: 0, // Exclude the creator field if needed
          },
        },
        { $sample: { size: 1 } },
      ]);
      for (let i = 0; i < ad.length; i++) {
        if (ad[i].ageup > age && ad[i].agedown < age) {
          ads.push(ad[i]);
        }
      }
      const content = [];
      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "ads",
          ads[i].content.toString(),
          60 * 60
        );
        content.push(dp);
      }
      const dps = [];
      for (let i = 0; i < ads.length; i++) {
        const dp = await generatePresignedUrl(
          "images",
          ads[i].creatorProfilePic.toString(),
          60 * 60
        );
        dps.push(dp);
      }
      res.status(200).json({ ads, content, dps, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.getallads = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await Advertiser.findById(id);
    if (user) {
      const content = [];

      const ads = await Ads.find({
        advertiserid: user.advertiserid.toString(),
      });

      for (let i = 0; i < ads.length; i++) {
        const a = await generatePresignedUrl(
          "ads",
          ads[i].content.toString(),
          60 * 60
        );
        content.push(a);
      }
      res.status(200).json({ ads, content, success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetch dashboard details
exports.fetchdashboard = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await Advertiser.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
    } else {
      res.status(200).json({ success: true, user });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//edit ad status
exports.editcurrentad = async (req, res) => {
  const { id, adid } = req.params;
  const {
    adname,
    startdate,
    enddate,
    cta,
    ctalink,
    goal,
    headline,
    desc,
    preferedsection,
    tags,
    location,
    agerange,
    maxage,
    minage,
    totalbudget,
    dailybudget,
    estaudience,
    category,
    content,
    contenttype,
  } = req.body;

  try {
    const user = await Advertiser.findById(id);
    const Ad = await Ads.findById(adid);
    const uuidString = uuid();
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
    } else if (!Ad) {
      res.status(404).json({ success: false, message: "Ad not found" });
    } else {
      if (contenttype === "image") {
        const image = req.files[0];
        const bucketName = "ads";
        const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;
        const newEditCount = {
          date: Date.now().toString(),
          number: 1,
        };
        await sharp(image.buffer)
          .jpeg({ quality: 60 })
          .toBuffer()
          .then(async (data) => {
            await minioClient.putObject(bucketName, objectName, data);
          })
          .catch((err) => {
            console.log(err.message, "-error");
          });

        await Ads.updateOne(
          { _id: adid },
          {
            $set: {
              adname,
              startdate,
              enddate,
              status: "review",
              cta,
              ctalink,
              goal,
              headline,
              desc,
              preferedsection,
              tags,
              location,
              agerange,
              maxage,
              minage,
              totalbudget,
              dailybudget,
              estaudience,
              category,
              content: objectName,
            },
            $push: { editcount: newEditCount },
          }
        );
        res.status(200).json({ success: true });
      } else {
        const { originalname, buffer, mimetype } = req.files[0];

        const size = buffer.byteLength;
        const bucketName = "ads";
        const objectName = `${Date.now()}_${uuidString}_${originalname}`;

        await minioClient.putObject(
          bucketName,
          objectName,
          buffer,
          size,
          mimetype
        );
        await Ads.updateOne(
          { _id: adid },
          {
            $set: {
              adname,
              startdate,
              enddate,
              status: "review",
              cta,
              ctalink,
              goal,
              headline,
              desc,
              preferedsection,
              tags,
              location,
              agerange,
              maxage,
              minage,
              totalbudget,
              dailybudget,
              estaudience,
              category,
              content: objectName,
            },
            $push: { editcount: newEditCount },
          }
        );
        res.status(200).json({ success: true });
      }
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//edit advertiser details
exports.editadvertiser = async (req, res) => {
  const { id } = req.params;
  const {
    firstname,
    lastname,
    state,
    country,
    taxinfo,
    city,
    address,
    accounttype,
  } = req.body;
  try {
    const user = await Advertiser.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
    } else {
      const newEditCount = {
        date: Date.now().toString(),
        number: 1,
      };
      await Advertiser.updateOne(
        { _id: id },
        {
          $set: {
            firstname: firstname,
            lastname: lastname,
            state: state,
            country: country,
            taxinfo: taxinfo,
            city: city,
            address: address,
            type: accounttype,
          },
          $push: { editcount: newEditCount },
        }
      );
      res.status(200).json({ success: true, user });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//verification of advertiser
exports.verifyadvertiser = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const user = await Advertiser.findById(id);
    const uuidString = uuid();
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
    } else {
      const image = req.files[0];
      const bucketName = "imp";
      const objectName = `${Date.now()}_${uuidString}_${image.originalname}`;

      await sharp(image.buffer)
        .jpeg({ quality: 60 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, objectName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });
      const v = new Verification({
        name: name,
        file: objectName,
        status: "review",
        id: id,
      });
      await v.save();
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//logout from adspace
exports.logoutadv = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await Advertiser.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
    } else {
      const newEditCount = {
        logout: Date.now().toString(),
      };
      await Advertiser.updateOne(
        { _id: id },
        {
          $push: { logs: newEditCount },
        }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//fetching adv payments and balance
exports.gettransactions = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await Advertiser.findById(id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
    } else {
      const transaction = [];
      let amount = user.currentbalance;
      for (let i = 0; i < user.transactions.length; i++) {
        const t = await Transaction.findById(user.transactions[i]);
        transaction.push(t);
      }
      transaction.reverse();
      res.status(200).json({ success: true, transaction, amount });
    }
  } catch (e) {
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//addmoney to wallet
exports.addmoneytowallet = async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  try {
    const user = await Advertiser.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
    } else {
      const newid = Math.floor(Math.random() * 9000000) + 1000000;
      const t = new Transaction({
        amount: amount,
        type: "Wallet",
        transactionid: newid,
      });
      await t.save();
      await Advertiser.updateOne(
        { _id: id },
        {
          $push: { transactions: t._id },
        }
      );
      res.status(200).json({
        success: true,
        oi: newid,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//update transaction status
exports.updatetransactionstatus = async (req, res) => {
  const { id } = req.params;
  const { success, tid, amount } = req.body;

  try {
    const user = await Advertiser.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
    } else {
      const t = await Transaction.findOne({ transactionid: tid });
      if (!t) {
        res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      } else {
        await Transaction.updateOne(
          { _id: t._id },
          {
            $set: {
              status: success,
            },
          }
        );
        await Advertiser.updateOne(
          { _id: id },
          {
            $inc: { currentbalance: amount },
          }
        );
        res.status(200).json({
          success: true,
        });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};
