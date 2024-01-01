const express = require("express");
const router = express.Router();
const stripe = require("stripe")(
  "sk_test_51NAGrZSEXlKwVDBNhya5wiyCmbRILf14f1Bk2uro1IMurrItZFsnmn7WNA0I5Q3RMnCVui1ox5v9ynOg3CGrFkHu00hLvIqqS1"
);
const Topic = require("../models/topic");

router.post("/testing", async (req, res) => {
  try {
    const pi = await stripe.paymentIntents.create({
      amount: req.body.topicprice * 100,
      currency: "INR",
      automatic_payment_methods: {
        enabled: true,
      },
    });
    res.json({ sec: pi.client_secret });
  } catch (e) {
    console.log(e.message);
  }
});

// router.post("/helo/link", async (req, res) => {
//   res.send('<script>window.open("/separate-page", "_blank");</script>');
// });
router.post("/helo/link", async (req, res) => {
  res.send("<div>wytvubimo</div>");
});

router.post("/sub", async (req, res) => {
  const { top } = req.body;

  await Topic.updateOne(
    { _id: top },
    {
      $push: {
        notificationtoken: {
          token:
            "fCJpCYf-SLe4J5GRqA_aeG:APA91bEsJK1EfEBIS-kSciOmM0-0h1Qyx4zhdRSHB9sFp8fBDOgIYz0eGySyn5FdawYDs94PpoKA5DgvnIwmcS0XH4afnu_15p_N1hikkR4nKHWECkHq25S1CN5YnQERB-m4DhDUPAEy",
          subscribed: true,
        },
      },
    }
  );
  res.status(200).send({ message: "Got it" });
});

router.get("/successs1", async (req, res) => {
  try {
    res.send('<script>window.open("/separate-page", "_blank");</script>');
  } catch (e) {
    console.log(e);
  }
});

router.post("/msgtest", async (req, res) => {});

module.exports = router;
