const User = require("../models/userAuth");
const Glimpse = require("../models/glimpse");
const Product = require("../models/product");
const Community = require("../models/community");
const uuid = require("uuid").v4;
const Minio = require("minio");
const Post = require("../models/post");
const Prosite = require("../models/prosite");
const sharp = require("sharp");

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

//edit users bio
exports.editbio = async (req, res) => {
  try {
    const { userId } = req.params;
    const { shortdesc, desc } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { shortdesc: shortdesc, desc: desc },
      { new: true }
    );
    await user.save();
    res.status(200).json({ user, success: true });
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetch media
exports.fetchmedia = async (req, res) => {
  try {
    const { userId } = req.params;
    const glimpse = await Glimpse.find({ creator: userId });
    if (!glimpse) {
      res.status(404).json({ message: "No media found", success: false });
    } else {
      const url = await generatePresignedUrl(
        "glimpse",
        glimpse[0].content.toString(),
        60 * 60
      );
      res.status(200).json({ data: { glimpse, url }, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetch all glimpses of users
exports.fetchallglimpse = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    res
      .status(400)
      .json({ message: "No user found with this id", success: false });
  } else {
    const glimpse = await Glimpse.find({ creator: user._id });
    if (!glimpse) {
      res.status(404).json({ success: false, message: "No media found" });
    } else {
      try {
        const urls = [];
        for (let i = 0; i < glimpse.length; i++) {
          const a = await generatePresignedUrl(
            "glimpse",
            glimpse[i].content.toString(),
            60 * 60
          );
          urls.push(a);
        }
        res.status(200).json({ data: { glimpse, urls }, success: true });
      } catch (e) {
        res.status(400).json({ message: e.message, success: false });
      }
    }
  }
};

//fetch products
exports.fetchproducts = async (req, res) => {
  const { userId } = req.params;
  const product = await Product.find({ creator: userId }).populate(
    "creator",
    "fullname isverified"
  );
  try {
    if (!product) {
      res.status(404).json({ message: "No products found", success: false });
    } else {
      const urls = [];

      let ur = [];

      for (let i = 0; i < product.length; i++) {
        for (let j = 0; j < product[i].images.length; j++) {
          const a = await generatePresignedUrl(
            "products",
            product[i].images[j].content.toString(),
            60 * 60
          );

          ur.push({ content: a, type: product[i].images[j].type });
        }
        urls.push(ur);
        ur = [];
      }
      const urlData = urls;
      const productData = product;

      const mergedData = urlData.map((u, i) => ({
        product: productData[i],

        urls: u,
      }));
      res.status(200).json({ mergedData, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//fetch a single product
exports.getproduct = async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findById(productId);
  try {
    if (!product) {
      res.status(404).json({ message: "Product not found", success: false });
    } else {
      const urls = [];
      for (let i = 0; i < product.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          product[i].images.toString(),
          60 * 60
        );
        urls.push(a);
      }
      res.status(200).json({ data: { product, urls }, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//get communities
exports.getcommunities = async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  const time = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const community = await Community.find({ creator: userId }).populate(
      "members",
      "profilepic"
    );
    if (!community) {
      res.status(404).json({ message: "No community found", success: false });
    } else {
      const dps = [];
      const urls = [];
      const posts = [];
      const liked = [];
      let current = [];
      const memdps = [];

      for (let i = 0; i < community.length; i++) {
        const post = await Post.find({
          community: community[i]._id,
          createdAt: { $gte: time },
        })
          .populate("sender", "fullname")
          .sort({ createdAt: -1 })

          .limit(1);
        posts.push(post);

        for (let i = 0; i < community.length; i++) {
          for (let j = 0; j < community[i].members.length; j++) {
            const a = await generatePresignedUrl(
              "images",
              community[i].members[j].profilepic.toString(),
              60 * 60
            );
            current.push(a);
          }
          memdps.push(current);
          current = [];
        }

        if (post.length > 0) {
          for (let i = 0; i < posts.length; i++) {
            const like = post[i]?.likedby?.includes(user._id);
            if (like) {
              liked.push(true);
            } else {
              liked.push(false);
            }
          }
        } else {
          null;
        }

        for (let i = 0; i < post.length; i++) {
          const a = await generatePresignedUrl(
            "posts",
            post[i].post.toString(),
            60 * 60
          );
          urls.push(a);
        }
      }
      for (let i = 0; i < community.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          community[i].dp.toString(),
          60 * 60
        );
        dps.push(a);
      }

      res.status(200).json({
        data: { community, memdps, posts, dps, urls, liked },
        success: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//get bio
exports.getbio = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  try {
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      res.status(200).json({ data: user, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//get prosite
exports.getprosite = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  try {
    if (!user) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      const url = await generatePresignedUrl(
        "prosites",
        user.prositepic.toString(),
        60 * 60 * 24
      );

      const dp = await generatePresignedUrl(
        "images",
        user.profilepic.toString(),
        60 * 60 * 24
      );

      res.status(200).json({
        url,
        fullname: user.fullname,
        username: user.username,
        pic: dp,
        success: true,
      });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//create a prosite
exports.createprosite = async (req, res) => {
  const { userId } = req.params;
  const { web, mobile, title, desc } = req.body;
  const image = req.files[0];
  const webpng = req.files[1];
  const mobilepng = req.files[2];

  try {
    const uuidString = uuid();
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const bucketName = "prosites";
      const imageName = `${Date.now()}_${uuidString}_${image.originalname}`;
      const webimgName = `${Date.now()}_${uuidString}_${webpng.originalname}`;
      const mobimgName = `${Date.now()}_${uuidString}_${
        mobilepng.originalname
      }`;

      await sharp(image.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, imageName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });
      await sharp(webpng.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, webimgName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });
      await sharp(mobilepng.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, mobimgName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });

      const p = new Prosite({
        web,
        mobile,
        webpng: webimgName,
        mobilepng: mobimgName,
        title,
        desc,
        creator: user._id,
        image: imageName,
      });
      await p.save();

      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//get a list of prosites
exports.getlist = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const sites = await Prosite.find();
      const mobile = [];
      const web = [];
      const images = [];

      for (let i = 0; i < sites.length; i++) {
        const mobiles = await generatePresignedUrl(
          "prosites",
          sites[i].mobilepng.toString(),
          60 * 60
        );
        mobile.push(mobiles);
        const webs = await generatePresignedUrl(
          "prosites",
          sites[i].webpng.toString(),
          60 * 60
        );
        web.push(webs);
        const image = await generatePresignedUrl(
          "prosites",
          sites[i].image.toString(),
          60 * 60
        );
        images.push(image);
      }

      res.status(200).json({ sites, web, mobile, images, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//get a single detailed prosite
exports.getdetailprosite = async (req, res) => {
  const { userId, siteId } = req.params;
  try {
    const user = await User.findById(userId);
    const prosite = await Prosite.findById(siteId);
    if (!user || !prosite) {
      res.status(404).json({ message: "Details Not found", success: false });
    } else {
      const mobile = await generatePresignedUrl(
        "images",
        prosite.mobilepng.toString(),
        60 * 60
      );
      const web = await generatePresignedUrl(
        "images",
        prosite.webpng.toString(),
        60 * 60
      );
      const image = await generatePresignedUrl(
        "images",
        prosite.image.toString(),
        60 * 60
      );
      res.status(200).json({ prosite, mobile, web, image, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//save prosite changes
exports.saveprosite = async (req, res) => {
  const { userId } = req.params;
  const { web, mobile, title, desc, creator } = req.body;
  const image = req.files[0];
  const webpng = req.files[1];
  const mobilepng = req.files[2];

  try {
    const uuidString = uuid();
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const bucketName = "prosites";
      const imageName = `${Date.now()}_${uuidString}_${image.originalname}`;
      const webimgName = `${Date.now()}_${uuidString}_${webpng.originalname}`;
      const mobimgName = `${Date.now()}_${uuidString}_${
        mobilepng.originalname
      }`;

      await sharp(image.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, imageName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });
      await sharp(webpng.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, webimgName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });
      await sharp(mobilepng.buffer)
        .jpeg({ quality: 50 })
        .toBuffer()
        .then(async (data) => {
          await minioClient.putObject(bucketName, mobimgName, data);
        })
        .catch((err) => {
          console.log(err.message, "-error");
        });

      const p = new Prosite({
        web,
        mobile,
        webpng: webimgName,
        mobilepng: mobimgName,
        title,
        desc,
        creator,
        image: imageName,
      });
      await p.save();

      res.status(200).json({ success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};
