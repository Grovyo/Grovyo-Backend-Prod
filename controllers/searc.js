const Post = require("../models/post");
const Community = require("../models/community");
const User = require("../models/userAuth");
const Minio = require("minio");
const Product = require("../models/product");

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

//search posts
exports.searchnow = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      res.status(400).json({ success: false });
    } else {
      const posts = await Post.find({
        title: { $regex: `.*${query}.*`, $options: "i" },
      }).exec();
      res.status(200).json(posts);
    }
  } catch (e) {
    res.status(400).json(e.message);
  }
};

//search communities
exports.searchcoms = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      res.status(400).json({ success: false });
    } else {
      const dps = [];
      const creatordps = [];
      const coms = await Community.find({
        title: { $regex: `.*${query}.*`, $options: "i" },
      })
        .populate("creator", "fullname username profilepic isverified")
        .exec();
      for (let i = 0; i < coms.length; i++) {
        const a = await generatePresignedUrl(
          "images",
          coms[i].dp.toString(),
          60 * 60
        );
        dps.push(a);
      }
      for (let i = 0; i < coms.length; i++) {
        const a = process.env.URL + coms[i].creator.profilepic;

        creatordps.push(a);
      }
      res.status(200).json({ data: { coms, dps, creatordps }, success: true });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

//search prosites

exports.searchpros = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      res.status(400).json({ success: false });
    } else {
      const dps = [];
      const pros = await User.find({
        fullname: { $regex: `.*${query}.*`, $options: "i" },
      }).exec();
      for (let i = 0; i < pros.length; i++) {
        const a = process.env.URL + pros[i].profilepic;

        dps.push(a);
      }
      res.status(200).json({ data: { pros, dps, success: true } });
    }
  } catch (e) {
    res.status(400).json({ message: e.message, success: false });
  }
};

// exports.fetchingprosite = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const user = await User.findById(id);
//     if (!user) {
//       return res
//         .status(400)
//         .json({ success: false, message: "User Not Found" });
//     }
//     const community = [];
//     for (let i = 0; i < user.communitycreated.length; i++) {
//       const id = user.communitycreated[i];
//       comm = await Community.findById(id);
//       community.push(comm);
//     }

//     const communityDps = await Promise.all(
//       community.map(async (d) => {
//         const imageforCommunity = process.env.URL + d.dp;

//         return imageforCommunity;
//       })
//     );

//     const communitywithDps = community.map((f, i) => {
//       return { ...f.toObject(), dps: communityDps[i] };
//     });

//     const products = await Product.find({ creator: id });

//     const productdps = await Promise.all(
//       products.map(async (product) => {
//         const a = process.env.PRODUCT_URL + product.images[0].content;
//         return a;
//       })
//     );

//     const productsWithDps = products.map((product, index) => {
//       return {
//         ...product.toObject(),
//         dp: productdps[index],
//       };
//     });

//     const userDetails = {
//       bio: user.desc,
//       phone: user.phone,
//       dp: process.env.URL + user.profilepic,
//       username: user.username,
//       fullname: user.fullname,
//       email: user.email,
//       links: {
//         insta: user.insta,
//         snap: user.snap,
//         x: user.x,
//         yt: user.yt,
//         linkdin: user.linkdin,
//       },
//     };
//     const data = {
//       communitywithDps,
//       productsWithDps,
//       userDetails,
//     };

//     res.status(200).json({ success: true, data, user });
//   } catch (error) {
//     res.status(500).json({ message: error.message, success: false });
//     console.log(error);
//   }
// };

exports.fetchingprosite = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User Not Found" });
    }
    const community = [];
    const com = await Community.find({ creator: id });
    for (let i = 0; i < com.length; i++) {
      const id = com[i];
      let comm = await Community.findById(id).populate("members", "dp");
      community.push(comm);
    }

    const communityDps = await Promise.all(
      community.map((d) => {
        const imageforCommunity = process.env.URL + d.dp;

        return imageforCommunity;
      })
    );

    const membersdp = await Promise.all(
      community.map(async (d) => {
        const dps = await Promise.all(
          d.members.map(async (userId) => {
            const member = await User.findById(userId);
            const dp = process.env.URL + member.profilepic;
            return dp;
          })
        );
        return dps;
      })
    );

    const communitywithDps = community.map((f, i) => {
      return { ...f.toObject(), dps: communityDps[i], membersdp: membersdp[i] };
    });

    const products = await Product.find({ creator: id });

    const productdps = await Promise.all(
      products.map(async (product) => {
        const a = process.env.PRODUCT_URL + product.images[0].content;
        return a;
      })
    );

    const productsWithDps = products.map((product, index) => {
      return {
        ...product.toObject(),
        dp: productdps[index],
      };
    });

    const userDetails = {
      bio: user.desc,
      phone: user.phone,
      username: user.username,
      fullname: user.fullname,
      dp: process.env.URL + user.profilepic,
      temp: user.prosite_template,
      email: user.email,
      links: {
        insta: user.insta,
        snap: user.snap,
        x: user.x,
        yt: user.yt,
        linkdin: user.linkdin,
      },
    };
    const data = {
      communitywithDps,
      productsWithDps,
      userDetails,
    };

    res.status(200).json({ success: true, data, user });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
    console.log(error);
  }
};
