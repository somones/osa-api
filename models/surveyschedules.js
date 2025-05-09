const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const surveyScheduleSchema = new Schema({
    scheduleId: {type: String,required: true},
    scheduleDate: {type: Date,required: true},
    clientId: {type: String,required: true},
    userId:{type: String,required: true},
    countryId: {type: String,required: true},
    day:{type: Number,required: true},
    month:{type: Number,required: true},
    cityId: {type: Array,required: true},
    active: {type: Boolean, required: true, default: true},
    isDeleted: {type: Boolean, required: true, default: false},
    created: {type: Date},
    channelId: {type: Array},
    branchRetailerDetails: [{
        surveyId:String,
        storeId:String,
        branchRetailerId: Number,
        branchRetailerName: String,
        regionId: String,
        channelId: String,
        gradeId: String,
        sourceId: String,
        segmentId: String,
        cityId: String,
        retailerId: String,
        googleLink: String,
        latitude: String,
        longitude: String,
        active: Boolean,
        isCompleted:Boolean,
        isDeleted: Boolean,
        created: Date,
        surveyDate:Date,
        remarks:String
      }],
    hasSubmitted: {
        type: Boolean
    }
});
autoIncrement.initialize(mongoose.connection);
surveyScheduleSchema.plugin(autoIncrement.plugin, { model: 'Surveyschedules', field: 'scheduleId' });
const Surveyschedules = mongoose.model("Surveyschedules", surveyScheduleSchema);
module.exports = Surveyschedules;