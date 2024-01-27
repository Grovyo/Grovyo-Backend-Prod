const Order = require("../models/orders");
const Product = require("../models/product");
const User = require("../models/userAuth");
const Minio = require("minio");
const Topic = require("../models/topic");
const stripe = require("stripe")(
  "sk_test_51NAGrZSEXlKwVDBNhya5wiyCmbRILf14f1Bk2uro1IMurrItZFsnmn7WNA0I5Q3RMnCVui1ox5v9ynOg3CGrFkHu00hLvIqqS1"
);
const Earn = require("../models/earnings");
const Cart = require("../models/Cart");
const Subscription = require("../models/Subscriptions");
const admin = require("../fireb");
const geolib = require("geolib");
const Locations = require("../models/locations");
const natural = require("natural");
const Deluser = require("../models/deluser");
const Delivery = require("../models/deliveries");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const Pdf = require("pdf-creator-node");
const fs = require("fs");
const Razorpay = require("razorpay");
const {
  validatePaymentVerification,
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

const instance = new Razorpay({
  key_id: "rzp_live_Ms5I8V8VffSpYq",
  key_secret: "Sy04bmraRqV9RjLRj81MX0g7",
});

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

//cart order

//creating a new order
exports.createcartorder = async (req, res) => {
  const { userId } = req.params;
  const { quantity, deliverycharges, productId, total } = req.body;

  try {
    const user = await User.findById(userId);
    const product = await Product.findById(productId).populate(
      "creator",
      "storeAddress"
    );
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
        timing: "Tommorow, by 7:00 pm",
      });
      await order.save();
      //upating order in customers purchase history
      await User.updateOne(
        { _id: userId },
        { $push: { puchase_history: order._id } }
      );
      await User.updateOne(
        { _id: user._id },
        { $unset: { cart: [], cartproducts: [] } }
      );

      //assigning the delivery to the nearest driver
      const cuslat = user.address.coordinates.latitude;
      const cuslong = user.address.coordinates.longitude;

      //business address
      const businessaddress = product?.creator;

      const locs = await Locations.find();
      const custcity = user.address.city;

      let checkeddistance;
      //checking distance btw customer and business
      const checkdistance = async () => {
        const businesslatlong = product?.creator?.storeAddress?.coordinates;
        const ispointinrange = geolib.isPointWithinRadius(
          { latitude: cuslat, longitude: cuslong },
          businesslatlong,
          10000
        );

        checkeddistance = ispointinrange;
      };
      checkdistance();

      // if business and custmer location are near each other i.e. within range of 10km to be exact
      if (checkeddistance) {
        let firstresult;
        for (let i = 0; i < locs.length; i++) {
          const titleArray = Array.isArray(locs[i]?.title)
            ? locs[i]?.title
            : [locs[i]?.title];
          firstresult = findBestMatch(
            businessaddress?.storeAddress?.city.toLowerCase().trim() ||
              businessaddress?.storeAddress?.city.toLowerCase(),
            titleArray
          );
        }
        const assigntodriver = async () => {
          let storedlocs = [];
          const cityofbusiness = await Locations.findOne({
            title: firstresult?.bestMatch,
          });
          for (let i = 0; i < cityofbusiness.stores.length; i++) {
            storedlocs.push({
              latitude: cityofbusiness.stores[i].address.coordinates.latitude,
              longitude: cityofbusiness.stores[i].address.coordinates.longitude,
              storeid: cityofbusiness.stores[i].storeid,
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
              deliverypartner.deliveries?.length < 21 &&
              deliverypartner?.balance?.amount < 3000
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

              let droppingaddress = {
                streetaddress: user?.address?.streetaddress,
                landmark: user?.address?.landmark,
                city: user?.address?.city,
                pincode: user?.address?.pincode,
                state: user?.address?.state,
                country: user?.address?.country,
                coordinates: {
                  latitude: user?.address?.coordinates?.latitude,
                  longitude: user?.address?.coordinates?.longitude,
                  accuracy: user?.address?.coordinates?.accuracy,
                  provider: user?.address?.coordinates?.provider,
                  bearing: user?.address?.coordinates?.bearing,
                  altitude: user?.address?.coordinates?.altitude,
                },
              };
              let pickupaddress = {
                streetaddress: businessaddress?.storeAddress?.streetaddress,
                landmark: businessaddress?.storeAddress?.landmark,
                city: businessaddress?.storeAddress?.city,
                pincode: businessaddress?.storeAddress?.pincode,
                state: businessaddress?.storeAddress?.state,
                country: businessaddress?.storeAddress?.country,
                coordinates: {
                  latitude:
                    businessaddress?.storeAddress?.coordinates?.latitude,
                  longitude:
                    businessaddress?.storeAddress?.coordinates?.longitude,
                  accuracy:
                    businessaddress?.storeAddress?.coordinates?.accuracy,
                  provider:
                    businessaddress?.storeAddress?.coordinates?.provider,
                  bearing: businessaddress?.storeAddress?.coordinates?.bearing,
                  altitude:
                    businessaddress?.storeAddress?.coordinates?.altitude,
                },
              };

              //checking current time
              const currentHour = new Date().getHours();
              if (currentHour >= 15) {
                const newDeliveries = new Delivery({
                  title: product?.name,
                  amount: total,
                  orderId: oi,
                  type: "pick & drop",
                  pickupaddress: pickupaddress,
                  droppingaddress: droppingaddress,
                  partner: driver?._id,
                  status: "Not Started",
                  timing: "Today, by 7:00pm",
                  phonenumber: user?.phone,
                });
                await newDeliveries.save();

                const data = {
                  name: user?.fullname,
                  pickupaddress: pickupaddress,
                  droppingaddress: droppingaddress,
                  amount: total,
                  id: newDeliveries?._id,
                  status: "Not Started",
                  timing: "Today, by 7:00pm",
                  phonenumber: user?.phone,
                  type: "pick & drop",
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
                    // user?.notificationtoken,
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
            }
          } else {
            console.log("No delivery partner is available at the moment!");
          }
        };
        assigntodriver();
      }
      // if business and customer are away from each other i.e. out of 10km range
      else {
        //getting the nearest affiliatestore of business
        let firstresult;
        for (let i = 0; i < locs.length; i++) {
          const titleArray = Array.isArray(locs[i]?.title)
            ? locs[i]?.title
            : [locs[i]?.title];
          firstresult = findBestMatch(
            businessaddress?.storeAddress?.city.toLowerCase().trim() ||
              businessaddress?.storeAddress?.city.toLowerCase(),
            titleArray
          );
        }
        const assigntodriver = async () => {
          let storedlocs = [];
          const cityofbusiness = await Locations.findOne({
            title: firstresult?.bestMatch,
          });
          for (let i = 0; i < cityofbusiness.stores.length; i++) {
            storedlocs.push({
              latitude: cityofbusiness.stores[i].address.coordinates.latitude,
              longitude: cityofbusiness.stores[i].address.coordinates.longitude,
              storeid: cityofbusiness.stores[i].storeid,
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
              deliverypartner.deliveries?.length < 21 &&
              deliverypartner?.balance?.amount < 3000
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

              let droppingaddress = {
                streetaddress: storeuser?.address?.streetaddress,
                landmark: storeuser?.address?.landmark,
                city: storeuser?.address?.city,
                pincode: storeuser?.address?.pincode,
                state: storeuser?.address?.state,
                country: storeuser?.address?.country,
                coordinates: {
                  latitude: storeuser?.address?.coordinates?.latitude,
                  longitude: storeuser?.address?.coordinates?.longitude,
                  accuracy: storeuser?.address?.coordinates?.accuracy,
                  provider: storeuser?.address?.coordinates?.provider,
                  bearing: storeuser?.address?.coordinates?.bearing,
                  altitude: storeuser?.address?.coordinates?.altitude,
                },
              };
              let pickupaddress = {
                streetaddress: businessaddress?.storeAddress?.streetaddress,
                landmark: businessaddress?.storeAddress?.landmark,
                city: businessaddress?.storeAddress?.city,
                pincode: businessaddress?.storeAddress?.pincode,
                state: businessaddress?.storeAddress?.state,
                country: businessaddress?.storeAddress?.country,
                coordinates: {
                  latitude:
                    businessaddress?.storeAddress?.coordinates?.latitude,
                  longitude:
                    businessaddress?.storeAddress?.coordinates?.longitude,
                  accuracy:
                    businessaddress?.storeAddress?.coordinates?.accuracy,
                  provider:
                    businessaddress?.storeAddress?.coordinates?.provider,
                  bearing: businessaddress?.storeAddress?.coordinates?.bearing,
                  altitude:
                    businessaddress?.storeAddress?.coordinates?.altitude,
                },
              };

              //checking current time
              const currentHour = new Date().getHours();
              if (currentHour >= 15) {
                const newDeliveries = new Delivery({
                  title: product?.name,
                  amount: total,
                  orderId: oi,
                  type: "pickup",
                  pickupaddress: pickupaddress,
                  droppingaddress: droppingaddress,
                  partner: driver?._id,
                  status: "Not Started",
                  timing: "Today, by 7:00pm",
                  phonenumber: user?.phone,
                });
                await newDeliveries.save();

                const data = {
                  name: user?.fullname,
                  pickupaddress: pickupaddress,
                  droppingaddress: droppingaddress,
                  amount: total,
                  id: newDeliveries?._id,
                  status: "Not Started",
                  timing: "Today, by 7:00pm",
                  phonenumber: user?.phone,
                  type: "pickup",
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
                    // user?.notificationtoken,
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
            }
          } else {
            console.log("No delivery partner is available at the moment!");
          }
        };
        assigntodriver();
      }

      res.status(200).json({ orderId: order._id, success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

//updating the order
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

exports.createpdf = async (req, res) => {
  try {
    let html = fs.readFileSync("./template.html", "utf8");
    let options = {
      format: "A4",
      orientation: "portrait",
      border: "10mm",
      header: {
        height: "30mm",
        contents:
          '<div style="text-align: center;  font-weight: 700;">Tax Invoice</div>',
      },
      footer: {
        height: "28mm",
        contents: {
          first: "Cover page",
          2: "Second page", // Any page number is working. 1-based index
          default:
            '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
          last: "Last Page",
        },
      },
    };
    let users = [
      {
        name: "Shyam",
        age: "26",
      },
      {
        name: "Navjot",
        age: "26",
      },
      {
        name: "Vitthal",
        age: "26",
      },
      {
        name: "Vitthal",
        age: "26",
      },
      {
        name: "Vitthal",
        age: "26",
      },
    ];
    var document = {
      html: html,
      data: {
        users: users,
      },
      path: "./output.pdf",
      type: "",
    };
    Pdf.create(document, options)
      .then((res) => {
        console.log(res);
      })
      .catch((error) => {
        console.error(error);
      });
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

//create a new product order(UPI)
exports.createrzporder = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, deliverycharges, productId, total, rzptotal } = req.body;

    const user = await User.findById(id);
    const product = await Product.findById(productId).populate(
      "creator",
      "storeAddress"
    );
    let oi = Math.floor(Math.random() * 9000000) + 1000000;

    if (!user && !product) {
      return res.status(404).json({ message: "User or Product not found" });
    } else {
      //a new order is created
      const ord = new Order({
        buyerId: user._id,
        productId: productId,
        quantity: quantity,
        total: total,
        orderId: oi,
        paymentMode: "UPI",
        currentStatus: "pending",
        deliverycharges: deliverycharges,
        timing: "Tommorow, by 7:00 pm",
      });
      await ord.save();

      //upating order in customers purchase history
      await User.updateOne(
        { _id: id },
        { $push: { puchase_history: ord._id } }
      );

      let pids = JSON.stringify(productId);

      //creatign a rzp order
      instance.orders.create(
        {
          amount: parseInt(rzptotal),
          currency: "INR",
          receipt: `receipt#${oi}`,
          notes: {
            total,
            quantity,
            deliverycharges,
            pids,
            total,
          },
        },
        function (err, order) {
          console.log(err, order);
          if (err) {
            res.status(400).json({ err, success: false });
          } else {
            res.status(200).json({
              oid: order.id,
              order: ord._id,
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

//finalising the product order(UPI)
exports.finaliseorder = async (req, res) => {
  try {
    const { id, ordId } = req.params;
    const {
      oid,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status,
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User or Product not found" });
    } else {
      const isValid = validatePaymentVerification(
        { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
        razorpay_signature,
        "Sy04bmraRqV9RjLRj81MX0g7"
      );

      if (isValid) {
        await Order.updateOne(
          { _id: ordId },
          { $set: { currentStatus: status, onlineorderid: oid } }
        );
        await User.updateOne(
          { _id: user._id },
          { $unset: { cart: [], cartproducts: [] } }
        );

        // geta({
        //   customer: {
        //     latitude: user.address.coordinates.latitude,
        //     longitude: user.address.coordinates.longitude,
        //   },
        //   store:{
        //     latitude:
        //   }
        // });
        res.status(200).json({ success: true });
      } else {
        await Order.updateOne(
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

//create a new product order(cod)
exports.createnewproductorder = async (req, res) => {
  const { userId } = req.params;
  const { quantity, deliverycharges, productId, total } = req.body;

  try {
    const user = await User.findById(userId);
    const product = await Product.findById(productId).populate(
      "creator",
      "storeAddress"
    );
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
        timing: "Tommorow, by 7:00 pm",
      });
      await order.save();
      //upating order in customers purchase history
      await User.updateOne(
        { _id: userId },
        { $push: { puchase_history: order._id } }
      );
      await User.updateOne(
        { _id: user._id },
        { $unset: { cart: [], cartproducts: [] } }
      );

      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

//remove item from cart
exports.removecartorder = async (req, res) => {
  try {
    const { id, cartId, productId } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User or Product not found" });
    } else {
      await User.updateOne(
        { _id: user._id },
        {
          $pull: {
            cartproducts: productId,
            cart: cartId,
          },
        }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ success: false });
  }
};

//creating deliveries after order
exports.deliverycreate = async (req, res) => {
  try {
    const { id, pickupid } = req.params;
    const { oid, total } = req.body;

    const user = await User.findById(id);
    const store = await User.findById(pickupid);
    const order = await Order.findOne({ orderId: oid });
    if (user && store) {
      //checking if user and store are under 20 km range
      const check = geolib.isPointWithinRadius(
        {
          latitude: user?.address?.coordinates?.latitude,
          longitude: user?.address?.coordinates?.longitude,
        },
        {
          latitude: store?.address?.coordinates?.latitude,
          longitude: store?.address?.coordinates?.longitude,
        },
        20000
      );

      if (check) {
        //This part will run when customer and store are under 20kms range
        // const locs = await Locations.find();
        // const custcity = user.address.city;
        // let result;

        // //finding city of customer
        // for (let i = 0; i < locs.length; i++) {
        //   const titleArray = Array.isArray(locs[i]?.title)
        //     ? locs[i]?.title
        //     : [locs[i]?.title];
        //   result = findBestMatch(
        //     custcity.toLowerCase().trim() || custcity.toLowerCase(),
        //     titleArray
        //   );
        // }
        let eligibledriver = [];
        //for now delivery will be assigfned to any person
        // for (let i = 0; i < store?.deliverypartners?.length; i++) {
        const deliverypartner = await Deluser.findOne({
          accounttype: "partner",
        });

        if (
          deliverypartner &&
          deliverypartner.accstatus !== "banned" &&
          deliverypartner.accstatus !== "review" &&
          deliverypartner.deliveries?.length < 21 &&
          deliverypartner.totalbalance < 3000
        ) {
          let driverloc = {
            latitude: deliverypartner.currentlocation?.latitude,
            longitude: deliverypartner.currentlocation?.longitude,
            id: deliverypartner?._id,
          };
          eligibledriver.push(driverloc);
        }
        // }

        if (eligibledriver?.length > 0) {
          const nearestpartner = geolib.findNearest(
            {
              latitude: deliverypartner.currentlocation?.latitude,
              longitude: deliverypartner.currentlocation?.longitude,
            },
            eligibledriver
          );

          if (nearestpartner) {
            const driver = await Deluser?.findById(nearestpartner?.id);

            const newDeliveries = new Delivery({
              title: user?.fullname,
              amount: total,
              orderId: oid,
              pickupaddress: store?.storeAddress,
              partner: driver?._id,
              droppingaddress: user?.address,
              phonenumber: user.phone,
              //mode: order.paymentMode ? order?.paymentMode : "Cash",
            });
            await newDeliveries.save();

            //pushing delivery for driver
            await Deluser.updateOne(
              { _id: driver._id },
              { $push: { deliveries: newDeliveries._id } }
            );
            const msg = {
              notification: {
                title: "A new order has arrived.",
                body: `From ${user?.fullname} OrderId ₹${oid}`,
              },
              data: {},
              tokens: [
                user?.notificationtoken,
                driver?.notificationtoken,
                store?.notificationtoken, //person who selles this item
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
          res.status(200).json({ success: true });
        } else {
          console.log("No delivery partner is available at the moment!");
          res.status(203).json({ success: false });
        }
      } else {
        //This Part will run when we still have to deliver more than 20kms
        const locs = await Locations.find();
        const custcity = user.address.city;
        let result;

        //finding city of customer
        for (let i = 0; i < locs.length; i++) {
          const titleArray = Array.isArray(locs[i]?.title)
            ? locs[i]?.title
            : [locs[i]?.title];
          result = findBestMatch(
            custcity.toLowerCase().trim() || custcity.toLowerCase(),
            titleArray
          );
        }

        //finding nearest store
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

        const a = geolib.findNearest(
          {
            latitude: user?.address?.coordinates?.latitude,
            longitude: user?.address?.coordinates?.longitude,
          },
          storedlocs
        );

        //finding nearest driver
        const storeuser = await Deluser.findById(a?.storeid);
        let eligibledriver = [];

        for (let i = 0; i < storeuser?.deliverypartners?.length; i++) {
          const deliverypartner = await Deluser.findById(
            storeuser?.deliverypartners[i]?.id
          );

          if (
            deliverypartner &&
            deliverypartner.accstatus !== "banned" &&
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
            {
              latitude: eligibledriver?.latitude,
              longitude: eligibledriver?.longitude,
            },
            eligibledriver
          );

          if (nearestpartner) {
            const driver = await Deluser?.findById(nearestpartner?.id);

            const newDeliveries = new Delivery({
              title: user?.fullname,
              amount: total,
              orderId: oid,
              pickupaddress: store?.storeAddress,
              partner: driver?._id,
              droppingaddress: user?.address,
              phonenumber: user.phone,
              mode: order.paymentMode,
            });
            await newDeliveries.save();
            //pushing delivery to driver
            await Deluser.updateOne(
              { _id: driver._id },
              { $push: { deliveries: newDeliveries._id } }
            );

            //pushing order to store
            await Deluser.updateOne(
              { _id: storeuser._id },
              {
                $push: {
                  deliveries: newDeliveries._id,
                  pickup: newDeliveries._id,
                },
              }
            );
            const msg = {
              notification: {
                title: "A new order has arrived.",
                body: `From ${user?.fullname} OrderId ₹${oid}`,
              },
              data: {},
              tokens: [
                user?.notificationtoken,
                driver?.notificationtoken,
                storeuser?.notificationtoken, //person who is affiliate
                store.notificationtoken, //person who sells this item
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
          res.status(200).json({ success: true });
        } else {
          res.status(203).json({ success: false });
          console.log("No delivery partner is available at the moment!");
        }
      }
    } else {
      res
        .status(404)
        .json({ message: "Something not found...", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "Something went wrong", success: false });
  }
};

//scanning qr
exports.scannedqr = async (req, res) => {
  try {
    const { id, delid } = req.params;
    const { phonenumber, oid } = req.body;
    let flashid = "655e189fb919c70bf6895485";
    const partner = await Deluser.findById(id);
    const user = await User.findOne({ phone: phonenumber });
    const delivery = await Delivery.findById(delid);
    const flash = await User.findById(flashid);

    const senderpic = await generatePresignedUrl(
      "images",
      flash.profilepic.toString(),
      60 * 60
    );
    const recpic = await generatePresignedUrl(
      "images",
      user.profilepic.toString(),
      60 * 60
    );

    //generating otp
    function generateOTP() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    //generating mesId
    function msgid() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    if (partner && delivery && user) {
      const otp = generateOTP();
      const mesId = msgid();
      let finalotp = {
        otp: otp,
        timing: Date.now().toString(),
      };
      const convs = await Conversation.findOne({
        members: { $all: [user?._id, flash._id] },
      });

      if (convs) {
        let data = {
          conversationId: convs._id,
          sender: flash._id,
          text: `Your Otp for confirmation of receiving your order with orderId ${oid} is ${otp}. This Otp is valid for 10 mins, please share it with our partner.`,
          mesId: mesId,
        };
        const m = new Message(data);
        await m.save();
        await Deluser.updateOne(
          { _id: partner._id },
          {
            $set: {
              currentotp: finalotp,
            },
          }
        );

        const timestamp = `${new Date()}`;
        const msg = {
          notification: {
            title: `Grovyo Flash`,
            body: `Your Otp for confirmation of receiving your order is ${otp}. This Otp is valid for 10 mins, please share it with our partner.`,
          },
          data: {
            screen: "Conversation",
            sender_fullname: `${user?.fullname}`,
            sender_id: `${user?._id}`,
            text: `Your Otp for confirmation of receiving your order is ${otp}. This Otp is valid for 10 mins, please share it with our partner.`,
            convId: `${convs?._id}`,
            createdAt: `${timestamp}`,
            mesId: `${mesId}`,
            typ: `message`,
            senderuname: `${user?.username}`,
            senderverification: `${user.isverified}`,
            senderpic: `${recpic}`,
            reciever_fullname: `${flash.fullname}`,
            reciever_username: `${flash.username}`,
            reciever_isverified: `${flash.isverified}`,
            reciever_pic: `${senderpic}`,
            reciever_id: `${flash._id}`,
          },
          token: user?.notificationtoken,
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
      } else {
        const conv = new Conversation({
          members: [user?._id, flash._id],
        });
        await conv.save();
        let data = {
          conversationId: conv._id,
          sender: flash._id,
          text: `Your Otp for confirmation of reciving your order is ${otp}. This Otp is valid for 10 mins, please share it with our partner.`,
          mesId: mesId,
        };
        const m = new Message(data);
        await m.save();
        await Deluser.updateOne(
          { _id: partner._id },
          {
            $set: {
              currentotp: finalotp,
            },
          }
        );
        await User.updateOne(
          { _id: user?._id },
          {
            $push: {
              conversations: conv?._id,
            },
          }
        );
        await User.updateOne(
          { _id: flash._id },
          {
            $push: {
              conversations: conv?._id,
            },
          }
        );
        const msg = {
          notification: {
            title: `Grovyo Flash`,
            body: `Your Otp for confirmation of reciving your order is ${otp}. This Otp is valid for 10 mins, please share it with our partner.`,
          },
          data: {},
          token: user?.notificationtoken,
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
      }
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({
        message: "User or Delivery or partner not found",
        success: false,
      });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};

//enter the otp
exports.enterotp = async (req, res) => {
  try {
    const { id, deliveryid } = req.params;
    const { otp, km } = req.body;
    const user = await Deluser.findById(id);
    const delivery = await Delivery.findById(deliveryid);
    const order = await Order.findOne({ orderId: delivery?.orderId });

    if (user && delivery && order) {
      //checking if time is under 10 minutes

      const providedTime = new Date(user?.currentotp?.timing);
      const currentTime = new Date();

      const timeDifferenceInMinutes =
        (currentTime - providedTime) / (1000 * 60);
      const isValid = timeDifferenceInMinutes < 10;

      //calculating money earned - 4rs/km
      let earnedmoney = km * 4;
      if (isValid) {
        if (otp === user?.currentotp?.otp.toString()) {
          await Delivery.updateOne(
            { _id: delivery?._id },
            { $set: { status: "Completed" } }
          );

          const earn = new Earn({
            title: user.fullname,
            id: user._id,
            amount: order.total,
          });
          await earn.save();
          let earning = {
            timing: Date.now(),
            amount: order.total,
            id: earn._id,
            mode: "Delivery",
          };
          //if order was supposed to be paid in cash mode
          if (order.paymentMode === "Cash") {
            let balance = {
              amount: order.total,
              time: Date.now(),
              delid: user._id,
              mode: "Delivery",
            };
            if (user.accounttype === "affiliate") {
              await Deluser.updateOne(
                { _id: user._id },
                {
                  $pull: {
                    pickup: delivery._id,
                  },
                }
              );
            }
            await Deluser.updateOne(
              { _id: user._id },
              {
                $set: { currentdoing: null },
                $inc: {
                  totalearnings: earnedmoney,
                  totalbalance: order.total,
                  deliverycount: 1,
                },
                $push: {
                  balance: balance,
                  earnings: earning,
                  finisheddeliveries: delivery._id,
                },
              }
            );
          } else {
            await Deluser.updateOne(
              { _id: user._id },
              {
                $set: { currentdoing: null },
                $inc: { totalearnings: earnedmoney, deliverycount: 1 },
                $push: { earnings: earning, finisheddeliveries: delivery._id },
              }
            );
          }

          //Giving money to affiliate who refered to this partner if any
          if (user.deliverycount === 1) {
            if (aff) {
              const aff = await Deluser.findById({
                referalid: user?.referalid,
              });
              let newearning = {
                timing: Date.now(),
                amount: 30,
                mode: "Refer",
                id: earn._id,
              };
              await Deluser.updateOne(
                { _id: aff._id },
                {
                  $push: { earnings: newearning },
                  $inc: { totalearnings: 30 },
                }
              );
            }
          }
          const date = new Date(Date.now());

          const formattedDate =
            date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }) +
            " at " +
            date.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            });

          await Order.updateOne(
            { orderId: delivery?.orderId },
            {
              $set: {
                currentStatus: "completed",
                timing: formattedDate,
              },
            }
          );

          res.status(200).json({
            message: "Validated succesfully",
            success: true,
            isotpvalid: true,
          });
        } else {
          res
            .status(201)
            .json({ message: "Invalid Otp", success: true, isotpvalid: false });
        }
      } else {
        res
          .status(203)
          .json({ message: "Otp expired", success: false, isotpvalid: false });
      }
    } else {
      res.status(404).json({
        message: "User or Delivery not found",
        success: false,
        sotpvalid: false,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({
      message: "Something went wrong",
      success: false,
      sotpvalid: false,
    });
  }
};

//resend otp
exports.resenotpflash = async (req, res) => {
  try {
    const { id, delid } = req.params;
    const { phonenumber, oid } = req.body;
    let flashid = "655e189fb919c70bf6895485";
    const partner = await Deluser.findById(id);
    const user = await User.findOne({ phone: phonenumber });
    const delivery = await Delivery.findById(delid);
    const flash = await User.findById(flashid);

    //generating otp
    function generateOTP() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    //generating mesId
    function msgid() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    if (partner && delivery && user) {
      const otp = generateOTP();
      const mesId = msgid();
      let finalotp = {
        otp: otp,
        timing: Date.now().toString(),
      };
      const convs = await Conversation.findOne({
        members: { $all: [user?._id, flash._id] },
      });
      if (convs) {
        let data = {
          conversationId: convs._id,
          sender: flash._id,
          text: `Your Otp for confirmation of receiving your order with orderId ${oid} is ${otp}. This Otp is valid for 10 mins, please share it with our partner.`,
          mesId: mesId,
        };
        const m = new Message(data);
        await m.save();
        await Deluser.updateOne(
          { _id: partner._id },
          {
            $set: {
              currentotp: finalotp,
            },
          }
        );
        //end user gets the otp
        await User.updateOne(
          { _id: user?._id },
          {
            $push: {
              conversations: convs?._id,
            },
          }
        );
        // await User.updateOne(
        //   { _id: flash._id },
        //   {
        //     $push: {
        //       conversations: convs?._id,
        //     },
        //   }
        // );
        const msg = {
          notification: {
            title: `Grovyo Flash`,
            body: `Your Otp for confirmation of receiving your order is ${otp}. This Otp is valid for 10 mins, please share it with our partner.`,
          },
          data: {},
          token: user?.notificationtoken,
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
      } else {
        res.status(200).json({ success: false });
      }
    } else {
      res.status(404).json({
        message: "User or Delivery or partner not found",
        success: false,
      });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Something went wrong...", success: false });
  }
};
