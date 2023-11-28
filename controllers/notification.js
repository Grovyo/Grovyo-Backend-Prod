const Notification = require("../models/notification");
const User = require("../models/userAuth");
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

exports.createnoti = async (req, res) => {
  const { userId, recId } = req.params;
  const { text } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ messgae: "No user Found", success: false });
    } else {
      const u = new Notification({
        senderId: user._id,
        text: text,
        recId: recId,
      });
      await u.save();
      await User.updateOne(
        { _id: recId },
        { $push: { notifications: u._id }, $inc: { notificationscount: 1 } }
      );
      res.status(200).json({ success: true, u });
    }
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.getnoti = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ messgae: "No user Found", success: false });
    } else {
      const noti = [];
      const dps = [];

      for (let i = 0; i < user.notifications.length; i++) {
        const rev = await Notification.find({
          recId: user._id,
        }).populate("senderId", "fullname username profilepic");

        for (let j = 0; j < rev.length; j++) {
          if (rev[j].senderId === null) {
            rev[j].remove();
          }
          const dp = await generatePresignedUrl(
            "images",
            rev[j].senderId.profilepic.toString(),
            60 * 60
          );
          dps.push(dp);
        }

        noti.push(rev);
      }

      res.status(200).json({ success: true, noti, dps });
    }
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
