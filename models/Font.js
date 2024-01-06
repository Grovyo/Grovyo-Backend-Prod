const mongoose = require("mongoose")

const fontSchema = new mongoose.Schema({
	fontType: String,
	fontSize: String,
	fontWeight: Number,
	textShadow: String
})

module.exports = mongoose.model("Font", fontSchema)