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
const admin = require("../fireb");
const geolib = require("geolib");
const Locations = require("../models/locations");
const natural = require("natural");
const Deluser = require("../models/deluser");
const Delivery = require("../models/deliveries");

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

//string matching function
function findBestMatch(inputString, stringArray) {
  let bestMatch = null;
  let bestScore = -1;

  stringArray.forEach((str) => {
    const distance = natural.LevenshteinDistance(inputString, str);
    const similarity = 1 - distance / Math.max(inputString.length, str.length);

    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = str;
    }
  });

  return { bestMatch, bestScore };
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

// const geta = async () => {
//   //taking customers current location
//   const cuslat = "2";
//   const cuslong = "5";

//   const locs = await Locations.find();
//   const custcity = "kanpur";
//   let result;

//   for (let i = 0; i < locs.length; i++) {
//     const titleArray = Array.isArray(locs[i]?.title)
//       ? locs[i]?.title
//       : [locs[i]?.title];
//     result = findBestMatch(
//       custcity.toLowerCase().trim() || custcity.toLowerCase(),
//       titleArray
//     );
//   }

//   const getb = async () => {
//     let storedlocs = [];
//     const cityofcust = await Locations.findOne({ title: result?.bestMatch });
//     for (let i = 0; i < cityofcust.stores.length; i++) {
//       storedlocs.push({
//         latitude: cityofcust.stores[i].address.coordinates.latitude,
//         longitude: cityofcust.stores[i].address.coordinates.longitude,
//         storeid: cityofcust.stores[i].storeid,
//       });
//     }

//     const a = geolib.findNearest(
//       { latitude: cuslat, longitude: cuslong },
//       storedlocs
//     );

//     const storeuser = await Deluser.findById(a?.storeid);
//     let eligibledriver = [];

//     for (let i = 0; i < storeuser?.deliverypartners?.length; i++) {
//       const deliverypartner = await Deluser.findById(
//         storeuser?.deliverypartners[i]?.id
//       );

//       if (
//         deliverypartner &&
//         deliverypartner.accstatus !== "blocked" &&
//         deliverypartner.accstatus !== "review" &&
//         deliverypartner.deliveries?.length < 21
//       ) {
//         let driverloc = {
//           latitude: deliverypartner.currentlocation?.latitude,
//           longitude: deliverypartner.currentlocation?.longitude,
//           id: deliverypartner?._id,
//         };
//         eligibledriver.push(driverloc);
//       }
//     }

//     if (eligibledriver?.length > 0) {
//       const nearestpartner = geolib.findNearest(
//         { latitude: cuslat, longitude: cuslong },
//         eligibledriver
//       );

//       if (nearestpartner) {
//         const driver = await Deluser?.findById(nearestpartner?.id);

//         const newDeliveries = new Delivery({
//           title: product?.name,
//           amount: total,
//           orderId: oi,
//           address: user?.address,
//           partner: driver?._id,
//         });
//         await newDeliveries.save();
//         const msg = {
//           notification: {
//             title: "A new order has arrived.",
//             body: `From ${user?.fullname} Total ₹${total}`,
//           },
//           data: {},
//           tokens: [
//             user?.notificationtoken,
//             driver?.notificationtoken,
//             storeuser?.notificationtoken,
//           ],
//         };

//         await admin
//           .messaging()
//           .sendEachForMulticast(msg)
//           .then((response) => {
//             console.log("Successfully sent message");
//           })
//           .catch((error) => {
//             console.log("Error sending message:", error);
//           });
//       }
//     } else {
//       console.log("No delivery partner is available at the moment!");
//     }
//   };
//   getb();
// };
// geta();

//cart order

exports.createcartorder = async (req, res) => {
  const { userId } = req.params;
  const { quantity, deliverycharges, productId, total } = req.body;

  try {
    const user = await User.findById(userId);
    const product = await Product.findById(productId);
    let oi = Math.floor(Math.random() * 9000000) + 1000000;
    if (!user && !product) {
      return res.status(404).json({ message: "User or Product not found" });
    } else {
      //a new order is created
      const order = new Order({
        buyerId: userId,
        productId: productId,
        quantity: quantity,
        total: total,
        orderId: oi,
        paymentMode: "Cash",
        currentStatus: "success",
        deliverycharges: deliverycharges,
      });
      await order.save();
      //upating order in customers purchase history
      await User.updateOne(
        { _id: userId },
        { $push: { puchase_history: order._id } }
      );
      await User.updateOne({ _id: user._id }, { $unset: { cart: [] } });

      //assigning the delivery to the nearest driver
      const cuslat = user.address.coordinates.latitude;
      const cuslong = user.address.coordinates.longitude;

      const locs = await Locations.find();
      const custcity = user.address.city;
      let result;

      for (let i = 0; i < locs.length; i++) {
        const titleArray = Array.isArray(locs[i]?.title)
          ? locs[i]?.title
          : [locs[i]?.title];
        result = findBestMatch(
          custcity.toLowerCase().trim() || custcity.toLowerCase(),
          titleArray
        );
      }

      const assigntodriver = async () => {
        let storedlocs = [];
        const cityofcust = await Locations.findOne({
          title: result?.bestMatch,
        });
        for (let i = 0; i < cityofcust.stores.length; i++) {
          storedlocs.push({
            latitude: cityofcust.stores[i].address.coordinates.latitude,
            longitude: cityofcust.stores[i].address.coordinates.longitude,
            storeid: cityofcust.stores[i].storeid,
          });
        }

        const neareststore = geolib.findNearest(
          { latitude: cuslat, longitude: cuslong },
          storedlocs
        );

        const storeuser = await Deluser.findById(neareststore?.storeid);
        let eligibledriver = [];

        for (let i = 0; i < storeuser?.deliverypartners?.length; i++) {
          const deliverypartner = await Deluser.findById(
            storeuser?.deliverypartners[i]?.id
          );

          if (
            deliverypartner &&
            deliverypartner.accstatus !== "blocked" &&
            deliverypartner.accstatus !== "review" &&
            deliverypartner.deliveries?.length < 21
          ) {
            let driverloc = {
              latitude: deliverypartner.currentlocation?.latitude,
              longitude: deliverypartner.currentlocation?.longitude,
              id: deliverypartner?._id,
            };
            eligibledriver.push(driverloc);
          }
        }

        if (eligibledriver?.length > 0) {
          const nearestpartner = geolib.findNearest(
            { latitude: cuslat, longitude: cuslong },
            eligibledriver
          );

          if (nearestpartner) {
            const driver = await Deluser?.findById(nearestpartner?.id);

            const newDeliveries = new Delivery({
              title: product?.name,
              amount: total,
              orderId: oi,
              address: user?.address,
              partner: driver?._id,
            });
            await newDeliveries.save();

            const data = {
              name: user?.name,
              address: user?.address,
              amount: total,
              id: newDeliveries?._id,
            };

            await Deluser.updateOne(
              { _id: driver?._id },
              {
                $push: { deliveries: data },
              }
            );

            const msg = {
              notification: {
                title: "A new order has arrived.",
                body: `From ${user?.fullname} Total ₹${total}`,
              },
              data: {},
              tokens: [
                user?.notificationtoken,
                driver?.notificationtoken,
                storeuser?.notificationtoken,
              ],
            };

            await admin
              .messaging()
              .sendEachForMulticast(msg)
              .then((response) => {
                console.log("Successfully sent message");
              })
              .catch((error) => {
                console.log("Error sending message:", error);
              });
          }
        } else {
          console.log("No delivery partner is available at the moment!");
        }
      };
      assigntodriver();
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
