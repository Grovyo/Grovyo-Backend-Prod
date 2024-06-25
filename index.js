const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");
const Redis = require("ioredis");
const os = require("os");
const cluster = require("cluster");
const http = require("http").Server(app);
const io = require("socket.io")(http);

const puppeteer = require("puppeteer");

//Redis
// const redis = new Redis("redis://192.168.29.221:6379");
// const subscriber = new Redis("redis://192.168.29.221:6379");
// const publisher = new Redis("redis://192.168.29.221:6379");

//import routes
const userAuth = require("./routes/authRoutes");
const chatRoutes = require("./routes/convRoutes");
const messageRoutes = require("./routes/message");
const communityRoutes = require("./routes/community");
const topicRoutes = require("./routes/topic");
const productRoutes = require("./routes/product");
const postRoutes = require("./routes/post");
const prositeRoutes = require("./routes/prosite");
const commentRoutes = require("./routes/comment");
const reviewRoutes = require("./routes/review");
const orderRoutes = require("./routes/order");
const glimpseRoutes = require("./routes/glimpse");
const replyRoutes = require("./routes/reply");
const questionsRoutes = require("./routes/questions");
const searchRoutes = require("./routes/searc");
const adminRoutes = require("./routes/admin");
const notificationRoutes = require("./routes/notification");
const libraryRoutes = require("./routes/library");
const testRoutes = require("./routes/test");
const workRoutes = require("./routes/workspace");
const adRoutes = require("./routes/Ads");
const memRoutes = require("./routes/membership");
// const workspacev1 = require("./routes/WorkspaceV1");
const Community = require("./models/community");
const Order = require("./models/orders");
const Deliveryroutes = require("./routes/delivery");
const { default: axios } = require("axios");

require("dotenv").config();

//middlewares
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));
// app.use(bodyParser.json());
app.use(cookieParser());
app.use("/api", userAuth);
app.use("/api", chatRoutes);
app.use("/api", messageRoutes);
app.use("/api", communityRoutes);
app.use("/api", topicRoutes);
app.use("/api", productRoutes);
app.use("/api", postRoutes);
app.use("/api", prositeRoutes);
app.use("/api", commentRoutes);
app.use("/api", reviewRoutes);
app.use("/api", orderRoutes);
app.use("/api", glimpseRoutes);
app.use("/api", replyRoutes);
app.use("/api", questionsRoutes);
app.use("/api", searchRoutes);
app.use("/api", adminRoutes);
app.use("/api", notificationRoutes);
app.use("/api", libraryRoutes);
app.use("/api", testRoutes);
app.use("/api", workRoutes);
app.use("/api", adRoutes);
app.use("/api", Deliveryroutes);

