const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subCategoriesSchema = new Schema({
    _id: { type: String },
    subCategoryId: {
        type: String,
        required: true
    },
    categoryId: {
        type: String,
        required: true
    },
    categoryName: {
        type: String,
        required: true
    },
    active: {type: Boolean, required: true, default: true},
  delete: {type: Boolean, required: true, default: false},
  created: {
      type: Date
  }

    
});

const Subcategories = mongoose.model("subcategories", subCategoriesSchema);
module.exports = Subcategories;