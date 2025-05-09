const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const categoriesSchema = new Schema({
    
    categoryId: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    categoryImage:{
        type: String,
        required: true
    },
    brands:[
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Brands"
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
categoriesSchema.plugin(autoIncrement.plugin, { model: 'categories', field: 'categoryId' });
const Categories = mongoose.model("categories", categoriesSchema);
module.exports = Categories;