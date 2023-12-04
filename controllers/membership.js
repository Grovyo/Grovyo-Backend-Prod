const Membership = require("../models/membership");
const User = require("../models/userAuth");

//create a new membership
exports.createmembership = async (req, res) => {
  try {
    const {
      title,
      start,
      end,
      details,
      amount,
      discountedprice,
      plantype,
      percentoff,
    } = req.body;

    const mem = new Membership({
      title: title,
      start,
      end,
      details,
      amount,
      discountedprice,
      plantype,
      percentoff,
    });
    await mem.save();
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Error creating membership", success: false });
  }
};

//buy a membership
exports.buymembership = async (req, res) => {
  try {
    const { id, membershipid } = req.params;
    const { mode, amount } = req.body;
    const user = await User.findById(id);
    const mem = await Membership.findById(membershipid);
    if (user && mem) {
      const currentDate = new Date();

      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + 30);

      //   const currentDateString = currentDate.toISOString().split("T")[0];
      const futureDateString = futureDate.toISOString().split("T")[0];

      const membership = {
        user: user?._id,
        ending: futureDateString,
        paymentdetails: {
          mode: mode,
          amount: amount || mem.amount,
          gstamount: (amount * 18) / 100 || (mem.amount * 18) / 100,
        },
      };

      await Membership.updateOne(
        { _id: mem?._id },
        {
          $push: {
            broughtby: membership,
          },
        }
      );

      const usermembership = {
        membership: mem?._id,
        ending: futureDateString,
        paymentdetails: {
          mode: mode,
          amount: amount || mem.amount,
          gstamount: (amount * 18) / 100 || (mem.amount * 18) / 100,
        },
      };

      await User.updateOne(
        { _id: user?._id },
        {
          $push: {
            memberships: usermembership,
          },
        }
      );

      res.status(200).json({ success: true });
    } else {
      res
        .status(404)
        .json({ message: "Something not found...", success: false });
    }
  } catch (e) {
    console.log(e);
    res
      .status(400)
      .json({ message: "Error buying membership", success: false });
  }
};
