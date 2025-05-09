const mongoose = require ('mongoose');
const bcrypt = require ('bcryptjs');
const config = require ('../config/database');
const autoIncrement = require('mongoose-auto-increment');
//Super Admin Schema
const UsersSchema = mongoose.Schema({
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
	userName: {type: String, unique: true, required: true},
	password: {type: String, required:true},
  contactNumber: {type: String},
  roles: {type: String},
  registationToken: {type: String},
  registationExpiry:{type:Date},  
  resetPasswordToken: {type: String},
  resetPasswordExpiry: {type: Date},
  active:{type: Boolean},
  isDeleted:{type: Boolean},
  created:{type: Date},
  deviceToken:{type: String},
  userId:{type: Number},
  isActivated:{type:Boolean}
});
autoIncrement.initialize(mongoose.connection);
UsersSchema.plugin(autoIncrement.plugin, { model: 'users', field: 'userId' });
const Users = module.exports = mongoose.model('Users', UsersSchema);

module.exports.getUsersByUserName = function(userName, callback){
  const query = {userName: userName}
  Users.findOne(query, callback);
}

module.exports.getUsersByID = async function(id, callback){
  Users.findById(id, callback);
}

module.exports.addUsers = async function(newUsers, callback){
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newUsers.password, salt, (err, hash) => {
      if (err) throw err;
      newUsers.password = hash;
      newUsers.save(callback);
    });
  });
}

module.exports.comparePassword = async function(candidatePassword, hash, callback){
  bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    if (err) throw err;
    callback(null, isMatch);
  });
}
