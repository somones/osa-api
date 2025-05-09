const { text } = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const surveyActivitySchema = new Schema({
    surveyActivityId: {type: String,required: true},
    surveyId: {type: String,required: true},
    userId:{type: String,required: true},
    catId: {
        type: String,
      },
    channelId: {
        type: String,
      },
    retailerId: {
        type: String,
      },
    branchRetailerId: {
        type: String,
      },
    regionId: {
        type: String,
      },
    cityId:{
        type: String,
      },
    sourceId:{
        type: String,
      },
    segmentId:{
        type: String,
      },
    skuId: {
        type: String,
      },
    brandId: {
        type: String,
      },
    available: {type: Boolean,required: true},
    active: {type: Boolean, required: true, default: true},
    isDeleted: {type: Boolean, required: true, default: false},
    created: {type: Date}
});

const Surveyactivities = mongoose.model("Surveyactivities", surveyActivitySchema);
module.exports = Surveyactivities;