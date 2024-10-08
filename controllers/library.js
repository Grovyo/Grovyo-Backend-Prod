const Minio = require("minio");
const uuid = require("uuid").v4;
const Post = require("../models/post");
const User = require("../models/userAuth");
const Product = require("../models/product");
const Order = require("../models/orders");
const Cart = require("../models/Cart");
const Subscriptions = require("../models/Subscriptions");
const { default: axios } = require("axios");
require("dotenv").config();

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

exports.fetchapplause = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      const post = await Post.find({ likedby: user._id })
        .populate("community", "title isverified dp")
        .populate("sender", "fullname");
      if (post) {
        const url = [];
        for (let i = 0; i < post.length; i++) {
          const urls = await generatePresignedUrl(
            "posts",
            post[i].post[0].toString(),
            60 * 60
          );
          url.push(urls);
        }
        const dp = [];
        for (let i = 0; i < post.length; i++) {
          const a = await generatePresignedUrl(
            "images",
            post[i].community.dp.toString(),
            60 * 60
          );
          dp.push(a);
        }
        res.status(200).json({ post, url, dp, success: true });
      } else {
        res.status(203).json({ success: false });
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetch orders
exports.fetchorders = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      const orders = [];

      for (let i = 0; i < user.puchase_history.length; i++) {
        const order = await Order.findById(user.puchase_history[i].toString())
          .populate(
            "productId",
            "name brandname creator images inclusiveprice price percentoff sellername totalstars"
          )
          .populate("sellerId", "isverified fullname");

        if (order?.productId && order?.sellerId) {
          orders.push(order);
        } else {
          order?.remove();
          await User.updateOne(
            { _id: user._id },
            { $pull: { puchase_history: order?._id } }
          );
        }
      }

      const image = [];
      if (orders) {
        for (let j = 0; j < orders.length; j++) {
          console.log(orders[j].productId[0]);
          if (orders[j].productId[0]) {
            const a =
              process.env.PRODUCT_URL +
              orders[j].productId[0].images[0].content;

            image.push(a);
          } else {
            orders[j].remove();
          }
        }
      }

      const merge = orders?.reverse()?.map((orders, i) => ({
        orders,
        image: image[i],
      }));
      res
        .status(200)
        .json({ data: merge, address: user.location, success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetch cart
exports.fetchcart = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId).populate({
      path: "cart",
      populate: {
        path: "product",
        model: "Product",
      },
    });
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      const ids = [];
      const image = [];
      for (let j = 0; j < user.cart.length; j++) {
        if (user.cart[j].product) {
          ids.push(user.cart[j].product._id);
        }
      }

      if (user) {
        for (let j = 0; j < user.cart.length; j++) {
          //  console.log(user.cart[j].product.images);
          if (user.cart[j].product && user.cart[j].product.isvariant) {
            const a = user.cart[j].conf.pic;

            image.push(a);
          } else {
            if (
              user.cart[j].product &&
              user.cart[j].product.images?.length > 0
            ) {
              const a =
                process.env.PRODUCT_URL +
                user.cart[j].product.images[0].content;

              image.push(a);
            }
          }
        }
      }

      const total = [];
      const discountedTotal = [];
      const totalqty = [];
      let count = 0;
      let countdis = 0;
      let qty = 0;
      for (let i = 0; i < user.cart.length; i++) {
        if (user.cart[i].product) {
          if (user.cart[i].product?.isvariant) {
            const t = user.cart[i].conf.price * user?.cart[i].quantity;
            count += t;
            const d =
              user.cart[i].conf.discountedprice * user?.cart[i].quantity;
            countdis += d;
          } else {
            const t = user.cart[i].product.price * user?.cart[i].quantity;
            count += t;
            const d =
              user.cart[i].product.discountedprice * user?.cart[i].quantity;
            countdis += d;
          }

          const q = user?.cart[i].quantity;
          qty += q;
        }
      }
      total.push(count);
      discountedTotal.push(countdis);
      totalqty.push(qty);
      const discount = [];
      let dis = 0;
      for (let i = 0; i < user.cart.length; i++) {
        const t = user.cart[i].product ? user.cart[i].product.percentoff : 0;
        dis += t;
      }
      discount.push(dis);
      let completeaddress =
        user.address.streetaddress +
        ", " +
        user.address.landmark +
        ", " +
        user.address.city +
        ", " +
        user.address.pincode +
        ", " +
        user.address.state;

      const cart = user.cart;
      const imgs = image;

      const merge = cart?.map((c, i) => ({ c, image: imgs[i] }));

      res.status(200).json({
        totalqty: totalqty,
        total: total,
        discountedtotal: discountedTotal,
        data: merge,
        discount: discount,
        address: completeaddress,
        success: true,
        ids,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

//add to cart
exports.addtocart = async (req, res) => {
  const { userId, productId } = req.params;
  const { quantity, cartId, action, cat } = req.body;
  try {
    const user = await User.findById(userId);
    const prod = await Product.findById(productId);
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      const cart = await Cart.findById(cartId);
      if (!cart) {
        let c;
        if (cat) {
          console.log(cat);
          c = new Cart({
            product: productId,
            quantity: quantity,
            conf: cat,
          });
          await c.save();
        } else {
          let cate = {
            variant: prod?.variants[0]?.name,
            category: prod?.variants[0]?.category[0]?.name,
            pic:
              process?.env?.PRODUCT_URL +
              prod?.variants[0]?.category[0]?.content,
            price: prod?.variants[0]?.category[0]?.price,
            discountedprice: prod?.variants[0]?.category[0]?.discountedprice,
          };
          c = new Cart({
            product: productId,
            quantity: quantity,
            conf: cate,
          });
          await c.save();
        }
        await User.updateOne({ _id: userId }, { $push: { cart: c._id } });
        await User.updateOne(
          { _id: userId },
          { $push: { cartproducts: productId } }
        );
        res.status(200).json({ c, success: true });
      } else {
        if (action === "inc") {
          await Cart.updateOne({ _id: cart._id }, { $inc: { quantity: 1 } });
        } else {
          if (action === "dec") {
            await Cart.updateOne({ _id: cart._id }, { $inc: { quantity: -1 } });
          } else {
            await Cart.deleteOne({ _id: cart._id });
            await User.updateOne(
              { _id: userId },
              { $pull: { cart: cart._id } }
            );
            await User.updateOne(
              { _id: userId },
              { $pull: { cartproducts: productId } }
            );
          }
        }
        res.status(200).json({ success: true });
      }
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//update quantity
exports.updatequantity = async (req, res) => {
  const { userId, cartId } = req.params;
  const { quantity } = req.body;
  try {
    const user = await User.findById(userId);
    const cart = await user.cart.includes(cartId);
    if (!user || !cart) {
      res.status(404).json({ message: "Not found", success: false });
    } else {
      await Cart.updateOne({ _id: cartId }, { $set: { quantity: quantity } });

      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//remove from cart
exports.removecart = async (req, res) => {
  const { userId, productId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      await User.updateOne({ _id: userId }, { $pull: { cart: productId } });
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//udpate address
// exports.updateaddress = async (req, res) => {
//   const { userId } = req.params;
//   const {
//     streetaddress,
//     state,
//     city,
//     landmark,
//     pincode,
//     latitude,
//     longitude,
//     altitude,
//     provider,
//     accuracy,
//     bearing,
//     phone,
//   } = req.body;

//   try {
//     let address;
//     const user = await User.findById(userId);

//     if (!user) {
//       res.status(404).json({ message: "No user found", success: false });
//     } else {
//       const apiKey = process.env.GEOCODE;

//       const endpoint = "https://maps.googleapis.com/maps/api/geocode/json";
//       const params = {
//         address: streetaddress + city + pincode + state,
//         key: apiKey,
//       };

//       const response = await axios.get(endpoint, { params });
//       const data = response.data;
//       if (data.status === "OK") {
//         const location = data.results[0].geometry.location;
//         const latitude = location.lat;
//         const longitude = location.lng;

//         address = {
//           streetaddress: streetaddress,
//           state: state,
//           city: city,
//           landmark: landmark,
//           pincode: pincode,
//           coordinates: {
//             latitude: latitude,
//             longitude: longitude,
//             altitude: altitude,
//             provider: provider,
//             accuracy: accuracy,
//             bearing: bearing,
//           },
//         };
//       } else {
//         console.log("Geocoding API request failed");
//       }
//       if (phone) {
//         await User.updateOne(
//           { _id: userId },
//           { $set: { address: address, phone: phone } }
//         );
//       } else {
//         await User.updateOne({ _id: userId }, { $set: { address: address } });
//       }

//       res.status(200).json({ success: true });
//     }
//   } catch (e) {
//     console.log(e);
//     res.status(400).json({ message: e.message, success: false });
//   }
// };
//udpate address
exports.updateaddress = async (req, res) => {
  const { userId } = req.params;
  const {
    streetaddress,
    state,
    city,
    landmark,
    pincode,
    latitude,
    longitude,
    altitude,
    provider,
    accuracy,
    bearing,
    phone,
    currentaddress,
    houseno,
  } = req.body;

  try {
    let address;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      if (currentaddress) {
        const apiKey = process.env.GEOCODE;

        const endpoint = "https://maps.googleapis.com/maps/api/geocode/json";
        const params = {
          address: streetaddress + city + pincode + state,
          key: apiKey,
        };

        const response = await axios.get(endpoint, { params });
        const addressParts = currentaddress.split(",");
        const stateAndPincode = addressParts[4].trim();

        address = {
          streetaddress: addressParts[0].trim(),
          state:
            stateAndPincode.split(" ")[0].trim() +
            " " +
            stateAndPincode.split(" ")[1].trim(),
          city: addressParts[2].trim() + ", " + addressParts[3].trim(),
          landmark: "",
          pincode: stateAndPincode.split(" ")[2].trim(),
          coordinates: {
            latitude: latitude,
            longitude: longitude,
            altitude: altitude,
            provider: provider,
            accuracy: accuracy,
            bearing: bearing,
          },
        };
        await User.updateOne({ _id: userId }, { $set: { address: address } });
        const data = response.data;
        if (data.status === "OK") {
          const location = data.results[0].geometry.location;
          const latitude = location.lat;
          const longitude = location.lng;

          const addressParts = currentaddress.split(",");
          const stateAndPincode = addressParts[4].trim();

          address = {
            houseno: houseno,
            streetaddress:
              addressParts[0].trim() + ", " + addressParts[1].trim(),
            state: stateAndPincode.split(" ")[0].trim(),
            city: addressParts[2].trim() + ", " + addressParts[3].trim(),
            landmark: landmark,
            pincode: stateAndPincode.split(" ")[1].trim(),
            coordinates: {
              latitude: latitude,
              longitude: longitude,
              altitude: altitude,
              provider: provider,
              accuracy: accuracy,
              bearing: bearing,
            },
          };
          await User.updateOne({ _id: userId }, { $set: { address: address } });
        } else {
          console.log("Geocoding API request failed");
        }
      } else {
        if (phone) {
          address = {
            streetaddress: streetaddress,
            state: state,
            city: city,
            landmark: landmark,
            pincode: pincode,
            coordinates: {
              latitude: latitude,
              longitude: longitude,
              altitude: altitude,
              provider: provider,
              accuracy: accuracy,
              bearing: bearing,
            },
          };
          await User.updateOne(
            { _id: userId },
            { $set: { address: address, phone: phone } }
          );
        } else {
          address = {
            houseno: houseno,
            streetaddress: streetaddress,
            state: state,
            city: city,
            landmark: landmark,
            pincode: pincode,
            coordinates: {
              latitude: latitude,
              longitude: longitude,
              altitude: altitude,
              provider: provider,
              accuracy: accuracy,
              bearing: bearing,
            },
          };
          await User.updateOne({ _id: userId }, { $set: { address: address } });
        }
      }

      res.status(200).json({ success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetch subscriptions
exports.subscriptions = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId).populate("cartproducts", "name");

    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      res.status(200).json({ subs: user, success: true });
    }
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.addsubs = async (req, res) => {
  const { userId, topicId } = req.params;
  const { validity } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      const s = new Subscriptions({ topic: topicId, validity: validity });
      await s.save();
      await User.updateOne(
        { _id: userId },
        { $push: { subscriptions: s._id } }
      );
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};