app.get("/geocode", async (req, res) => {
  const { address } = req.body;
  const apiKey = process.env.GEOCODE;

  const endpoint = "https://maps.googleapis.com/maps/api/geocode/json";
  const params = {
    address: address,
    key: apiKey,
  };

  try {
    const response = await axios.get(endpoint, { params });
    const data = response.data;
    if (data.status === "OK") {
      const location = data.results[0].geometry.location;
      const latitude = location.lat;
      const longitude = location.lng;
      res.json({ latitude, longitude });
    } else {
      res.status(400).json({ error: "Geocoding API request failed" });
    }
  } catch (error) {
    console.error("Error fetching geocoding API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/reversegeocode", async (req, res) => {
  const { latitude, longitude } = req.body;
  const apiKey = process.env.GEOCODE;

  const endpoint = "https://maps.googleapis.com/maps/api/geocode/json";
  const params = {
    latlng: `${latitude},${longitude}`,
    key: apiKey,
  };

  try {
    const response = await axios.get(endpoint, { params });
    const data = response.data;
    if (data.status === "OK") {
      const address = data.results[0].formatted_address;
      res.json({ address });
    } else {
      res.status(400).json({ error: "Reverse Geocoding API request failed" });
    }
  } catch (error) {
    console.error("Error fetching reverse geocoding API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// app.use("/api/v1", workspacev1);

//connect to DB
const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    mongoose.connect(process.env.PRODDB).then(() => {
      console.log("DB is connected");
    });
    // mongoose.connect('mongodb+srv://fsayush100:shreyansh7@cluster0.mrnejwh.mongodb.net/your-database-name?retryWrites=true&w=majority').then(() => {
    //   console.log("DB is connected");
    // });
  } catch (err) {
    console.log(err);
  }
};
connectDB();

// const add = async () => {
//   try {
//     const l = async () => {
//       const generateRandomData = () => {
//         const random = Math.ceil(Math.random() * 100 + 1);
//         return random;
//       };

//       const find = await Order.find({ _id: "654a0521861e3b687bb924e3" });

//       const resultArray = {
//         x: Array(find.length).fill().map(generateRandomData),
//         y1: Array(find.length).fill().map(generateRandomData),
//         y2: Array(find.length).fill().map(generateRandomData),
//       };

//       return resultArray;
//     };
//     const com = await Order.find({ _id: "654a0521861e3b687bb924e3" });
//     for (j = 0; j < com.length; j++) {
//       const orders = com[j];
//       console.log(orders);
//       const datafororders = await l();
//       const statsdata = {
//         X: datafororders.x,
//         Y1: datafororders.y1,
//         Y2: datafororders.y2,
//       };
//       // if (orders.stats.length > 0) {
//       //   orders.stats.pop()
//       // }
//       if (orders.stats.length <= 0) {
//         orders.stats.push(statsdata);
//       }

//       await orders.save();
//     }
//   } catch (err) {
//     console.error(err);
//   }
// };
// add();

app.post("/addata", async (req, res) => {
  try {
    let {
      locations,
      tagss,
      types,
      myAdPoints,
      categorys,
      myAge,
      myAudience,
      totalmen,
      totalwomen,
      mygender,
      advid,
    } = req.body;
    console.log(
      locations,
      tagss,
      types,
      myAdPoints,
      categorys,
      myAge,
      myAudience,
      totalmen,
      totalwomen,
      mygender,
      advid
    );

    let myArray = types;
    let myTags = tagss;

    // cost calcualation for category using points
    const perCost = 0.1;
    let costPoints = perCost * myAdPoints;

    // locations
    const fetchLLocation = locations;
    // console.log(fetchLLocation)

    // location by audience
    let locwithAudience = myAudience;
    console.log(locwithAudience);

    // sum of audience
    let totalAudience = 0;
    for (let i = 0; i < locwithAudience.length; i++) {
      totalAudience += locwithAudience[i];
    }

    console.log(totalAudience);

    //   men audience by location start
    let locwithMenAudience = totalmen;
    console.log(locwithAudience);

    let totalMenAudience = 0;
    let avgMen;
    for (let i = 0; i < locwithMenAudience.length; i++) {
      totalMenAudience += locwithMenAudience[i];
    }
    avgMen = (totalMenAudience / locwithMenAudience.length).toFixed(2);
    console.log(totalMenAudience);
    console.log(avgMen);

    //   men audience by location end

    //   women audience by location start
    let locwithWomenAudience = totalwomen;
    console.log(locwithWomenAudience);

    let totalWomenAudience = 0;
    let avgwomen;
    for (let i = 0; i < locwithWomenAudience.length; i++) {
      totalWomenAudience += locwithWomenAudience[i];
    }
    avgwomen = (totalWomenAudience / locwithWomenAudience.length).toFixed(2);
    console.log(totalWomenAudience);
    console.log(avgwomen);

    //   women audience by location end

    // calculation according to gender age start
    let AudienceByGender;
    let AudiencebyAge;
    if (mygender === "Men") {
      AudienceByGender = Math.ceil(avgMen * totalAudience);
      if (myAge === "12-18") {
        AudiencebyAge = Math.ceil(AudienceByGender * (20 / 100));
      } else if (myAge === "19-40") {
        AudiencebyAge = Math.ceil(AudienceByGender * (60 / 100));
      } else if (myAge === "41-65") {
        AudiencebyAge = Math.ceil(AudienceByGender * (20 / 100));
      } else {
        AudiencebyAge = AudienceByGender;
      }
    } else if (mygender === "Women") {
      AudienceByGender = avgwomen * totalAudience;
      if (myAge === "12-18") {
        AudiencebyAge = Math.ceil(AudienceByGender * (20 / 100));
      } else if (myAge === "19-40") {
        AudiencebyAge = Math.ceil(AudienceByGender * (60 / 100));
      } else if (myAge === "41-65") {
        AudiencebyAge = Math.ceil(AudienceByGender * (20 / 100));
      } else {
        AudiencebyAge = AudienceByGender;
      }
    } else {
      AudienceByGender = totalAudience;
      if (myAge === "12-18") {
        AudiencebyAge = AudienceByGender * (20 / 100);
      } else if (myAge === "19-40") {
        AudiencebyAge = AudienceByGender * (60 / 100);
      } else if (myAge === "41-65") {
        AudiencebyAge = AudienceByGender * (20 / 100);
      } else {
        AudiencebyAge = AudienceByGender;
      }
    }

    console.log(AudiencebyAge);

    // calculation according to gender age end

    // calculations for ad type (search ads) start
    const elementMappings = {
      infeed: 0.5,
      search: 0.2,
      videoads: 0.4,
    };

    const newArray = myArray.map((element) => {
      if (element in elementMappings) {
        return elementMappings[element];
      }
      return element;
    });

    let sum = 0;

    for (let i of newArray) {
      sum += i;
    }
    // console.log(sum)
    // calculations for ad type (search ads) end

    // calculations for ad tags (search ads) start
    const tagsMapping = {
      [myTags[0]]: Number((0.1 + Math.random() * 0.1).toFixed(2)),
      [myTags[1]]: Number((0.1 + Math.random() * 0.1).toFixed(2)),
      [myTags[2]]: Number((0.1 + Math.random() * 0.1).toFixed(2)),
      [myTags[3]]: Number((0.1 + Math.random() * 0.1).toFixed(2)),
      [myTags[4]]: Number((0.1 + Math.random() * 0.1).toFixed(2)),
    };

    const newTags = myTags.map((element) => {
      if (element in tagsMapping) {
        return tagsMapping[element];
      }

      return element;
    });

    // console.log(newTags);

    let sumtags = 0;
    let average;

    for (let i of newTags) {
      sumtags += i;
    }
    average = sumtags / newTags.length;

    // calculations for ad tags (search ads) end

    // total cost type + tags + categgory
    let totalCost = sum + average + costPoints;
    // console.log(sum, average, costPoints)
    // console.log(totalCost)
    // console.log(
    // 	totalCost)

    let totalPrice = totalCost * AudiencebyAge;
    console.log(totalPrice);

    const datatoSend = {
      Locations: locations,
      Tags: tagss,
      type: types,
      category: categorys,
      audience: AudiencebyAge,
      AdID: advid,
    };
    const newData = new Ad(datatoSend);
    await newData.save();
    res.json({ success: "ok" });
  } catch (err) {
    console.log(err);
  }
});

app.get("/getData", async (req, res) => {
  try {
    const PointsCategory = [
      {
        name: "Gaming",
        ctr: 0.02,
        audienceByCategory: 0.57,
        points: 5,
        selected: false,
      },
      {
        name: "Technology",
        ctr: 0.018,
        audienceByCategory: 0.5,
        points: 5,
        selected: false,
      },
      {
        name: "Travel",
        ctr: 0.016,
        audienceByCategory: 0.52,
        points: 5,
        selected: false,
      },
      {
        name: "Food",
        ctr: 0.02,
        audienceByCategory: 0.55,
        points: 5,
        selected: false,
      },
      {
        name: "Fashion",
        ctr: 0.019,
        audienceByCategory: 0.54,
        points: 5,
        selected: false,
      },
      {
        name: "Fitness",
        ctr: 0.014,
        audienceByCategory: 0.52,
        points: 5,
        selected: false,
      },
      {
        name: "Lifestyle",
        ctr: 0.016,
        audienceByCategory: 0.45,
        points: 4,
        selected: false,
      },
      {
        name: "Entertainment",
        ctr: 0.015,
        audienceByCategory: 0.49,
        points: 5,
        selected: false,
      },
      {
        name: "Activism",
        ctr: 0.009,
        audienceByCategory: 0.3,
        points: 2,
        selected: false,
      },
      {
        name: "Education",
        ctr: 0.019,
        audienceByCategory: 0.41,
        points: 4,
        selected: false,
      },
      {
        name: "Art",
        ctr: 0.016,
        audienceByCategory: 0.37,
        points: 3,
        selected: false,
      },
      {
        name: "Business",
        ctr: 0.02,
        audienceByCategory: 0.52,
        points: 5,
        selected: false,
      },
      {
        name: "Photography",
        ctr: 0.014,
        audienceByCategory: 0.3,
        points: 3,
        selected: false,
      },
      {
        name: "Literature",
        ctr: 0.009,
        audienceByCategory: 0.35,
        points: 2,
        selected: false,
      },
      {
        name: "Pets",
        ctr: 0.013,
        audienceByCategory: 0.37,
        points: 4,
        selected: false,
      },
      {
        name: "DIY",
        ctr: 0.012,
        audienceByCategory: 0.42,
        points: 4,
        selected: false,
      },
      {
        name: "Community",
        ctr: 0.018,
        audienceByCategory: 0.48,
        points: 5,
        selected: false,
      },
      {
        name: "Sports",
        ctr: 0.02,
        audienceByCategory: 0.55,
        points: 5,
        selected: false,
      },
      {
        name: "Music",
        ctr: 0.019,
        audienceByCategory: 0.5,
        points: 4,
        selected: false,
      },
      {
        name: "Film",
        ctr: 0.018,
        audienceByCategory: 0.47,
        points: 4,
        selected: false,
      },
      {
        name: "Health",
        ctr: 0.016,
        audienceByCategory: 0.45,
        points: 4,
        selected: false,
      },
      {
        name: "Home",
        ctr: 0.01,
        audienceByCategory: 0.25,
        points: 2,
        selected: false,
      },
      {
        name: "Design",
        ctr: 0.011,
        audienceByCategory: 0.35,
        points: 3,
        selected: false,
      },
      {
        name: "Science",
        ctr: 0.018,
        audienceByCategory: 0.5,
        points: 5,
        selected: false,
      },
      {
        name: "History",
        ctr: 0.015,
        audienceByCategory: 0.38,
        points: 3,
        selected: false,
      },
      {
        name: "Interests",
        ctr: 0.012,
        audienceByCategory: 0.35,
        points: 3,
        selected: false,
      },
      {
        name: "Meditation",
        ctr: 0.014,
        audienceByCategory: 0.45,
        points: 4,
        selected: false,
      },
      {
        name: "Charity",
        ctr: 0.012,
        audienceByCategory: 0.35,
        points: 3,
        selected: false,
      },
      {
        name: "Tech",
        ctr: 0.02,
        audienceByCategory: 0.5,
        points: 5,
        selected: false,
      },
      {
        name: "Cars",
        ctr: 0.016,
        audienceByCategory: 0.4,
        points: 3,
        selected: false,
      },
      {
        name: "Motivation",
        ctr: 0.014,
        audienceByCategory: 0.43,
        points: 4,
        selected: false,
      },
      {
        name: "Comedy",
        ctr: 0.017,
        audienceByCategory: 0.47,
        points: 5,
        selected: false,
      },
      {
        name: "Finance",
        ctr: 0.017,
        audienceByCategory: 0.48,
        points: 4,
        selected: false,
      },
      {
        name: "Hiking",
        ctr: 0.009,
        audienceByCategory: 0.35,
        points: 3,
        selected: false,
      },
      {
        name: "Astrology",
        ctr: 0.01,
        audienceByCategory: 0.35,
        points: 1,
        selected: false,
      },
      {
        name: "Spirituality",
        ctr: 0.012,
        audienceByCategory: 0.35,
        points: 3,
        selected: false,
      },
      {
        name: "Language",
        ctr: 0.009,
        audienceByCategory: 0.3,
        points: 2,
        selected: false,
      },
      {
        name: "LGBTQ+",
        ctr: 0.009,
        audienceByCategory: 0.25,
        points: 1,
        selected: false,
      },
      {
        name: "Startups",
        ctr: 0.016,
        audienceByCategory: 0.46,
        points: 5,
        selected: false,
      },
      {
        name: "Virtual Reality",
        ctr: 0.013,
        audienceByCategory: 0.39,
        points: 3,
        selected: false,
      },
      {
        name: "Anime",
        ctr: 0.02,
        audienceByCategory: 0.55,
        points: 5,
        selected: false,
      },
      {
        name: "Cosplay",
        ctr: 0.012,
        audienceByCategory: 0.37,
        points: 3,
        selected: false,
      },
      {
        name: "Cooking",
        ctr: 0.016,
        audienceByCategory: 0.45,
        points: 3,
        selected: false,
      },
    ];

    const myLocation = [
      {
        name: "Mumbai",
        audienceNo: 1200,
        men: 0.54,
        women: 0.46,
      },
      {
        name: "Delhi",
        audienceNo: 1000,
        men: 0.52,
        women: 0.48,
      },
      {
        name: "Banglore",
        audienceNo: 900,
        men: 0.52,
        women: 0.48,
      },
      {
        name: "Hyderabad",
        audienceNo: 800,
        men: 0.51,
        women: 0.49,
      },
      {
        name: "Chennai",
        audienceNo: 100,
        men: 0.503,
        women: 0.497,
      },
      {
        name: "Kolkata",
        audienceNo: 600,
        men: 0.525,
        women: 0.475,
      },
      {
        name: "Pune",
        audienceNo: 500,
        men: 0.52,
        women: 0.48,
      },
      {
        name: "Ahmedabad",
        audienceNo: 400,
        men: 0.53,
        women: 0.47,
      },
      {
        name: "Jaipur",
        audienceNo: 300,
        men: 0.53,
        women: 0.47,
      },
      {
        name: "Lucknow",
        audienceNo: 2000,
        men: 0.52,
        women: 0.48,
      },
      {
        name: "Kanpur",
        audienceNo: 3000,
        men: 0.54,
        women: 0.46,
      },
      {
        name: "Agra",
        audienceNo: 300,
        men: 0.534,
        women: 0.466,
      },
      {
        name: "Prayagraj",
        audienceNo: 250,
        men: 0.53,
        women: 0.47,
      },
      {
        name: "Meerut",
        audienceNo: 200,
        men: 0.53,
        women: 0.47,
      },
      {
        name: "Ghaziabad",
        audienceNo: 150,
        men: 0.53,
        women: 0.47,
      },
      {
        name: "Noida",
        audienceNo: 700,
        men: 0.55,
        women: 0.45,
      },
      {
        name: "Gorakhpur",
        audienceNo: 50,
        men: 0.53,
        women: 0.47,
      },
      {
        name: "Jhansi",
        audienceNo: 40,
        men: 0.53,
        women: 0.47,
      },
      {
        name: "Aligarh",
        audienceNo: 30,
        men: 0.53,
        women: 0.47,
      },
      {
        name: "Mathura",
        audienceNo: 10,
        men: 0.532,
        women: 0.468,
      },
    ];

    const datatoSend = {
      NewLocations: myLocation,
      Newcategory: PointsCategory,
    };

    const check = await Adbyloccategory.findOne({});

    if (check) {
      res.json(datatoSend);
    } else {
      const newData = new Adbyloccategory(datatoSend);
      const savedData = await newData.save();
      res.json(savedData);
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/audget", async (req, res) => {
  try {
    const audNo = await Ad.find();
    if (audNo) {
      res.status(200).json(audNo);
    }
  } catch (err) {
    console.log(err);
  }
});

//connect to App
const PORT = 7700;
const connectApp = () => {
  try {
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};

//distributing load to multiple cores
const numcpu = os.cpus().length;
// if (cluster.isMaster) {
//   console.log(`Master ${process.pid} is running`);

//   // Fork workers
//   for (let i = 0; i < numcpu; i++) {
//     cluster.fork();
//   }

//   // Handle worker exit
//   cluster.on("exit", (worker, code, signal) => {
//     console.log(`Worker ${worker.process.pid} died`);
//     // Only restart the worker if the exit was unexpected
//     if (code !== 0) {
//       console.log(`Restarting worker...`);
//       cluster.fork();
//     }
//   });
// } else {
//   console.log(`Worker ${process.pid} started`);
connectApp();
//}
//sockets
// const connectRedis = async () => {
//   try {
//     // Message can be either a string or a buffer
//     redis.publish("my-channel-1", JSON.stringify("message"));
//     redis.subscribe("my-channel-1", "my-channel-2", (err, count) => {
//       if (err) {
//         // Just like other commands, subscribe() can fail for some reasons,
//         // ex network issues.
//         console.error("Failed to subscribe: %s", err.message);
//       } else {
//         // `count` represents the number of channels this client are currently subscribed to.
//         console.log(
//           `Subscribed successfully! This client is currently subscribed to ${count} channels.`
//         );
//       }
//     });

//     redis.on("message", (channel, message) => {
//       console.log(`Received ${message} from ${channel}`);
//     });
//     console.log("Published %s to %s", "message");
//   } catch (err) {
//     console.log(err);
//   }
// };
// connectRedis();

// io.on("connection", (socket) => {
//   console.log(socket.id);

//   socket.on("join-redis", (a) => {
//     console.log(a);
//     socket.join("my-channel-1");
//   });

//   socket.on("chatMessage", (message) => {
//     console.log(message);
//     publisher.publish("my-channel-1", message);
//   });

//   subscriber.subscribe("my-channel-1", "my-channel-2", (err, count) => {
//     if (err) {
//       console.error("Failed to subscribe: %s", err.message);
//     } else {
//       console.log(
//         `Subscribed successfully! This client is currently subscribed to ${count} channels.`
//       );
//     }
//   });
//   subscriber.on("message", (channel, message) => {
//     socket.to(channel).emit("channel", message);
//     console.log(`Received ${message} from ${channel}`);
//   });
//   socket.on("disconnect", () => {
//     console.log("User disconnected");
//     subscriber.unsubscribe("my-channel-1");
//     subscriber.quit();
//   });
// });

// http.listen(4300, function () {
//   console.log("Sockets on 4300");
// });
