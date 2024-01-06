const mongoose = require("mongoose")
const lottieSchema = new mongoose.Schema({
	lottieFile: String
})

module.exports = mongoose.model("Lottie", lottieSchema)