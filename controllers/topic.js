const Topic = require("../models/topic");
const Message = require("../models/message");
const Community = require("../models/community");
const User = require("../models/userAuth");
const Minio = require("minio");
const Subscription = require("../models/Subscriptions");

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


