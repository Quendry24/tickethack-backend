const mongoose = require("mongoose");

const voyageSchema = new mongoose.Schema({
    departure : String,
    arrival : String,
    date : Date,
    price : Number,
    isCarted : Boolean,
    isBooked : Boolean
});

const Voyage = mongoose.model("Voyage", voyageSchema);

module.exports = Voyage;