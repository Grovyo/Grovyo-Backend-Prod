const mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;

const Collectionss = new mongoose.Schema({
	name: { type: String },
	category: { type: String },
	verfication: { type: String },
	creator: { type: ObjectId, ref: "User" },
	products: [{
		type: mongoose.Schema.Types.ObjectId, ref: 'Product'
	}]
})


module.exports = mongoose.model("Collectionss", Collectionss);