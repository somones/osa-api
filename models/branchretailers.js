const mongoose = require ('mongoose');
const bcrypt = require ('bcryptjs');
const config = require ('../config/database');
const autoIncrement = require('mongoose-auto-increment');
//Retailers Schema
const BranchRetailersSchema = mongoose.Schema({
    regionId: {type: String, required: true},
    channelId: {type: String, required: true},
    gradeId: {type: String, required: true},
    cityId: {type: String, required: true},
    retailerId: {type: String, required: true},
    googleLink: {type: String, required: true},
    latitude: {type: String, required: true},
    longitude: {type: String, required: true},
    branchRetailerId: {type: String},
    branchRetailerName: {type: String, required: true},
    branchRetailerImage: {type: String},
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
BranchRetailersSchema.plugin(autoIncrement.plugin, { model: 'Branchretailers', field: 'branchRetailerId' });
const Branchretailers = mongoose.model("Branchretailers", BranchRetailersSchema);
module.exports = Branchretailers;