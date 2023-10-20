const Order = require("../models/orders");
const Product = require("../models/product");
const User = require("../models/userAuth");
const Minio = require("minio");
const Topic = require("../models/topic");
const stripe = require("stripe")(
  "sk_test_51NAGrZSEXlKwVDBNhya5wiyCmbRILf14f1Bk2uro1IMurrItZFsnmn7WNA0I5Q3RMnCVui1ox5v9ynOg3CGrFkHu00hLvIqqS1"
);
const Cart = require("../models/Cart");
const Subscription = require("../models/Subscriptions");

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

exports.create = async (req, res) => {
  const { userId, productId } = req.params;
  const { quantity, taxes, deliverycharges } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    } else {
      const order = new Order({
        buyerId: userId,
        productId: productId,
        quantity: quantity,
        total: product.price * quantity,
        sellerId: product.creator,
        orderId: Math.floor(Math.random() * 9000000) + 1000000,
        taxes: taxes,
        deliverycharges: deliverycharges,
      });
      await order.save();

      await User.updateOne(
        { _id: userId },
        { $push: { puchase_history: order._id } }
      );
      res.status(200).json(order);
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

exports.createtopicorder = async (req, res) => {
  const { id, topicId } = req.params;

  try {
    const user = await User.findById(id);
    const topic = await Topic.findById(topicId);
    if (user && topic) {
      if (!topic.members.includes(user._id)) {
        const subs = new Subscription({
          topic: topicId,
          orderId: Math.floor(Math.random() * 9000000) + 1000000,
          validity: "1 Month",
          status: "pending",
        });
        await subs.save();

        res.status(200).json({ success: true, orderId: subs._id });
      }
    } else {
      res.status(404).json({ message: e.message, success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.updateorder = async (req, res) => {
  const { id, topicId, orderId } = req.params;
  const { success, paymentId, paymentMode } = req.body;
  try {
    const user = await User.findById(id);
    const topic = await Topic.findById(topicId);
    if (user && topic) {
      if (!topic.members.includes(user._id)) {
        await User.updateOne(
          { _id: user._id },
          { $push: { topicsjoined: topic._id }, $inc: { totaltopics: 1 } }
        );
        await Topic.updateOne(
          { _id: topic._id },
          { $push: { members: user._id }, $inc: { memberscount: 1 } }
        );
        await Subscription.updateOne(
          { _id: orderId },
          {
            $set: {
              status: success,
              paymentId: paymentId,
              paymentMode: paymentMode,
            },
          }
        );
        res.status(200).json({ success: true });
      }
    } else {
      res.status(404).json({ message: e.message, success: false });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.status = async (req, res) => {
  const { userId, productId, orderId } = req.params;
  const { status } = req.body;
  try {
    const updatestatus = await Order.findByIdAndUpdate(
      { _id: orderId },
      { $set: { currentStatus: status } },
      { new: true }
    );
    res.status(200).json(updatestatus);
  } catch (e) {
    res.status(400).json(e.message);
  }
};

exports.details = async (req, res) => {
  const { userId, orderId } = req.params;
  try {
    const user = await User.findById(userId);
    const order = await Order.findById(orderId)
      .populate("sellerId", "storeAddress")
      .populate("buyerId", "address")
      .populate("productId", "images name price totalstars");
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else if (!order) {
      res.status(404).json({ message: "Order not found", success: false });
    } else {
      const url = await generatePresignedUrl(
        "products",
        order.productId.images[0].toString(),
        60 * 60
      );

      res.status(200).json({ order, url, success: true });
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

exports.createcartorder = async (req, res) => {
  const { userId } = req.params;
  const { quantity, deliverycharges, productId, total } = req.body;
  console.log(req.body);
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    } else {
      const order = new Order({
        buyerId: userId,
        productId: productId,
        quantity: quantity,
        total: total,
        orderId: Math.floor(Math.random() * 9000000) + 1000000,

        deliverycharges: deliverycharges,
      });
      await order.save();

      await User.updateOne(
        { _id: userId },
        { $push: { puchase_history: order._id } }
      );
      res.status(200).json({ orderId: order._id, success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.updatecartorder = async (req, res) => {
  const { userId, orderId } = req.params;
  const { paymentId, success, paymentmode } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    } else {
      const o = await Order.findById(orderId);
      await Order.updateOne(
        { _id: o._id },
        {
          $set: {
            currentStatus: success,
            paymentId: paymentId,
            paymentMode: paymentmode,
          },
        }
      );
      if (success) {
        await User.updateOne({ _id: user._id }, { $unset: { cart: [] } });
      }
      await res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};
