const mongoose = require("mongoose")

const buttonSchema = new mongoose.Schema({
	backgroundColor: String,
	Color: String,
	borderTop: String,
	borderBottom: String,
	borderRight: String,
	borderLeft: String,
	paddingX: String,
	paddingY: String,
	borderRadiusTop: String,
	borderRadiusBottom: String,
	borderRadiusRight: String,
	borderRadiusLeft: String,
	boxShadow: String,
	fontBold: String,
	text: String,

	image: { type: String, default: null }
})

module.exports = mongoose.model("Button", buttonSchema)