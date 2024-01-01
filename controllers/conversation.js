const Conversation = require("../models/conversation");
const Message = require("../models/message");
const uuid = require("uuid").v4;
const Minio = require("minio");
const User = require("../models/userAuth");
const admin = require("../fireb");
const moment = require("moment");

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

//create a new messsage reqs
exports.createmessagereqs = async (req, res) => {
  const { sender, message, reciever } = req.body;
  try {
    const conv = await Conversation.findOne({
      members: { $all: [sender, reciever] },
    });

    // await Conversation.findOne({
    //   members: { $all: [sender, reciever] },
    // });
    const sendingperson = await User.findById(sender);
    const recievingperson = await User.findById(reciever);
    let blockcheck = false;
    let existsbothway = false;

    //checking if conversation exists in any of the persons phone
    if (
      sendingperson?.conversations?.includes(conv?._id?.toString()) &&
      recievingperson?.conversations?.includes(conv?._id?.toString())
    ) {
      existsbothway = true;
    }

    //checking for blocking
    if (
      sendingperson.blockedpeople.find((f, i) => {
        return f.id.toString() === reciever;
      }) ||
      recievingperson.blockedpeople.find((f, i) => {
        return f.id.toString() === sender;
      })
    ) {
      blockcheck = true;
    }
    if (blockcheck) {
      res.status(201).json({ message: "You are blocked", success: false });
    } else {
      if (conv) {
        if (existsbothway) {
          res.status(203).json({
            success: true,
            covId: conv._id,
            existingreq: false,
            existsbothway: true,
            convexists: true,
          });
        } else {
          res.status(203).json({
            success: true,
            covId: conv._id,
            existingreq: false,
            existsbothway: false,
            convexists: true,
          });
        }
      } else if (!recievingperson) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
      } else {
        let Reqexits = false;
        //checking for already sent msg request
        for (const reqs of recievingperson.messagerequests) {
          if (reqs.id.toString() === sender) {
            Reqexits = true;
            break;
          }
        }
        for (const reqs of recievingperson.msgrequestsent) {
          if (reqs.id.toString() === sender) {
            Reqexits = true;
            break;
          }
        }
        for (const reqs of sendingperson.msgrequestsent) {
          if (reqs.id.toString() === reciever) {
            Reqexits = true;
            break;
          }
        }
        for (const reqs of sendingperson.messagerequests) {
          if (reqs.id.toString() === reciever) {
            Reqexits = true;
            break;
          }
        }
        if (Reqexits) {
          res.status(200).json({ success: true, existingreq: true });
        } else {
          await User.updateOne(
            { _id: reciever },
            {
              $push: {
                messagerequests: { id: sender, message: message },
              },
            }
          );
          await User.updateOne(
            { _id: sender },
            {
              $push: {
                msgrequestsent: { id: reciever },
              },
            }
          );

          //message for notification
          let date = moment(new Date()).format("hh:mm");
          const msg = {
            notification: {
              title: "A new request has arrived.",
              body: `👋 Extend your hand and accept!!`,
            },
            data: {
              screen: "Requests",
              sender_fullname: `${sendingperson?.fullname}`,
              sender_id: `${sendingperson?._id}`,
              text: "A new request has arrived!!",
              isverified: `${sendingperson?.isverified}`,
              createdAt: `${date}`,
            },
            token: recievingperson?.notificationtoken,
          };

          await admin
            .messaging()
            .send(msg)
            .then((response) => {
              console.log("Successfully sent message");
            })
            .catch((error) => {
              console.log("Error sending message:", error);
            });

          res.status(200).json({ success: true, existingreq: true });
        }
      }
    }
  } catch (e) {
    console.log(e);
    res
      .status(500)
      .json({ message: e.message, success: false, existingreq: false });
  }
};

