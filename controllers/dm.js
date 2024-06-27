const Minio = require("minio");
const User = require("../models/userAuth");
const Conversation = require("../models/conversation");
const Membership = require("../models/membership");
const minioClient = new Minio.Client({
  endPoint: "minio.grovyo.xyz",

  useSSL: true,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});

exports.verifydm = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentDay = Date.now();
    const user = await User.findById(userId);
    const membershipid = user.memberships.membership;
    const membership = await Membership.findById(membershipid);
    const end = user.memberships.ending;
    const membershipEndingDate = new Date(user.memberships.ending);
    if (user) {
      if (currentDay > membershipEndingDate.getTime() || end === "infinite") {
        res.status(200).json({ message: "DM not available" });
      } else {
        res.status(200).json({
          message: "DM available",
          dm: user?.dm,
        });
      }
    } else {
      res.status(404).json({
        message: "User doesn't exist",
      });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Error fetching limits", success: false });
  }
};
exports.reducedm = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    console.log(userId);
    console.log(user.fullname, "user");
    if (user) {
      if (user.dm > 0) {
        user.dm = user.dm - 1;
        await user.save();
        res.status(200).json({
          message: "DM reduced",
        });
      } else {
        res.status(200).json({ message: "DM not available" });
      }
    } else {
      res.status(404).json({
        message: "User doesn't exist",
      });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e });
  }
};

//
exports.createconv = async (req, res) => {
  const { sender, reciever } = req.params;
  try {
    try {
      const conv = await Conversation.findOne({
        members: { $all: [sender, reciever] },
      });

      const user = await User.findById(reciever);

      if (conv) {
        res.status(203).json({ success: false, covId: conv._id });
      } else if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
      } else {
        await User.updateOne(
          { _id: reciever },
          { $pull: { messagerequests: { id: sender } } }
        );
        await User.updateOne(
          { _id: sender },
          { $pull: { msgrequestsent: { id: reciever } } }
        );
        const conv = new Conversation({ members: [sender, reciever] });
        const savedconv = await conv.save();
        await User.updateOne(
          { _id: sender },
          { $push: { conversations: savedconv?._id } }
        );
        await User.updateOne(
          { _id: reciever },
          { $push: { conversations: savedconv?._id } }
        );
        res.status(200).json({ convId: savedconv?._id, success: true });
      }
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: e.message, success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message, success: false });
  }
};
