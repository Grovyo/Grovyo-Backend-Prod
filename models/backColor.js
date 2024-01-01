const mongoose = require("mongoose")

const backColorSchema = new mongoose.Schema({
	backgroundColor: String,
	textcolor: String,
	buttonColor: String
})

module.exports = mongoose.model("BackColor", backColorSchema)