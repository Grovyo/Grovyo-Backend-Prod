const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const Conversation = require("../models/conversation");
const User = require("../models/userAuth");
const Minio = require("minio");
const sharp = require("sharp");
const uuid = require("uuid").v4;
const multer = require("multer");

const minioClient = new Minio.Client({
  endPoint: "192.168.29.171",
  port: 9000,
  useSSL: false,
  accessKey: "shreyansh379",
  secretKey: "shreyansh379",
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

router.post("/newmessage", async (req, res) => {
  const m = new Message(req.body);
  try {
    const newM = await m.save();
    res.status(200).json({ newM, success: true });
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.post("/sendimage/:id", upload.single("content"), async (req, res) => {
  const { id } = req.params;
  const { mesId, text, sender, conversationId, typ } = req.body;
  const content = req.file;
  try {
    const user = await User.findById(id);
    if (user) {
      const uuidString = uuid();
      const bucketName = "messages";
      const objectName = `${Date.now()}_${uuidString}_${content.originalname}`;
      const m = new Message({
        content: objectName,
        mesId: mesId,
        text: text,
        sender: sender,
        conversationId: conversationId,
        typ: typ,
      });
      const newM = await m.save();

      await sharp(req.file.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, objectName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });
      res.status(200).json({ newM, success: false });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.post("/sendvideo/:id", upload.single("content"), async (req, res) => {
  const { id } = req.params;
  const { mesId, text, sender, conversationId, typ } = req.body;
  const content = req.file;
  try {
    const user = await User.findById(id);
    if (user) {
      const uuidString = uuid();
      const bucketName = "messages";
      const objectName = `${Date.now()}_${uuidString}_${content.originalname}`;
      const size = content.buffer.byteLength;

      const m = new Message({
        content: objectName,
        mesId: mesId,
        text: text,
        sender: sender,
        conversationId: conversationId,
        typ: typ,
      });
      const newM = await m.save();

      await minioClient.putObject(
        bucketName,
        objectName,
        content.buffer,
        size,
        content.mimetype
      );

      res.status(200).json({ newM, success: true });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.post("/sendaudio/:id", upload.single("audio"), async (req, res) => {
  const { id } = req.params;
  const { mesId, text, sender, conversationId, typ } = req.body;
  const audio = req.file;
  try {
    const user = await User.findById(id);
    if (user) {
      const uuidString = uuid();
      const bucketName = "messages";
      const objectName = `${Date.now()}_${uuidString}_${audio.originalname}`;
      const size = audio.buffer.byteLength;
      a1 = objectName;
      a2 = audio.mimetype;
      const m = new Message({
        video: objectName,
        mesId: mesId,
        text: text,
        sender: sender,
        conversationId: conversationId,
        typ: typ,
      });
      const newM = await m.save();

      await minioClient.putObject(
        bucketName,
        objectName,
        audio.buffer,
        size,
        audio.mimetype
      );

      res.status(200).json(newM);
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.post("/senddoc/:id", upload.single("video"), async (req, res) => {
  const { id } = req.params;
  const { mesId, text, sender, conversationId, typ } = req.body;
  const video = req.file;
  try {
    const user = await User.findById(id);
    if (user) {
      const uuidString = uuid();
      const bucketName = "messages";
      const objectName = `${Date.now()}_${uuidString}_${video.originalname}`;
      const size = video.buffer.byteLength;
      a1 = objectName;
      a2 = video.mimetype;
      const m = new Message({
        video: objectName,
        mesId: mesId,
        text: text,
        sender: sender,
        conversationId: conversationId,
        typ: typ,
      });
      const newM = await m.save();

      await minioClient.putObject(
        bucketName,
        objectName,
        video.buffer,
        size,
        video.mimetype
      );

      res.status(200).json(newM);
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.get("/getmessage/:conversationId", async (req, res) => {
  try {
    const getM = await Message.find({
      conversationId: req.params.conversationId,
    });
    res.status(200).json(getM);
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});
module.exports = router;

router.post("/hide/:mesId/:id", async (req, res) => {
  try {
    const { mesId, id } = req.params;
    const m = await Message.findOne({ mesId: mesId });
    if (m) {
      await Message.updateOne({ _id: m._id }, { $push: { hidden: id } });
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.post("/unhide/:mesId/:id", async (req, res) => {
  try {
    const { mesId, id } = req.params;
    const m = await Message.findOne({ mesId: mesId });
    if (m) {
      await Message.updateOne({ _id: m._id }, { $pull: { hidden: id } });
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.get("/hidden/:convId/:id", async (req, res) => {
  try {
    const { convId, id } = req.params;
    const c = await Conversation.findById(convId);
    const user = await User.findById(id);
    if (c) {
      const m = await Message.find({
        conversationId: convId,
        hidden: { $in: [user._id] },
      });
      res.status(200).json({ m, success: true });
    } else {
      res.status(404).json({ success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.post("/createpoll/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      const m = new Message(req.body);
      const newM = await m.save();
      res.status(200).json(newM);
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.post("/votenow/:mesId/:id/:option", async (req, res) => {
  const { mesId, id, option } = req.params;
  try {
    const user = await User.findById(id);
    const message = await Message.findById(mesId);
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else if (!message) {
      res.status(404).json({ message: "No Poll found", success: false });
    } else {
      if (!message.voted.includes(user._id)) {
        await Message.updateOne(
          { _id: message._id },
          {
            $push: { voted: user._id, [`option.${option}.votedBy`]: user._id },
            $inc: { totalVotes: 1, [`option.${option}.voteCount`]: 1 },
          }
        );
        res.status(200).json({
          success: true,
          votes: message.option[option].voteCount,
          option,
        });
      } else {
        console.log("Already Voted");
        res.status(201).json({ success: false, message: "Already Voted" });
      }
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});

router.get("/getvotes/:mesId", async (req, res) => {
  const { mesId } = req.params;
  try {
    const message = await Message.findById(mesId).populate(
      "voted",
      "fullname profilepic"
    );
    if (!message) {
      res.status(404).json({ message: "No Poll found", success: false });
    } else {
      const urls = [];
      for (let i = 0; i < message.voted.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          message.voted[i].profilepic.toString(),
          60 * 60
        );
        urls.push(a);
      }
      res.status(200).json({ message, success: true, urls });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
});
