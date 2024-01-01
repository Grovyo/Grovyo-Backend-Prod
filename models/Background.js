const mongoose = require("mongoose")

const backgroundSchema = new mongoose.Schema({
	backgroundImage: String,
})

module.exports = new mongoose.model("BackGround", backgroundSchema)
