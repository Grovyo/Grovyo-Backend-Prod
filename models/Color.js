const mongoose = require("mongoose")

const mySchema = new mongoose.Schema({
	bg: String,
	text: String,
	button: String,
	number: Number
})

module.exports = mongoose.model("Color", mySchema)