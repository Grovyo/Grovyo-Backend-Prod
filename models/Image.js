const mongoose = require("mongoose")
const imageSchema = mongoose.Schema({
	myFile: String,
	userid: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}
});

module.exports = mongoose.model("Image", imageSchema);