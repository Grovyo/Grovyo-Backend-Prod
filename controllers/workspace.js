const User = require("../models/userAuth");
const Community = require("../models/community");
const Minio = require("minio");
const Qr = require("../models/qrcode");
const Order = require("../models/orders");
const Payment = require("../models/paymenthistory");
const Prosite = require("../models/prosite");
const sharp = require("sharp");
const uuid = require("uuid").v4;
const fs = require("fs");
const Product = require("../models/product");
const Ads = require("../models/Ads");
const Post = require("../models/post");
const Collection = require("../models/Collectionss");

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

const generate17DigitNumber = () => {
  let seventeenDigitNumber = "";
  for (let i = 0; i < 17; i++) {
    const digit = Math.floor(Math.random() * 10); // Generate a random digit between 0 and 9
    seventeenDigitNumber += digit.toString(); // Append the digit to the number string
  }
  return seventeenDigitNumber;
};

exports.login = async (req, res) => {
  const { id } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const dp = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60
      );
      res.status(200).json({
        message: "user exists signup success",
        user,
        dp,
        userexists: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

// exports.allcoms = async (req, res) => {
//   const { id } = req.params;
//   try {
//     const Co = await Community.find({ creator: id }).populate(
//       "creator",
//       "fullname"
//     );
//     const dps = [];
//     let avgeng = [];
//     for (let i = 0; i < Co.length; i++) {
//       const a = await generatePresignedUrl(
//         "images",
//         Co[i].dp.toString(),
//         60 * 60
//       );
//       dps.push(a);
//     }
//     const Com = Co.reverse();
//     for (let i = 0; i < Co.length; i++) {
//       const post = await Post.find({ community: Co[0]._id });

//       let totalLikes = 0;
//       let numberOfPosts = post.length;
//       let totalshares = 0;

//       for (let j = 0; j < post.length; j++) {
//         totalLikes += post[j].likes;
//         totalshares += post[j].sharescount;
//       }

//       const averageLikes =
//         numberOfPosts > 0 ? (totalLikes / numberOfPosts) * 100 : 0;
//       const averageshares =
//         numberOfPosts > 0 ? (totalshares / numberOfPosts) * 100 : 0;
//       avgeng.push(averageLikes + averageshares);
//     }

//     dps.reverse();
//     avgeng.reverse();
//     res.status(200).json({ Com, avgeng, dps, success: true });
//   } catch (e) {
//     res.status(400).json({ message: e.message, success: false });
//   }
// };

exports.getmembers = async (req, res) => {
  const { id, comId } = req.params;
  try {
    const user = await User.findById(id);
    const community = await Community.findById(comId).populate(
      "members",
      "fullname isverified username profilepic username"
    );
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else if (!community) {
      res.status(404).json({ message: "Community not found", success: false });
    } else {
      const members = community.members;
      const dps = [];
      for (let i = 0; i < community.members.length; i++) {
        const dp = await generatePresignedUrl(
          "images",
          community.members[i].profilepic.toString(),
          60 * 60
        );
        dps.push(dp);
      }
      res.status(200).json({ success: true, members, dps });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

exports.mycode = async (req, res) => {
  const { rid } = req.params;
  try {
    if (!rid) {
      res.status(400).json({ message: "UnAuthorized", success: false });
    } else {
      const newid = new Qr({ rid });
      await newid.save();
      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.qrlogin = async (req, res) => {
  const { id, rid } = req.params;
  try {
    const user = await User.findById(id);
    if (user && rid.length === 17) {
      res.status(200).json({ success: true });
      await Qr.updateOne(
        { rid: rid },
        {
          $set: { user: user._id },
        }
      );
    } else {
      res.status(200).json({ success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.fetchmyid = async (req, res) => {
  const { rid } = req.params;
  try {
    if (rid.length === 17) {
      const qr = await Qr.findOne({ rid: rid }).populate(
        "user",
        "fullname profilepic"
      );
      if (qr.user) {
        const dp = await generatePresignedUrl(
          "images",
          qr.user.profilepic.toString(),
          60 * 60
        );
        res.status(200).json({ success: true, qr, dp });

        await User.updateOne(
          { _id: qr.user._id },
          {
            $push: { currentlogin: rid },
          }
        );
      } else {
        res.status(404).json({ message: "Not found", success: false });
      }
    } else {
      res.status(200).json({ success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.addmoney = async (req, res) => {
  const orderId = generate17DigitNumber();
  let oi = `order_${orderId}`;
  const { id } = req.params;
  const { amount } = req.body;
  try {
    const user = await User.findById(id);
    if (user) {
      const payment = new Payment({
        amount: amount,
        paymentId: oi,
        buyerId: id,
        status: "pending",
      });
      await payment.save();
      await User.updateOne(
        { _id: id },
        {
          $push: { paymenthistory: payment._id },
        }
      );
      res.status(200).json({ success: true, oi });
    } else {
      res.status(404).json({ message: "User not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.updateorderstatus = async (req, res) => {
  const { id } = req.params;
  const { success, ori, amount } = req.body;
  try {
    const user = await User.findById(id);

    if (user) {
      if (success) {
        await Payment.updateOne(
          { paymentId: ori },
          {
            $set: { status: "completed" },
          }
        );

        await User.updateOne(
          { _id: id },
          {
            $inc: { currentmoney: parseFloat(amount) },
          }
        );

        res.status(200).json({ success: true });
      } else {
        await Payment.updateOne(
          { paymentId: ori },
          {
            $set: { status: "failed" },
          }
        );
        res.status(200).json({ success: true });
      }
    } else {
      res.status(404).json({ message: "User not found...", success: false });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.fetchpayhistory = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);

    if (user) {
      const payments = [];
      for (let i = 0; i < user.paymenthistory?.length; i++) {
        const p = await Payment.findById(user.paymenthistory[i]);
        payments.push(p);
      }
      res.status(200).json({
        money: user.currentmoney,
        payments: payments.reverse(),

        success: true,
      });
    } else {
      res.status(404).json({ message: "User not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.fetchprositecollection = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (user) {
      const prosite = await Prosite.find();
      res.status(200).json({ prosite, success: true });
    } else {
      res.status(404).json({ message: "User not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

exports.createprosite = async (req, res) => {
  const { id } = req.params;

  const uuidString = uuid();

  const base64ImageData = req.body.image; // Replace with your base64 image data
  const bucketName = "materials"; // Replace with your desired bucket name
  const objectName = "your-object-name.png"; // Replace with the desired object name

  let base64String = req.body.image;
  let base64Image = base64String.split(";base64,").pop();
  // Upload the buffer to MinIO

  const buffer = Buffer.from(base64Image, "base64");
  minioClient.putObject(
    bucketName,
    objectName,
    buffer,
    buffer.length,
    (error, etag) => {
      if (error) {
        console.error("Error uploading image to MinIO:", error);
        return;
      }

      console.log("Image uploaded successfully. ETag:", etag);
    }
  );

  res.send("buffer");
};

exports.fetchsingleprosite = async (req, res) => {
  const { id, prositeId } = req.params;
  try {
    const user = await User.findById(id);
    const prosite = await Prosite.findById(prositeId);
    if (user && prosite) {
      res.status(200).json({ prosite, success: true });
    } else {
      res.status(404).json({ message: "Not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

//fetch product details
exports.fetchaworkspaceproducts = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (user) {
      const products = await Product.find({ creator: user._id });
      const urls = [];
      for (let i = 0; i < products.length; i++) {
        const a = await generatePresignedUrl(
          "products",
          products[i].images[0].content.toString(),
          60 * 60
        );
        urls.push(a);
      }
      const pendingOrders = user.orders.filter(
        (order) => order.status === "pending"
      );
      const completedOrders = user.orders.filter(
        (order) => order.status === "completed"
      );

      res.status(200).json({
        customers: user?.customers?.length,
        orders: user?.orders?.length,
        completedOrders: completedOrders?.length,
        pendingOrders: pendingOrders?.length,
        products,
        urls,
        success: true,
      });
    } else {
      res.status(404).json({ message: "Not found...", success: false });
    }
  } catch (e) {
    res.status(500).json({ message: e.message, success: false });
  }
};

// //fetch orders
// exports.fetchallorders = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const user = await User.findById(id);
//     if (user) {
//       const orders = await Order.find({ sellerId: user._id });
//       const pendingOrders = orders.filter(
//         (order) => order.currentStatus === "pending"
//       );
//       const completedOrders = orders.filter(
//         (order) => order.currentStatus === "completed"
//       );
//       const cancelled = orders.filter(
//         (order) => order.currentStatus === "cancelled"
//       );
//       const returned = orders.filter(
//         (order) => order.currentStatus === "returned"
//       );
//       const damaged = orders.filter(
//         (order) => order.currentStatus === "damaged"
//       );
//       const allorders = orders.length;
//       const customers = user?.customers?.length;
//       res.status(200).json({
//         pendingOrders,
//         completedOrders,
//         allorders,
//         cancelled,
//         returned,
//         damaged,
//         customers,
//         orders,
//       });
//     } else {
//       res.status(404).json({ message: "User not found", success: false });
//     }
//   } catch (e) {
//     res.status(400).json({ message: e.message, success: false });
//   }
// };

// ad code

// community delete


//update community
// exports.updatecommunity = async (req, res) => {
//   const { comId, userId } = req.params;
//   const { category, title, desc, topicId, message, price, topicname, type } =
//     req.body;
//   const uuidString = uuid();
//   console.log(req.file, req.body, userId, comId);
//   try {
//     const user = await User.findById(userId);
//     const com = await Community.findById(comId);
//     if (!user) {
//       res.status(404).json({ message: "User not found", success: false });
//     } else if (!com) {
//       res.status(404).json({ message: "Community not found", success: false });
//     } else {
//       if (req.file) {
//         const bucketName = "images";
//         const objectName = `${Date.now()}${uuidString}${req.file.originalname}`;
//         a1 = objectName;
//         a2 = req.file.mimetype;

//         await sharp(req.file.buffer)
//           .jpeg({ quality: 50 })
//           .toBuffer()
//           .then(async (data) => {
//             await minioClient.putObject(bucketName, objectName, data);
//           })
//           .catch((err) => {
//             console.log(err.message, "-error");
//           });
//         await Community.updateOne(
//           { _id: com._id },
//           {
//             $set: {
//               category: category,
//               title: title,
//               desc: desc,
//               dp: objectName,
//             },
//           }
//         );
//       }
//       await Community.updateOne(
//         { _id: com._id },
//         {
//           $set: { category: category, title: title, desc: desc },
//         }
//       );

//       if (topicname) {
//         await Topic.updateOne(
//           { _id: topicId },
//           {
//             $set: {
//               title: topicname,
//               message: message,
//               price: price,
//               type: type,
//             },
//           }
//         );
//       }

//       res.status(200).json({ success: true });
//     }
//   } catch (e) {
//     console.log(e);
//     res.status(400).json({ message: e.message, success: false });
//   }
// };

// // add a product
// exports.create = async (req, res) => {
//   const { userId, colid } = req.params;
//   console.log(colid);
//   const {
//     name,
//     brandname,
//     desc,
//     quantity,
//     shippingcost,
//     price,
//     discountedprice,
//     sellername,
//     totalstars,
//     weight,
//     type,
//   } = req.body;

//   const image1 = req.files[0];
//   const image2 = req.files[1];
//   const image3 = req.files[2];
//   const image4 = req.files[3];

//   const user = await User.findById(userId);
//   if (!user) {
//     res.status(400).json({ message: "User not found", success: false });
//   } else {
//     if (!image1 && !image2 && !image3 && !image4) {
//       res.status(400).json({ message: "Must have one image" });
//     } else {
//       try {
//         const uuidString = uuid();
//         let a, b, c, d;
//         if (image1) {
//           const bucketName = "products";
//           const objectName = `${Date.now()}${uuidString}${image1.originalname}`;
//           a = objectName;
//           await minioClient.putObject(
//             bucketName,
//             objectName,
//             image1.buffer,
//             image1.buffer.length
//           );
//         }
//         if (image2) {
//           const bucketName = "products";
//           const objectName = `${Date.now()}${uuidString}${image2.originalname}`;
//           b = objectName;
//           await minioClient.putObject(
//             bucketName,
//             objectName,
//             image2.buffer,
//             image2.buffer.length
//           );
//         }
//         if (image3) {
//           const bucketName = "products";
//           const objectName = `${Date.now()}${uuidString}${image3.originalname}`;
//           c = objectName;
//           await minioClient.putObject(
//             bucketName,
//             objectName,
//             image3.buffer,
//             image3.buffer.length
//           );
//         }
//         if (image4) {
//           const bucketName = "products";
//           const objectName = `${Date.now()}${uuidString}${image4.originalname}`;
//           d = objectName;
//           await minioClient.putObject(
//             bucketName,
//             objectName,
//             image4.buffer,
//             image4.buffer.length
//           );
//         }
//         const p = new Product({
//           name,
//           brandname,
//           desc,
//           creator: userId,
//           quantity,
//           shippingcost,
//           price,
//           discountedprice,
//           sellername,
//           totalstars,
//           images: [a, b, c, d],
//           weight,
//           type,
//         });
//         const data = await p.save();

//         const collection = await Collection.findById(colid);

//         if (!collection) {
//           return res
//             .status(404)
//             .json({ message: "Collection not found", success: false });
//         }

//         collection.products.push(data);
//         const actualdata = await collection.save();

//         res.status(200).json(actualdata);
//       } catch (e) {
//         console.log(e);
//         res.status(500).json({ message: e.message });
//       }
//     }
//   }
// };

// register store
// exports.registerstore = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const {
//       buildingno,
//       postal,
//       landmark,
//       gst,
//       businesscategory,
//       documenttype,
//       documentfile,
//       state,
//       city,
//     } = req.body;

//     const findStore = await User.findById(userId);
//     const finaladdress = {
//       buildingno: buildingno,
//       city: city,
//       state: state,
//       postal: postal,
//       landmark: landmark,
//       gst: gst,
//       businesscategory: businesscategory,
//       documenttype: documenttype,
//       documentfile: documentfile,
//     };
//     console.log(finaladdress, "finaladdress");
//     if (findStore) {
//       await User.updateOne(
//         { _id: userId },
//         { $set: { storeAddress: finaladdress } }
//       );

//       res.status(200).json({ status: "success" });
//     } else {
//       res.status(404).json({ status: "User Not Found" });
//     }
//   } catch (e) {
//     console.log(e);
//     res.status(400).json({ message: e.message, success: false });
//   }
// };

// create collection product
// exports.createCollection = async (req, res) => {
//   try {
//     const { name, category, verfication } = req.body;
//     const { userId } = req.params;

//     const data = {
//       name: name,
//       category: category,
//       verfication: verfication,
//       creator: userId,
//     };
//     const col = await Collection.findById(userId);

//     if (!col) {
//       const newCol = new Collection(data);
//       await newCol.save();
//       await User.updateOne(
//         { _id: userId },
//         { $push: { collectionss: newCol._id } }
//       );
//       res.status(200).json({ status: "success" });
//     } else {
//       res.status(201).json({ status: "Collection already exists" });
//     }
//   } catch (e) {
//     console.log(e);
//     res.status(400).json({ message: e.message, success: false });
//   }
// };

// exports.fetchProduct = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const orderId = uuid();
//     const collectionsWithProducts = [];
//     const user = await User.findById(userId);

//     const existingOrder = await Order.findOne({ orderId: orderId });
//     if (existingOrder) {
//       // An order with the same orderId already exists, handle the duplicate case here
//       res
//         .status(400)
//         .json({ message: "Order with the same orderId already exists" });
//       return; // Exit the function early
//     }

//     const o = new Order({
//       buyerId: userId,
//       productId: userId,
//       sellerId: userId,
//       delivered: false,
//       quantity: 7,
//       total: 45,
//       currentStatus: "pending",
//       orderId: orderId,
//       deliverycharges: 10,
//       taxes: 5,
//       discountamount: 56,
//       finalprice: 456,
//       topicId: "3gh4567890",
//     });

//     await o.save();

//     // let d = {
//     //   id
//     // }
//     if (user) {
//       for (let i = 0; i < user.collectionss.length; i++) {
//         const call = await Collection.findById(user.collectionss[i]);
//         if (call) {
//           // Fetch full product details based on the product IDs in the collection
//           const productPromises = call.products.map((productId) =>
//             Product.findById(productId)
//           );
//           const products = await Promise.all(productPromises);

//           // Generate URLs for each product
//           const urls = [];
//           for (let j = 0; j < products.length; j++) {
//             console.log(products[i]);
//             const a = await generatePresignedUrl(
//               "products",
//               products[j].images[0].content.toString(),
//               60 * 60
//             );
//             urls.push(a);
//           }
//           collectionsWithProducts.push({
//             collection: call,
//             products: products.map((product, index) => ({
//               ...product.toObject(), // Convert Mongoose document to plain object
//               urls: [urls[index]], // Add the URL to the product
//             })),
//           });
//         } else {
//           console.log(`Collection with id ${user.collectionss[i]} not found.`);
//         }
//       }
//       const productsGet = await Product.find({ creator: userId });
//       const urls = [];
//       for (let i = 0; i < productsGet.length; i++) {
//         const a = await generatePresignedUrl(
//           "products",
//           productsGet[i].images[0].content.toString(),
//           60 * 60
//         );
//         urls.push(a);
//       }

//       const pendingOrders = user.orders.filter(
//         (order) => order.status === "pending"
//       );
//       const completedOrders = user.orders.filter(
//         (order) => order.status === "completed"
//       );

//       const detailsToSend = {
//         customers: user?.customers?.length,
//         orders: user?.orders?.length,
//         completedOrders: completedOrders?.length,
//         pendingOrders: pendingOrders?.length,
//         earnings: user.moneyearned,
//       };

//       res
//         .status(200)
//         .json({ collectionsWithProducts, detailsToSend, success: true });
//     } else {
//       res.status(404).json({ message: "User not found" });
//     }
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// exports.fetchProduct = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const user = await User.findById(userId);

//     if (user) {
//       const collectionsToSend = [];

//       for (const collectionId of user.collectionss) {
//         const find = await Collection.findById(
//           collectionId.toString()
//         ).populate("products");
//         const dps = await Promise.all(
//           find.products.map(async (product) => {
//             const imageUrl = product.images[0].toString();
//             return await generatePresignedUrl("products", imageUrl, 60 * 60);
//           })
//         );

//         const productsWithDps = find.products.map((product, index) => {
//           return {
//             ...product.toObject(),
//             dp: dps[index],
//           };
//         });
//         collectionsToSend.push({
//           ...find.toObject(),
//           products: productsWithDps,
//         });
//       }

//       res.json({ collections: collectionsToSend, success: true });
//     } else {
//       res.json({ message: "User Not Found" });
//     }
//   } catch (err) {
//     res.status(404).json({ message: err.message, success: false });
//     console.log(err);
//   }
// };

//delete a product
// exports.deleteproduct = async (req, res) => {
//   const { userId, colid, productId } = req.params;
//   try {
//     const collection = await Collection.findById(colid);

//     if (!collection) {
//       return res.status(404).json({ message: "Collection not found" });
//     }

//     if (collection.creator.toString() !== userId) {
//       return res
//         .status(403)
//         .json({ message: "You can't delete products in this collection" });
//     }

//     const product = collection.products.find(
//       (p) => p._id.toString() === productId
//     );

//     if (!product) {
//       return res
//         .status(404)
//         .json({ message: "Product not found in this collection" });
//     }

//     await Product.findByIdAndDelete(productId);

//     collection.products = collection.products.filter(
//       (p) => p._id.toString() !== productId
//     );
//     await collection.save();

//     res.status(200).json({ success: true });
//   } catch (e) {
//     res.status(400).json(e.message);
//   }
// };

// update product
// exports.updateproduct = async (req, res) => {
//   try {
//     const { userId, colid, productId } = req.params;

//     const collection = await Collection.findById(colid);

//     if (!collection) {
//       return res.status(404).json({ message: "Collection not found" });
//     }

//     if (collection.creator.toString() !== userId) {
//       return res
//         .status(403)
//         .json({ message: "You can't update products in this collection" });
//     }

//     const product = collection.products.find(
//       (p) => p._id.toString() === productId
//     );

//     if (!product) {
//       res.status(404).json({ message: "Product not found", success: false });
//     } else {
//       await Product.updateOne({ _id: productId }, { $set: req.body });
//       res.status(200).json({ success: true });
//     }
//   } catch (e) {
//     res.status(400).json({ message: e.message, success: false });
//   }
// };

// delete collection
// exports.collectiondelete = async (req, res) => {
//   try {
//     const { userId, colid } = req.params;
//     const collection = await Collection.findById(colid);
//     const user = await User.findById(userId);
//     if (!collection) {
//       return res.status(404).json({ message: "Collection not found" });
//     } else {
//       console.log(collection._id, user.collectionss);
//       if (collection.creator.toString() !== userId) {
//         return res
//           .status(403)
//           .json({ message: "You can't delete collections of other users" });
//       } else {
//         await Product.deleteMany({ _id: { $in: collection.products } });
//         await User.updateOne(
//           { _id: userId },
//           { $pull: { collectionss: collection._id } }
//         );
//         await collection.deleteOne();
//         res.status(200).json({ success: true });
//       }
//     }
//   } catch (e) {
//     res.status(400).json({ message: e.message, success: false });
//   }
// };
