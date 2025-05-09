const { text } = require("body-parser");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');
const contactSchema = new Schema({
    contacttId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    emailId: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    active: {type: Boolean, required: true, default: true},
    isDeleted: {type: Boolean, required: true, default: false},
    created: {type: Date}
});
autoIncrement.initialize(mongoose.connection);
contactSchema.plugin(autoIncrement.plugin, { model: 'contact', field: 'contacttId' });
const Contact = mongoose.model("contact", contactSchema);
module.exports = Contact;