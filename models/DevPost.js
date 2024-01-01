const mongoose = require("mongoose")
const postSchema = mongoose.Schema({
	devPostFile: String,
	Imagetype: {
		type: String,
		default: "Free"
	},
});

module.exports = mongoose.model("DevPost", postSchema);