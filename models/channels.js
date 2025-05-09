const { text } = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const channelsSchema = new Schema({
    channelId: {
        type: String,
        required: true
    },
    channelName: {
        type: String,
        required: true
    },
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
channelsSchema.plugin(autoIncrement.plugin, { model: 'Channels', field: 'channelId' });
const Channels = mongoose.model("Channels", channelsSchema);
module.exports = Channels;