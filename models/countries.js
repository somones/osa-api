const mongoose = require("mongoose");
const autoIncrement = require('mongoose-auto-increment');
const Schema = mongoose.Schema;

const countiesSchema = new Schema({
    countryId: {
        type: String,
        required: true
    },
    countryName: {
        type: String,
        required: true
    },
    countryShortName: {
        type: String,
        required: true
    },
    latitude: {
        type: String,
        required: true
    },
    longitude: {
        type: String,
        required: true
    },
    
    active: {type: Boolean, required: true, default: true},
    isDeleted: {type: Boolean, required: true, default: false},
    cities: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "City"
        }
      ]
});
autoIncrement.initialize(mongoose.connection);
countiesSchema.plugin(autoIncrement.plugin, { model: 'Countries', field: 'countryId' });
const Countries = mongoose.model("Countries", countiesSchema);
module.exports = Countries;