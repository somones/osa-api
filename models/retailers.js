const mongoose = require ('mongoose');
const bcrypt = require ('bcryptjs');
const config = require ('../config/database');
const autoIncrement = require('mongoose-auto-increment');
//Retailers Schema
const RetailersSchema = mongoose.Schema({
  retailerId: {type: String},
  retailerName: {type: String, required: true},
  retailerImage: {type: String, required: true},
  channels:[
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channels"
    }
  ],
  cities:[
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cities"
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
created: {type: Date}

});

autoIncrement.initialize(mongoose.connection);
RetailersSchema.plugin(autoIncrement.plugin, { model: 'Retailers', field: 'retailerId' });
const Retailers = mongoose.model("Retailers", RetailersSchema);
module.exports = Retailers;