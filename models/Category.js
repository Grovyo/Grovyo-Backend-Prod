const mongoose = require("mongoose")

const backendData = new mongoose.Schema({
	NewLocations: Array,
	Newcategory: Array,

})

const Adbyloccategory = new mongoose.model("Adbyloccategory", backendData)
module.exports = Adbyloccategory

// all category and locations