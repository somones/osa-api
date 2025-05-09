const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const staticPagesSchema = new Schema({
    _id: { type: String },
    pageId: {
        type: String,
        required: true
    },
    pageName: {
        type: String,
        required: true
    },
    pageTitle: {
        type: String,
        required: true
    },
    pageContent: {
        type: Array,
        required: true
    },
    pageMetaTitle: {
        type: String,
        required: true
    },
    pageMetaDescription: {
        type: String,
        required: true
    },
    pageMetaKeywords: {
        type: String,
        required: true
    },
    active: {type: Boolean, required: true, default: true},
    isDeleted: {type: Boolean, required: true, default: false},
  created: {
      type: Date
  }

    
});

const Staticpages = mongoose.model("staticpages", staticPagesSchema);
module.exports = Staticpages;