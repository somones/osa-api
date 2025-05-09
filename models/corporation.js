const mongoose = require ('mongoose');
const bcrypt = require ('bcryptjs');
const config = require ('../config/database');

const autoIncrement = require('mongoose-auto-increment');
//Corporations Schema
const CorporationSchema = mongoose.Schema({
  profilePictureUrl: {type: String},
  repFullName: {type: String, required: true},
  emailId: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  contactNumber: {type: String, required: true},
  countryId:{type: String, required: true},
  active: {type: Boolean, required: true, default: true},
  isDeleted: {type: Boolean, required: true, default: true},
  accessList: {type: [String]},
  lastLoggedIn: {type: Date},
  resetPasswordToken: {type: String},
  resetPasswordExpiry: {type: Date},
  created: {type: Date}
});

const Corporation = module.exports = mongoose.model('Corporation', CorporationSchema);

module.exports.getCorporationByEmailID = function(emailId, callback){
  const query = {emailId: emailId};
  Corporation.findOne(query, callback);
}

module.exports.getCorporationByID = function(id, callback){
  Corporation.findById(id, callback);
}

module.exports.addCorporation = function(newCorporation, callback){
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newCorporation.password, salt, (err, hash) => {
      if (err) throw err;
      newCorporation.password = hash;
      newCorporation.save(callback);
    });
  });
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
  bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    if (err) throw err;
    callback(null, isMatch);
  });
}