//accept or reject msg reqs
exports.acceptorrejectmesgreq = async (req, res) => {
  const { sender, status, reciever } = req.body;
  try {
    const conv = await Conversation.findOne({
      members: { $all: [sender, reciever] },
    });
    const user = await User.findById(reciever);
    if (conv) {
      res.status(203).json({ success: false, covId: conv._id });
    } else if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    } else {
      if (status === "accept") {
        await User.updateOne(
          { _id: reciever },
          {
            $pull: {
              messagerequests: { id: sender },
            },
          }
        );
        await User.updateOne(
          { _id: sender },
          {
            $pull: {
              msgrequestsent: { id: reciever },
            },
          }
        );
        const conv = new Conversation({
          members: [sender, reciever],
        });
        const savedconv = await conv.save();
        await User.updateOne(
          { _id: sender },
          {
            $push: {
              conversations: savedconv?._id,
            },
          }
        );
        await User.updateOne(
          { _id: reciever },
          {
            $push: {
              conversations: savedconv?._id,
            },
          }
        );
        res.status(200).json({ savedconv, success: true });
      } else {
        await User.updateOne(
          { _id: reciever },
          {
            $pull: {
              messagerequests: { id: sender },
            },
          }
        );
        await User.updateOne(
          { _id: sender },
          {
            $pull: {
              msgrequestsent: { id: reciever },
            },
          }
        );
        res.status(200).json({ success: true });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message, success: false });
  }
};

