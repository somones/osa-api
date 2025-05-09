const mongoose = require("mongoose");
const autoIncrement = require('mongoose-auto-increment');
const Schema = mongoose.Schema;
const citiesSchema = new Schema({
    cityId: {
        type: String,
        required: true
    },
    cityCode: {
        type: String,
    },
    cityName: {
        type: String,
        required: true
    },
    latitude: {
        type: String,
        required: true
    },
    longitude: {
        type: String,
        required: true
    },
	countries:[
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Countries"
        }
      ],
    surveyActivities:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Surveyactivities' 
        }
    ],
    active: {type: Boolean, required: true, default: true},
    isDeleted: {type: Boolean, required: true, default: false},
});
autoIncrement.initialize(mongoose.connection);
citiesSchema.plugin(autoIncrement.plugin, { model: 'Cities', field: 'cityId' });
const Cities = mongoose.model("Cities", citiesSchema);
module.exports = Cities;