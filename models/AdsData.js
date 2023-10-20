const mongoose = require("mongoose")

const myAds = new mongoose.Schema({
	Locations: Array,
	Tags: Array,
	type: Array,
	category: String,
	audience: Number,
	AdID: Number
})

const Ad = new mongoose.model("Ad", myAds)
module.exports = Ad