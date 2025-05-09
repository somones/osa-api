const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const areaSchema = new Schema({
    _id: { type: String },
    rolesId: {
        type: String,
        required: true
    },
    rolesName: {
        type: String,
        required: true
    },
    user: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ]
});

const Area = mongoose.model("Roles", areaSchema);
module.exports = Area;