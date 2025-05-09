const { text } = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const BrandsSchema = new Schema({
    brandId: {
        type: String,
        required: true
    },
    brandName: {
        type: String,
        required: true
    },
    brandImage: {
        type: String,
        required: true
    },
    categories:[
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Categories"
        }
      ],
    segments:[
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Segments"
    }
    ],
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
BrandsSchema.plugin(autoIncrement.plugin, { model: 'brands', field: 'brandId' });
const Brands = mongoose.model("brands", BrandsSchema);
module.exports = Brands;