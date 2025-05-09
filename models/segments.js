const { text } = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const segmentsSchema = new Schema({
  _id:{type:mongoose.Schema.Types.ObjectId},
    segmentId: {
        type: String,
        required: true
    },
    segmentName: {
        type: String,
        required: true
    },
    sources:[
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Sources"
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
segmentsSchema.plugin(autoIncrement.plugin, { model: 'segments', field: 'segmentId' });
const Segments = mongoose.model("segments", segmentsSchema);
module.exports = Segments;