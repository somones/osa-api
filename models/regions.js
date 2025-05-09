const { text } = require("body-parser");
const mongoose = require("mongoose");
const autoIncrement = require('mongoose-auto-increment');
const Schema = mongoose.Schema;

const regionsSchema = new Schema({
    regionId: {
        type: String,
        required: true
    },
    regionName: {
        type: String,
        required: true
    },
    surveyActivities:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Surveyactivities' 
        }
    ],
    active: {type: Boolean, required: true, default: true},
    isDeleted: {type: Boolean, required: true, default: false},
    created: {type: Date}
});
autoIncrement.initialize(mongoose.connection);
regionsSchema.plugin(autoIncrement.plugin, { model: 'regions', field: 'regionId' });
const Regions = mongoose.model("regions", regionsSchema);
module.exports = Regions;