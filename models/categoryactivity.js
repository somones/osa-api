const { text } = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categoryActivitySchema = new Schema({
    categoryActivityId: {type: String,required: true},
    surveyId: {type: String,required: true},
    catId: {type: String,required: true},
    userId:{type: String,required: true},
    channelId: {type: String,required: true},
    retailerId: {type: String,required: true},
    branchRetailerId: {type: String,required: true},
    categoryPictures:{type: Array,required: true},
    active: {type: Boolean, required: true, default: true},
    isDeleted: {type: Boolean, required: true, default: false},
    created: {type: Date}
});

const Categoryactivities = mongoose.model("Categoryactivities", categoryActivitySchema);
module.exports = Categoryactivities;