const { text } = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const sourcesSchema = new Schema({
  _id:{type:mongoose.Schema.Types.ObjectId},
  sourcelId: {
        type: String,
        required: true
    },
    sourceName: {
        type: String,
        required: true
    },
    segments:[
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Segments"
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
sourcesSchema.plugin(autoIncrement.plugin, { model: 'Sources', field: 'sourcelId' });
const Sources = mongoose.model("Sources", sourcesSchema);
module.exports = Sources;