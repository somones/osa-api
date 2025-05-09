const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const skusSchema = new Schema({
    skuId: {
        type: String,
        required: true
    },
    brandId: {
        type: String,
        required: true
    },
    catSerialNo: {
        type: Number,
    },
    brandSerialNo: {
        type: Number,
    },
    catId: {
        type: String,
        required: true
    },
    skuName: {
        type: String,
        required: true
    },
    skuArabicName: {
        type: String,
        required: true
    },
    skuNumber: {
        type: String,
        required: true
    },
    barcode: {
        type: String,
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    segmentId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    surveyActivities:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Surveyactivities' 
        }
    ],
    skuImage: {
        type: Array,
        required: true
    },
    channels:[
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Channels"
        }
      ],
    active: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false },
    created: {
        type: Date
    }
});
autoIncrement.initialize(mongoose.connection);
skusSchema.plugin(autoIncrement.plugin, { model: 'Skus', field: 'skuId' });
const Skus = mongoose.model("Skus", skusSchema);
module.exports = Skus;