//fetch all msg reqs
exports.fetchallmsgreqs = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).populate({
      path: "messagerequests.id",
      select: "fullname username isverified profilepic",
    });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    } else {
      let dps = [];
      for (let i = 0; i < user.messagerequests.length; i++) {
        console.log(user?.messagerequests?.id);
        let pic = await generatePresignedUrl(
          "images",
          user?.messagerequests[i].id?.profilepic?.toString(),
          60 * 60
        );
        dps.push(pic);
      }

      res.status(200).json({ reqs: user.messagerequests, dps, success: true });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.newconv = async (req, res) => {
  const { mine, other } = req.body;
  const conv = new Conversation({
    members: [mine, other],
  });
  const convf = await Conversation.findOne({
    members: { $all: [mine, other] },
  });

  try {
    if (convf) {
      res.status(203).json({ success: false, covId: convf._id });
    } else {
      const savedConv = await conv.save();
      res.status(200).json({ savedConv, success: true });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

//check if conversation exists
exports.convexists = async (req, res) => {
  const { sender, reciever } = req.body;
  const recievingperson = await User.findById(reciever);
  const sendingperson = await User.findById(sender);
  try {
    const conv = await Conversation.findOne({
      members: { $all: [sender, reciever] },
    })
      .populate("members", "fullname username profilepic isverified")
      .sort({ createdAt: -1 });

    let existsbothway = false;
    if (
      sendingperson?.conversations?.includes(conv?._id?.toString()) &&
      recievingperson?.conversations?.includes(conv?._id?.toString())
    ) {
      existsbothway = true;
    }
    if (conv) {
      if (existsbothway) {
        res.status(200).json({
          success: true,
          existingreq: true,
          existsbothway: true,
        });
      } else {
        res.status(200).json({
          success: true,
          conv,
          existingreq: true,
          existsbothway: false,
        });
      }
    } else {
      if (recievingperson) {
        let Reqexits = false;

        for (const reqs of recievingperson?.messagerequests) {
          if (reqs?.id?.toString() === sendingperson?._id?.toString()) {
            Reqexits = true;
            break;
          }
        }
        for (const reqs of recievingperson?.msgrequestsent) {
          if (reqs?.id?.toString() === sendingperson?._id?.toString()) {
            Reqexits = true;
            break;
          }
        }
        for (const reqs of sendingperson?.msgrequestsent) {
          if (reqs?.id?.toString() === recievingperson?._id?.toString()) {
            Reqexits = true;
            break;
          }
        }
        for (const reqs of sendingperson.messagerequests) {
          if (reqs?.id?.toString() === recievingperson?._id?.toString()) {
            Reqexits = true;
            break;
          }
        }
        if (Reqexits) {
          res.status(200).json({ success: true, existingreq: true });
        } else {
          res.status(203).json({ success: true, existingreq: false });
        }
      } else {
        res.status(404).json({
          message: "User not found",
          success: false,
          existingreq: true,
        });
      }
    }
  } catch (e) {
    console.log(e);
    res
      .status(500)
      .json({ message: e.message, success: false, existingreq: true });
  }
};

//send message to existing person - Chats
exports.sendexistingmsg = async (req, res) => {
  try {
    const { convId } = req.params;
    const { sender, reciever } = req.body;
    const senderperson = await User.findById(sender);
    const recieverperson = await User.findById(reciever);
    if (!senderperson) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const conv = await Conversation.findById(convId);
      if (conv) {
        if (
          senderperson?.conversations?.includes(conv?._id?.toString()) &&
          recieverperson?.conversations?.includes(conv?._id?.toString())
        ) {
          res.status(200).json({ success: true });
        } else {
          await User.updateOne(
            { _id: senderperson._id },
            {
              $push: {
                conversations: convId,
              },
            }
          );
          res.status(200).json({ success: true });
        }
      } else {
        res
          .status(404)
          .json({ message: "Conversation not found", success: false });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.getallconv = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const conv = await Conversation.find({
      members: req.params.userId,
    }).populate("members", "fullname profilepic isverified");

    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      //check latest message
      let message = [];
      for (let i = 0; i < conv.length; i++) {
        const m = await Message.find({ conversationId: conv[i]._id })
          .sort({ createdAt: -1 })
          .limit(1);
        message.push(...m);
      }

      const receiver = [];
      //checking the reciever
      for (let i = 0; i < conv.length; i++) {
        for (let j = 0; j < conv[i].members.length; j++) {
          if (conv[i].members[j]._id.toString() !== req.params.userId) {
            const receiving = conv[i].members[j];
            receiver.push(receiving);
          }
        }
      }

      //for genrating prsignurl of reciever
      const receiverdp = [];
      for (let i = 0; i < conv.length; i++) {
        for (let j = 0; j < conv[i].members.length; j++) {
          if (conv[i].members[j]._id.toString() !== req.params.userId) {
            const a = await generatePresignedUrl(
              "images",
              conv[i].members[j].profilepic.toString(),
              60 * 60
            );
            receiverdp.push(a);
          }
        }
      }

      res.status(200).json({
        data: {
          conv,
          reqcount: user?.messagerequests?.length,
          receiver,
          receiverdp,
          message,
        },
        success: true,
      });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.getoneconv = async (req, res) => {
  const { convId, id } = req.params;
  const time = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const conv = await Message.find({
      conversationId: convId,
      hidden: { $nin: [id] },

      $or: [
        { dissapear: false },
        { createdAt: { $gt: time }, dissapear: true },
      ],
    })
      .limit(30)
      .sort({ createdAt: -1 });

    let content = [];
    for (let i = 0; i < conv.length; i++) {
      if (conv[i].content) {
        const a = await generatePresignedUrl(
          "messages",
          conv[i].content.toString(),
          60 * 60
        );
        content.push(a);
      } else if (conv[i].content) {
        const a = await generatePresignedUrl(
          "messages",
          conv[i].content.toString(),
          60 * 60
        );
        content.push(a);
      } else if (conv[i].content) {
        const a = await generatePresignedUrl(
          "messages",
          conv[i].content.toString(),
          60 * 60
        );
        content.push(a);
      } else {
        content.push("Nothing");
      }
    }

    const reversedConv = conv.reverse();
    const reversedCont = content.reverse();
    if (!conv) {
      res
        .status(404)
        .json({ message: "Conversation not found", success: false });
    } else {
      res.status(200).json({ reversedConv, reversedCont, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.removeconversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { convId } = req.body;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      await User.updateOne(
        { _id: id },
        {
          $pull: {
            conversations: convId,
          },
        }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.gettoken = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "No user found" });
    } else {
      const token = await user.token;
      res.status(200).json(token);
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//create msg req new
exports.createmessagereqnew = async (req, res) => {
  try {
    const { sender, message, reciever } = req.body;
    const sendingperson = await User.findById(sender);
    const recievingperson = await User.findById(reciever);

    let Reqexits = false;
    const conv = await Conversation.findOne({
      members: { $all: [sender, reciever] },
    });
    if (sendingperson && recievingperson) {
      if (conv) {
        res.status(203).json({
          success: true,
          covId: conv._id,
          convexists: true,
        });
      } else {
        //checking if req exits in both persons
        if (
          sendingperson?.conversations?.includes(conv?._id?.toString()) &&
          recievingperson?.conversations?.includes(conv?._id?.toString())
        ) {
          res
            .status(203)
            .json({ message: "Conv exists both ways!", success: false });
        }
        //checking if anyone is blocked
        else if (
          sendingperson.blockedpeople.find((f, i) => {
            return f.id.toString() === reciever;
          }) ||
          recievingperson.blockedpeople.find((f, i) => {
            return f.id.toString() === sender;
          })
        ) {
          res.status(203).json({ message: "You are blocked", success: false });
        } else {
          for (const reqs of recievingperson.messagerequests) {
            if (reqs.id.toString() === sender) {
              Reqexits = true;
              break;
            }
          }
          for (const reqs of recievingperson.msgrequestsent) {
            if (reqs.id.toString() === sender) {
              Reqexits = true;
              break;
            }
          }
          for (const reqs of sendingperson.msgrequestsent) {
            if (reqs.id.toString() === reciever) {
              Reqexits = true;
              break;
            }
          }
          for (const reqs of sendingperson.messagerequests) {
            if (reqs.id.toString() === reciever) {
              Reqexits = true;
              break;
            }
          }
          if (Reqexits) {
            res.status(200).json({ success: true, existingreq: true });
          } else {
            await User.updateOne(
              { _id: reciever },
              {
                $push: {
                  messagerequests: { id: sender, message: message },
                },
              }
            );
            await User.updateOne(
              { _id: sender },
              {
                $push: {
                  msgrequestsent: { id: reciever },
                },
              }
            );

            //message for notification
            let date = moment(new Date()).format("hh:mm");
            const msg = {
              notification: {
                title: "A new request has arrived.",
                body: `👋 Extend your hand and accept!!`,
              },
              data: {
                screen: "Requests",
                sender_fullname: `${sendingperson?.fullname}`,
                sender_id: `${sendingperson?._id}`,
                text: "A new request has arrived!!",
                isverified: `${sendingperson?.isverified}`,
                createdAt: `${date}`,
              },
              token: recievingperson?.notificationtoken,
            };

            await admin
              .messaging()
              .send(msg)
              .then((response) => {
                console.log("Successfully sent message");
              })
              .catch((error) => {
                console.log("Error sending message:", error);
              });

            res.status(200).json({ success: true });
          }
        }
      }
    } else {
      res.status(404).json({ message: "Invalid users", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//fetch convs new
exports.fetchallchatsnew = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user) {
      let reqcount = user?.messagerequests?.length;
      let conv = [];
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
          if (convs.members[j]._id?.toString() !== user._id.toString()) {
            let pi = await generatePresignedUrl(
              "images",
              convs?.members[j]?.profilepic?.toString(),
              60 * 60
            );
            let result = {
              convid: convs?._id,
              id: convs?.members[j]?._id,
              fullname: convs?.members[j]?.fullname,
              username: convs?.members[j]?.username,
              isverified: convs?.members[j]?.isverified,
              pic: pi,
              msgs: msg,
            };

            conv.push(result);
          } else {
            null;
          }
        }
      }
      conv.sort((c1, c2) => {
        const timeC1 = c1?.msgs[0]?.createdAt || 0;
        const timeC2 = c2?.msgs[0]?.createdAt || 0;
        return timeC2 - timeC1;
      });
      res.status(200).json({ success: true, reqcount, conv });
    } else {
      res.status(404).json({ message: "User not found", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};
