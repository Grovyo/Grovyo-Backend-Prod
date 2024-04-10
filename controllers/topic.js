const Topic = require("../models/topic");
const Message = require("../models/message");
const Community = require("../models/community");
const User = require("../models/userAuth");
const Minio = require("minio");
const Subscription = require("../models/Subscriptions");
const Analytics = require("../models/Analytics");
const Razorpay = require("razorpay");
const fs = require("fs");
const {
  validatePaymentVerification,
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

const instance = new Razorpay({
  key_id: "rzp_live_Ms5I8V8VffSpYq",
  key_secret: "Sy04bmraRqV9RjLRj81MX0g7",
});

//for creating pdf bills
const PDFDocument = require("pdfkit");
const doc = new PDFDocument();

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

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // January is 0!
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

//generate a random id
const generateRandomId = () => {
  let id = "";
  const digits = "0123456789";

  for (let i = 0; i < 17; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    id += digits[randomIndex];
  }

  return id;
};

//create a new topic
// exports.create = async (req, res) => {
//   const { title, message, type, price } = req.body;
//   const { userId, comId } = req.params;
//   try {
//     const topic = new Topic({
//       title,
//       creator: userId,
//       community: comId,
//       message: message,
//       type: type,
//       price: price,
//     });
//     await topic.save();
//     await Topic.updateOne(
//       { _id: topic._id },
//       { $push: { members: userId }, $inc: { memberscount: 1 } }
//     );
//     await Community.updateOne(
//       { _id: comId },
//       {
//         $push: { topics: topic._id },
//         $inc: { totaltopics: 1 },
//       }
//     );
//     await User.updateOne(
//       { _id: userId },
//       { $push: { topicsjoined: topic._id }, $inc: { totaltopics: 1 } }
//     );

//     res.status(200).json({ topic, success: true });
//   } catch (e) {
//     res.status(400).json({ message: e.message, success: false });
//   }
// };

//Delete Topic
// exports.deletetopic = async (req, res) => {
//   const { topicId } = req.params;
//   const topic = await Topic.findById(topicId);
//   try {
//     if (!topicId) {
//       res.status(400).json({ message: "No topic found", success: false });
//     } else if (topic.creator.toString() != topicId) {
//       res
//         .status(400)
//         .json({ message: "Not Authorized - You can't delete others topic" });
//     } else {
//       await Topic.findByIdAndDelete(topicId);

//       res.status(200).json({ success: true });
//     }
//   } catch (e) {
//     res.status(400).json({ message: e.message });
//   }
// };

//get all messages of a topic
exports.getmessages = async (req, res) => {
  const { topicId, userId } = req.params;
  const user = await User.findById(userId);
  const topic = await Topic.findById(topicId);
  const community = await Community.find({ topics: { $in: [topic._id] } });

  try {
    const messages = await Message.find({ topicId: topicId })
      .limit(20)
      .sort({ createdAt: -1 })
      .populate("sender", "profilepic fullname isverified");

    const reversed = messages.reverse();
    const dps = [];

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
    if (!topic) {
      res.status(404).json({ message: "No topic found", success: false });
    } else if (!community) {
      res.status(404).json({ message: "No Community found", success: false });
    } else if (!user) {
      res.status(404).json({ message: "No User found", success: false });
    } else if (!community[0].members.includes(user._id)) {
      res.status(203).json({
        reversed,
        dps,
        message: "You are not the member of the Community",
        success: true,
        issubs: false,
        topicjoined: false,
      });
    } else if (topic.type === "Private") {
      if (topic.members.some((id) => id.toString() === user._id.toString())) {
        res.status(200).json({
          success: true,
          reversed,
          dps,
          issubs: true,
          topicjoined: true,
        });
      } else {
        res.status(400).json({
          message: "You need to join this topic first",
          success: true,
          issubs: false,
          reversed,
          dps,
          topicjoined: false,
        });
      }
    } else if (topic.type === "Paid") {
      if (
        topic.members.some((id) => id.toString() === user._id.toString()) &&
        user.topicsjoined.some((id) => id.toString() === topic._id.toString())
      ) {
        res.status(200).json({
          success: true,
          reversed,
          dps,
          issubs: true,
          topicjoined: true,
        });
      } else {
        res.status(203).json({
          message: "Unsubscribed",
          reversed,
          dps,
          success: true,
          topic,
          issubs: true,
          topicjoined: false,
        });
      }
    } else if (topic.type === "Public") {
      res.status(200).json({
        success: true,
        reversed,
        dps,
        issubs: true,
        topicjoined: true,
      });
    } else {
      res.status(200).json({
        success: true,
        reversed,
        dps,
        issubs: true,
        topicjoined: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//hidden messages
exports.hiddenmes = async (req, res) => {
  const { comId, id } = req.params;
  try {
    const com = await Community.findById(comId);
    const user = await User.findById(id);
    if (user && com) {
      const mes = await Message.find({
        comId: com._id,
        hidden: { $in: [user._id] },
      }).populate("sender", "fullname isverified profilepic");
      res.status(200).json({ mes, success: true });
    } else {
      res
        .status(404)
        .json({ message: "Something went wrong...", success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//message
exports.newmessage = async (req, res) => {
  const { topicId } = req.params;
  const { text, sender, typ, mesId, reply, dissapear, comId, sequence } =
    req.body;

  try {
    const message = new Message({
      text: text,
      sender: sender,
      topicId: topicId,
      typ: typ,
      mesId: mesId,
      reply: reply,
      dissapear: dissapear,
      comId: comId,
      sequence: sequence,
    });
    await message.save();
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

//topic order initiate
exports.initiatetopic = async (req, res) => {
  const { topicId } = req.params;
  try {
    const top = await Topic.findById(topicId);
    if (top) {
      let temp = generateRandomId();
      let oId = `order_${temp}`;
      const order = new Subscription({
        topic: top._id,
        validity: "1 month",
        orderId: oId,
      });
      await order.save();
      res.status(200).json({ orderId: order._id, success: true });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//join a topic
exports.jointopic = async (req, res) => {
  const { topicId, id, comId, orderId } = req.params;
  const { paymentId, status } = req.body;
  try {
    const top = await Topic.findById(topicId);
    const order = await Subscription.findById(orderId);
    if (top && order) {
      await Subscription.updateOne(
        { _id: orderId },
        { $set: { paymentId: paymentId, status: status } }
      );

      await Community.updateOne(
        { _id: comId },
        { $push: { members: id }, $inc: { memberscount: 1 } }
      );

      await User.updateOne(
        { _id: id },
        { $push: { communityjoined: comId }, $inc: { totalcom: 1 } }
      );

      await Topic.updateOne(
        { _id: top._id },
        { $push: { members: id }, $inc: { memberscount: 1 } }
      );

      await User.updateOne(
        { _id: id },
        {
          $push: { topicsjoined: [top._id] },
          $inc: { totaltopics: 1 },
        }
      );
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//check the latest messages - community only
exports.checkLastMessage = async (req, res) => {
  const { topicId, userId } = req.params;
  const { timestamp, mesId } = req.body;

  try {
    const user = await User.findById(userId);
    const topic = await Topic.findById(topicId);
    const community = await Community.find({ topics: { $in: [topic._id] } });
    const messages = await Message.find({
      topicId: { $eq: topicId },
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
      if (!topic) {
        res
          .status(404)
          .json({ message: "No topic found", success: false, nodata: true });
      } else if (!community) {
        res.status(404).json({
          message: "No Community found",
          success: false,
          nodata: false,
        });
      } else if (!user) {
        res
          .status(404)
          .json({ message: "No User found", success: false, nodata: true });
      } else if (!community[0].members.includes(user._id)) {
        res.status(203).json({
          reversed,
          dps,
          message: "You are not the member of the Community",
          success: true,
          issubs: false,
          topicjoined: false,
          nodata: true,
        });
      } else if (topic.type === "Private") {
        if (topic.members.some((id) => id.toString() === user._id.toString())) {
          res.status(200).json({
            success: true,
            reversed,
            dps,
            issubs: true,
            topicjoined: true,
            nodata: true,
          });
        } else {
          res.status(400).json({
            message: "You need to join this topic first",
            success: true,
            issubs: false,
            reversed,
            dps,
            topicjoined: false,
            nodata: true,
          });
        }
      } else if (topic.type === "Paid") {
        if (
          topic.members.some((id) => id.toString() === user._id.toString()) &&
          user.topicsjoined.some((id) => id.toString() === topic._id.toString())
        ) {
          res.status(200).json({
            success: true,
            reversed,
            dps,
            issubs: true,
            topicjoined: true,
            nodata: true,
          });
        } else {
          res.status(203).json({
            message: "Unsubscribed",
            reversed,
            dps,
            success: true,
            topic,
            issubs: true,
            topicjoined: false,
            nodata: true,
          });
        }
      } else if (topic.type === "Public") {
        res.status(200).json({
          success: true,
          reversed,
          dps,
          issubs: true,
          topicjoined: true,
          nodata: false,
        });
      } else {
        res.status(200).json({
          success: true,
          reversed,
          dps,
          issubs: true,
          topicjoined: true,
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

// exports.createc = async (req, res) => {
//   const { title, message, type, price, comid } = req.body;
//   const { userId } = req.params;
//   try {
//     const topic = new Topic({
//       title: title,
//       creator: userId,
//       // community: comId,
//       message: message,
//       type: type,
//       price: price,
//     });

//     await topic.save();

//     await Topic.updateOne(
//       { _id: topic._id },
//       { $push: { members: userId }, $inc: { memberscount: 1 } }
//     );
//     // await Community.updateOne(
//     //   { _id: comId },
//     //   {
//     //     $push: { topics: topic._id },
//     //     $inc: { totaltopics: 1 },
//     //   }
//     // );
//     await User.updateOne(
//       { _id: userId },
//       { $push: { topicsjoined: topic._id }, $inc: { totaltopics: 1 } }
//     );

//     if (comid) {
//       await Community.findByIdAndUpdate(
//         { _id: comid },
//         { $push: { topics: topic._id } }
//       );
//     }
//     res.status(200).json({ topic, success: true });
//   } catch (e) {
//     res.status(400).json({ message: e.message, success: false });
//   }
// };

// fetchTopic
// exports.fetchtopicc = async (req, res) => {
//   try {
//     const { id, comId } = req.params;

//     const user = await User.findById(id);
//     const community = await Community.findById(comId).populate("topics");
//     if (!community) {
//       res.json({ message: "Community Not Found" });
//     } else {
//       res.json({ topics: community.topics, success: true });
//     }
//   } catch (err) {
//     res.status(400).json({ message: err.message, success: false });
//     console.log(err);
//   }
// };

//Delete Topic
// exports.deletetopicc = async (req, res) => {
//   const { topicId, userId } = req.params;
//   const { idtosend } = req.body;
//   const topic = await Topic.findById(topicId);
//   try {
//     if (!topicId) {
//       res.status(400).json({ message: "No topic found", success: false });
//     } else if (topic.creator.toString() != userId) {
//       res
//         .status(400)
//         .json({ message: "Not Authorized - You can't delete others topic" });
//     } else {
//       await Topic.findByIdAndDelete(topicId);
//       if (idtosend) {
//         await Community.findByIdAndUpdate(
//           { _id: idtosend },
//           { $pull: { topics: topicId } }
//         );
//       }
//       res.status(200).json({ success: true });
//     }
//   } catch (e) {
//     res.status(400).json({ message: e.message });
//   }
// };

// edit topic
// changed
// exports.edittopicc = async (req, res) => {
//   try {
//     const { id, topicid } = req.params;
//     const topic = await Topic.findById(topicid);
//     if (!topic) {
//       res.status(400).json({ message: "No topic found", success: false });
//     } else if (topic.creator.toString() != id) {
//       res
//         .status(400)
//         .json({ message: "Not Authorized - You can't edit others topic" });
//     } else {
//       const updatedTopic = await Topic.findOneAndUpdate(
//         { _id: topicid },
//         req.body,
//         { new: true }
//       );

//       res.status(200).json({ updatedTopic, success: true });
//     }
//   } catch (err) {
//     res.status(500).json({ message: "Internal Server Error", success: false });
//     console.log(err);
//   }
// };

//       message: message,
//       type: type,
//       price: price,
//     });

//     await topic.save();

//     await Topic.updateOne(
//       { _id: topic._id },
//       { $push: { members: userId }, $inc: { memberscount: 1 } }
//     );
//     // await Community.updateOne(
//     //   { _id: comId },
//     //   {
//     //     $push: { topics: topic._id },
//     //     $inc: { totaltopics: 1 },
//     //   }
//     // );
//     await User.updateOne(
//       { _id: userId },
//       { $push: { topicsjoined: topic._id }, $inc: { totaltopics: 1 } }
//     );

//     if (comid) {
//       await Community.findByIdAndUpdate(
//         { _id: comid },
//         { $push: { topics: topic._id } }
//       );
//     }
//     res.status(200).json({ topic, success: true });
//   } catch (e) {
//     res.status(400).json({ message: e.message, success: false });
//   }
// };

// fetchTopic
exports.fetchtopic = async (req, res) => {
  try {
    const { id, comId } = req.params;
    const user = await User.findById(id);
    const community = await Community.findById(comId).populate("topics");
    if (!community) {
      res.json({ message: "Community Not Found" });
    } else {
      console.log(community.topics);
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
  const { idtosend } = req.body;
  const topic = await Topic.findById(topicId);
  try {
    if (!topicId) {
      res.status(400).json({ message: "No topic found", success: false });
    } else if (topic.creator.toString() != userId) {
      res
        .status(400)
        .json({ message: "Not Authorized - You can't delete others topic" });
    } else {
      await Topic.findByIdAndDelete(topicId);
      if (idtosend) {
        await Community.findByIdAndUpdate(
          { _id: idtosend },
          { $pull: { topics: topicId } }
        );
      }
      res.status(200).json({ success: true });
    }
  } catch (e) {
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

//buy topic a new topic order
exports.createtopicporder = async (req, res) => {
  try {
    const { id, topicId } = req.params;

    const user = await User.findById(id);
    const topic = await Topic.findById(topicId);

    if (!user && !topic) {
      return res.status(404).json({ message: "User or topic not found" });
    } else {
      const currentValidity = new Date();
      const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
      const newValidity = new Date(
        currentValidity.getTime() + thirtyDaysInMillis
      ).toISOString();
      let oi = Math.floor(Math.random() * 9000000) + 1000000;
      //a new subscription is created
      const subscription = new Subscription({
        topic: topic._id,
        community: topic.community,
        validity: newValidity,
        amount: topic.price,
        orderId: oi,
        paymentMode: "UPI",
        currentStatus: "pending",
      });
      await subscription.save();

      //upating subscription of customers
      await User.updateOne(
        { _id: id },
        { $push: { subscriptions: subscription._id } }
      );

      //creating a rzp subscription
      instance.orders.create(
        {
          amount: parseInt(topic.price) * 100,
          currency: "INR",
          receipt: `receiptofsubs#${oi}`,
          notes: {
            price: topic.price,
            subscription: subscription._id,
          },
        },
        function (err, subs) {
          console.log(err, subs);
          if (err) {
            res.status(400).json({ err, success: false });
          } else {
            res.status(200).json({
              oid: subs.id,
              subs: subscription._id,
              phone: user?.phone,
              email: user?.email,
              success: true,
            });
          }
        }
      );
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

//finalising the topic order
exports.finalisetopicorder = async (req, res) => {
  try {
    const { id, ordId, topicId } = req.params;
    const {
      oid,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status,
    } = req.body;

    const user = await User.findById(id);
    const topic = await Topic.findById(topicId);
    const community = await Community.findById(topic?.community);
    if (!user) {
      return res.status(404).json({ message: "User or Product not found" });
    } else {
      const isValid = validatePaymentVerification(
        { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
        razorpay_signature,
        "Sy04bmraRqV9RjLRj81MX0g7"
      );

      if (isValid) {
        let purchase = { id: user._id, broughton: Date.now() };
        await Subscription.updateOne(
          { _id: ordId },
          {
            $set: {
              currentStatus: status,
              onlineorderid: oid,
              purchasedby: user?._id,
            },
          }
        );
        await Topic.updateOne(
          { _id: topic._id },
          {
            $addToSet: {
              purchased: purchase,
              members: user._id,
              notifications: user?._id,
            },
            $inc: { memberscount: 1, earnings: topic.price },
          }
        );
        //updating paid members count
        await Community.updateOne(
          { _id: user._id },
          { $inc: { paidmemberscount: 1 } }
        );
        //person who brought status update
        await User.updateOne(
          { _id: user._id },
          { $addToSet: { topicsjoined: topic._id }, $inc: { totaltopics: 1 } }
        );
        //person who created the topic gets money
        await User.updateOne(
          { _id: community?.creator },
          {
            $inc: { moneyearned: topic.price, topicearning: topic.price },
            $addToSet: {
              earningtype: {
                how: "Topic Purchase",
                when: Date.now(),
              },
              subscriptions: ordId,
            },
          }
        );

        //stats increase
        let today = new Date();

        let year = today.getFullYear();
        let month = String(today.getMonth() + 1).padStart(2, "0");
        let day = String(today.getDate()).padStart(2, "0");

        let formattedDate = `${day}/${month}/${year}`;

        let analytcis = await Analytics.findOne({
          date: formattedDate,
          id: community._id,
        });

        //Graph Stats
        if (!analytcis.paidmembers.includes(user._id)) {
          await Analytics.updateOne(
            { _id: analytcis._id },
            {
              $addToSet: { paidmembers: user._id },
            }
          );
        }

        // const sub = await Subscription.countDocuments();

        // const buyer = await User.findById(user._id);
        // const seller = await User.findById(community.creator);

        // let buyerdata = `${buyer.fullname}, ${buyer.address.streetaddress}, ${buyer.address.city}, ${buyer.address.landmark}, ${buyer.address.state}, ${buyer.address.country}`;
        // let sellerdata = `${seller.fullname}, ${seller.storeAddress.streetaddress}, ${seller.storeAddress.city}, ${seller.storeAddress.landmark}, ${seller.storeAddress.state}, ${seller.storeAddress.country}`;

        // let orderdata = {
        //   hsn: "",
        //   desc: `Topic Payment - ${topic?.title}`,
        //   qty: 1,
        //   disc: topic.message,
        //   amt: topic.price,
        // };

        // createpdfs({
        //   data: orderdata,
        //   buyer: buyerdata,
        //   seller: sellerdata,
        //   mode: "online",
        //   refno: `topic_${oid}`,
        //   total: topic?.price,
        //   billno: sub.length + 1,
        // });

        res.status(200).json({ success: true });
      } else {
        await Subscription.updateOne(
          { _id: ordId },
          { $set: { currentStatus: status, onlineorderid: oid } }
        );

        res.status(200).json({ success: true });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

//delete topics without communities
exports.delenutopic = async (req, res) => {
  try {
    const t = await Topic.find();

    for (let i = 0; i < t.length; i++) {
      const com = await Community.findById(t[i].community);
      if (!com) {
        t[i].remove();
      }
    }
    res.status(200).send({ success: true });
  } catch (err) {
    console.log(ee);
  }
};

const createpdfs = async ({
  refno,
  mode,
  billno,
  buyer,
  seller,
  data,
  total,
}) => {
  try {
    const currentDate = new Date();
    const formattedDate = formatDate(currentDate);

    const finaltotal = parseInt(total);

    const pdfFileName = `${refno}.pdf`;
    const writeStream = fs.createWriteStream(pdfFileName);
    doc.pipe(writeStream);

    doc.fontSize(17);
    doc
      .text(`Tax Invoice`, {
        align: "center",
      })
      .moveUp(-1);

    doc.fontSize(12);
    doc.text("Grovyo Platforms Pvt Ltd", { align: "left" }).moveDown(0.5);
    doc.text("+91 7318501865", { align: "left" }).moveDown(0.5);
    doc
      .text("37 A, Rampuram, Shyam Nagar, Kanpur, 208013", { align: "left" })
      .moveDown(0.5);
    doc.text("GSTIN - 09AAJCG9210A1ZV", { align: "left" }).moveDown(0.5);
    doc
      .text("State Name - Uttar Pradesh, Code: 09", { align: "left" })
      .moveDown(1.5);

    doc.text(`Reference No. ${refno}`, { align: "left" }).moveDown(0.5);
    doc.text(`Dated on- ${formattedDate}`, { align: "left" }).moveDown(0.5);
    doc.text(`Payment Mode- ${mode}`, { align: "left" }).moveDown(0.5);
    doc.text(`Bill no.- ${billno}`, { align: "left" }).moveDown(2).fontSize(15);

    //buyer details
    doc.text(`Buyer (Bill To)`, { align: "left" }).moveDown(0.5).fontSize(12);
    doc.text(`${buyer}`, { align: "left" }).moveDown(1).fontSize(15);

    //seller details
    doc.text(`Sold By (From)`, { align: "left" }).moveDown(0.5).fontSize(12);
    doc.text(`${seller}`, { align: "left" }).moveDown(1.5).fontSize(15);

    //details of products
    doc
      .text(`S No.  HSN/ASN   Description   Quantity   Discount   Amount`, {})
      .moveDown(0.5);

    doc
      .text(
        `${1}       ${data.hsn}       ${data.desc}       ${data.qty}      Rs ${
          data.disc
        }       Rs ${data.amt}`,
        {}
      )
      .moveDown(0.5);

    doc.fontSize(13).moveDown(1.5);
    doc.text(`Total - Rs ${total}`, {}).moveDown(1.5).fontSize(15);
    doc
      .text(
        `Total Taxable Value    Central Tax     State Tax    Total Tax Amount`,
        {}
      )
      .moveDown(1)
      .fontSize(13);
    // doc
    //   .text(
    //     `Rs 30             9%  Rs 2.7             9%  Rs 2.7            Rs 5.4`,
    //     {}
    //   )
    //   .moveDown(1);
    doc
      .text(`Total(After Round Off) - Rs ${finaltotal}`, {})
      .moveDown(1.5)
      .fontSize(15);
    doc.text(`Declaration`, {}).moveDown(0.5).fontSize(11);
    doc
      .text(
        `We declare that this invoice shows the actual price of the goods described and that all particullars are true and correct.`,
        {}
      )
      .moveDown(1.5)
      .fontSize(15);
    doc
      .text(`Authorised Signatory`, { align: "right" })
      .moveDown(0.4)
      .fontSize(11);
    doc.text(`Grovyo Platforms Pvt Ltd`, { align: "right" }).moveDown(1);
    doc
      .text(`This is a computer generated invoice`, { align: "center" })
      .moveDown(0.5);

    doc.end();

    // Upload PDF to Minio
    writeStream.on("finish", async () => {
      await minioClient.fPutObject(
        "billing",
        pdfFileName,
        pdfFileName,
        function (err, etag) {
          if (err) {
            console.log(err);
            //res.status(400).json({ success: false });
          } else {
            // Delete local file after uploading
            fs.unlinkSync(pdfFileName);
            //res.status(200).json({ success: true });
          }
        }
      );
    });
  } catch (e) {
    console.log(e);
  }
};
