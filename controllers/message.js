const Message = require("../models/message");

exports.postMessages = async (req, res) => {
  const { name, message } = req.body;
  const newM = new Message({ name, message });
  await newM.save();
};
