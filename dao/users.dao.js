const jwt = require ('jsonwebtoken');
const db = require ('../config/database');
const config = require('../config/config')
const Users = require ('../models/user');
const {makeResponse} = require('../utils/utils') 
const nodemailer = require('nodemailer');
const sesTransport = require('nodemailer-ses-transport');
const emailcredentials = require('../config/EmailCredentials');
const cryptoRandomString = require("crypto-random-string");
var aws = require('aws-sdk');
const Notifications = ('../models/notifications')
aws.config.loadFromPath('config/s3_config.json');
var s3Bucket = new aws.S3( { params: {Bucket: 'myBucket'} } );
const bcrypt = require ('bcryptjs');
const gcm = require('node-gcm');
const moment = require('moment');
const { map } = require('async');
var mongoose = require('mongoose');

//Authenticate Super Admin Login
const authenticate =  async (req, res, next) =>{
    const username = req.body.emailId;
    const password = req.body.password;
  
    await Users.getUsersByUserName(username, (err, users) => {
      if(err){
        return makeResponse(res, false, 400, false, 'An Error occured.', 'An Error occured.'); 
      }
      if(!users){
        return makeResponse(res, false, 401, false, 'Account not found. Please enter a valid EmailID', 'Account not found. Please enter a valid EmailID');
      }

    Users.comparePassword(password, users.password, (err, isMatch) => {
        if (err){
            return makeResponse(res, false, 400, false, 'An Error occured.', 'An Error occured.');
        }
        if(isMatch){
            //console.log(users);
            const token = jwt.sign(users.toJSON(), db.secret, {
            expiresIn: 604800 //Seconds in 1 Week
          });
     return makeResponse(res, true, 200, true, 'Successfully Login', 'you are login successfully', [{
            token: 'JWT ' + token,
            user: {
              _id: users._id,
              firstName: users.firstName,
              lastName: users.lastName,
              userName: users.userName,
              isActivated:users.isActivated,
              isSuperAdmin: users.roles=='SuperAdmin' ? true : false    
            },
            bucketDetails:{
              bucketName:"osabuckets/categorypictures",
              accessKey:"AKIA4NRYEVGGS4JF23CK",
              secretKey:"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"
            }
          }]);
        } else{
          return makeResponse(res, false, 200, false, 'Wrong Password.', 'Wrong Password.');
        }
      });
    });
  }

  //Register Users
const register =  async (req, res, next) =>{
//   let secretCode = cryptoRandomString({
//     length: 6,
// });
    await Users.findOne({emailId:req.body.emailId}).then(data=>{
      if(data&&data.emailId){
        let err =  'email already exists'
        return makeResponse(res, false, 200, false, err,err);
      }
    })
    let secretCode = Math.random(); 
    let newUsers = new Users({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      userName: req.body.userName,
      secretCode: secretCode,
      password: req.body.password ? req.body.password : Date.now() + +(3600000 * 1),
      contactNumber:req.body.contactNumber,
      active:true,
      resetPasswordExpiry: undefined,
      resetPasswordToken: undefined,
      isActivated: req.body.isSocialRegister ? true : false,
      registationToken: undefined,
      registationExpiry: undefined
    });

    Users.addUsers(newUsers, async (err, user)=>{
      if(err){
        return makeResponse(res, false, 400, false, err,err);
      }
      else{
        const token = Math.floor(100000 + Math.random() * 900000);
        let foundUser = await Users.findOneAndUpdate(
          { emailId: req.body.emailId },
          { $set: { registationToken: token,registationExpiry: +Date.now() + +(3600000 * 1)} }
         );
          if(!foundUser){
              return makeResponse(res, true, 401, false, 'An error occured', 'An error occured');
          }
          else{
            if(!req.body.isSocialRegister){
            var transporter = nodemailer.createTransport(sesTransport({
                scKeyID: emailcredentials.scKeyID,
                scKey: emailcredentials.scKey,
                rateLimit: 5
            }));

            var mailOptions = {
              from: emailcredentials.emailid,
              to: req.body.emailId,
              subject: 'Your Activation Link for Scorecart!',
              text: 'Thank you for register with us on ScoreCarts. ' +
                  'Your Registation token is '+ token + '\n\n' +
                  'Please enter the Registation Token, in your Mobile Application to complete the process ' +
                  'If you did not request this, please ignore this email.'
                };
            transporter.sendMail(mailOptions, function(error, info){
              if (error) {
              return makeResponse(res, true, 400, false, error, error);
              }
            });
          }
          }
          if(req.body.isSocialRegister&&req.body.isSocialRegister!=undefined){
            return makeResponse(res, true, 200, true, 'Successfully Login', 'you are login successfully', [{
              token: 'JWT ' + token,
              user: {
                _id: user._id,
                fullName: user.fullName,
                emailId: user.emailId,
                profileImageUrl:user.profilePictureUrl,
                isAddProfile: (user.gender || user.nationality) ? true : false,
                isActivated:user.isActivated    
              },
              bucketDetails:{
                bucketName:"osabuckets/categorypictures",
                accessKey:"AKIA4NRYEVGGS4JF23CK",
                secretKey:"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"
              }
            }]);
            
          }else{
            return makeResponse(res, true, 200, true, 'User Registered', 'User Registered', user);
          }
      }
    });
  };

  // Verification of Email
const registationEmail = async (req, res) => {
  await Users.findOne({userName: req.body.emailId.toLowerCase()}, async (err, user)=>{
    if(!user){
      return makeResponse(res, true, 200, false, 'No Account with this Email exists!', 'No Account with this Email exists!');
    }
    else{
      if(user.active){
        const token = Math.floor(100000 + Math.random() * 900000);
        
        let foundUser = await Users.findOneAndUpdate(
          { userName: req.body.emailId },
          { $set: { registationToken: token,registationExpiry: +Date.now() + +(3600000 * 1)} }
         );
          if(!foundUser){
              return makeResponse(res, true, 401, false, 'An error occured', 'An error occured');
          }
          else{
            var transporter = nodemailer.createTransport(sesTransport({
                scKeyID: emailcredentials.scKeyID,
                scKey: emailcredentials.scKey,
                rateLimit: 5
            }));

            var mailOptions = {
              from: emailcredentials.emailid,
              to: req.body.emailId,
              subject: 'Your Activation Link for Scorecart!',
              text: 'Thank you for register with us on ScoreCarts. ' +
                  'Your Registation token is '+ token + '\n\n' +
                  'Please enter the Registation Token, in your Mobile Application to complete the process ' +
                  'If you did not request this, please ignore this email.'
                };

            transporter.sendMail(mailOptions, function(error, info){
              if (error) {
              return makeResponse(res, true, 400, false, error, error);
              } else {
                return makeResponse(res, true, 200, true, 'Email sent for resetting the password', 'Email sent for resetting the password');
              }
            });
          }
      }
      else{
          let errorText = 'This account is not active! Please contact customer support';
          return makeResponse(res, true, 400, false, errorText, errorText);
      }
    }
  });
}

    //Forgot password
const forgetPassword = async (req, res, next) => {
    await Users.findOne({userName: req.body.emailId.toLowerCase()}, async (err, user)=>{
      if(!user){
        return makeResponse(res, true, 401, false, 'No Account with this Email exists!', 'No Account with this Email exists!');
      }
      else{
        if(user.active){
          const token = Math.floor(100000 + Math.random() * 900000);
          let foundUser = await Users.findOneAndUpdate(
            { userName: req.body.emailId },
            { $set: { resetPasswordToken: token,resetPasswordExpiry: +Date.now() + +(3600000 * 1)} }
           );
            if(!foundUser){
                return makeResponse(res, true, 401, false, 'An error occured', 'An error occured');
            }
            else{
              var transporter = nodemailer.createTransport(sesTransport({
                  scKeyID: emailcredentials.scKeyID,
                  scKey: emailcredentials.scKey,
                  rateLimit: 5
              }));
              var mailOptions = {
                from: emailcredentials.emailid,
                to: req.body.emailId,
                subject: 'ScoreCarts Password Reset Request!',
                text: 'You are receiving this because you (or someone else) has requested to reset the password for your ScoreCarts Account. ' +
                    'Your Reset token is '+ token + '\n\n' +
                    'Please enter the Reset Token, in your Mobile Application to complete the process ' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.'
              };
  
              transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                return makeResponse(res, true, 400, false, error, error);
                } else {
                  return makeResponse(res, true, 200, true, 'Email sent for resetting the password', 'Email sent for resetting the password');
                }
              });
            }
        }
        else{
            let errorText = 'This account is not active! Please contact customer support';
            return makeResponse(res, true, 400, false, errorText, errorText);
        }
      }
    });
}

//Get Confirm the survey Location
const addProfile = async (req, res, next) =>{
  var data = {}
  //console.log(req.body.dateOfBirth.toString());
 let dob =  moment(req.body.dateOfBirth, 'DD-MM-YYYY').toDate();
 let age = moment().diff(dob, 'years');

  data["maritalStatus"] = req.body.maritalStatus
  data["kids"] = req.body.kids.toLowerCase();
  data["contactNumber"] = req.body.phone
  data["countryOfResidence"] = req.body.country
  data["cityOfResidence"] = req.body.city
  data["areaOfResidence"] = req.body.area
  // data['fullName'] = req.body.name;
  data['nationality'] = req.body.nationality
  data['dateOfBirth'] = req.body.dateOfBirth
  data['age'] = age
  data['gender'] = req.body.gender.toLowerCase()
  let _id = req.body.userId;
  Users.findByIdAndUpdate({_id}, {$set: data}, (err, response) =>{
    if(err) {
      //console.log(err);
      return makeResponse(res, false, 400, false, 'An Error occured.', 'An Error occured.');     
     }
     else{
      return makeResponse(res, true, 200, true, 'Changes saved successfully.', 'Changes saved successfully.',response);
     }
  });
};


//Get Confirm the survey Location
const getProfile = async (req, res, next) =>{

  Users.find({userName: req.body.emailId}, (err, data) =>{
    if(err ) {
      let errorText = 'An Error Occured! Please contact customer support';
             return makeResponse(res, true, 400, false, errorText, errorText);
    }else{
     return makeResponse(res, true, 200, true, 'User Details', 'User Details',data);
    }
  });
};

//Update Personal Details
const updateProfile = async (req, res, next) =>{
  var data = {}
  let dob =  moment(req.body.dateOfBirth, 'DD-MM-YYYY').toDate();
 let age = moment().diff(dob, 'years');
  data["maritalStatus"] = req.body.maritalStatus
  data["kids"] = req.body.kids.toLowerCase()
  data["contactNumber"] = req.body.phone
  data["countryOfResidence"] = req.body.country
  data["cityOfResidence"] = req.body.city
  data["areaOfResidence"] = req.body.area
  data["fullName"] = req.body.name
  data['nationality'] = req.body.nationality
  data['gender'] = req.body.gender.toLowerCase()
  data['dateOfBirth'] = req.body.dateOfBirth
  data['age'] = age

  let _id = req.body.userId;
  
  Users.findByIdAndUpdate({_id}, {$set: data}, (err, response) =>{
    if(err ) {
      return makeResponse(res, false, 400, false, 'An Error occured.', 'An Error occured.');     
     }
     else{
      return makeResponse(res, true, 200, true, 'Changes saved successfully.', 'Changes saved successfully.',response);
     }
  });
};

//update profile picture to s3
const updateProfilePicture = async (req, res) =>{
  // buf = Buffer.from(req.body.imageBinary.replace(/^data:image\/\w+;base64,/, ""),'base64')
  // var data = {
  //   Key: req.body.userId, 
  //   Body: buf,
  //   ContentEncoding: 'base64',
  //   ContentType: 'image/jpeg'
  // };
  // s3Bucket.putObject(data, function(err, data){
  //     if (err) { 
  //       //console.log(err);
  //       //console.log('Error uploading data: ', data); 
  //     } else {
  //       //console.log('successfully uploaded the image!');
  //     }
  // });
  var data = {}
  data["profilePictureUrl"] = req.body.profileLink
  
  let _id = req.body.userId;
  Users.findByIdAndUpdate({_id}, {$set: data}, (err, response) =>{
  if(err ) {
    return makeResponse(res, false, 400, false, err, err);     
   }
   else{
    return makeResponse(res, true, 200, true, 'Changes saved successfully.', 'Changes saved successfully.',response);
   }
  });
};

const resetPassword = async (req, res) => {
  Users.findOne({resetPasswordToken: req.body.resetPasswordToken}, (err, user)=>{
    if(!user){
      let err = 'Password reset token is invalid or has expired!';
      return makeResponse(res, false, 400, false, err, err);
    }
    else{
      const password = req.body.password;
      const resetPasswordToken = undefined;
      const resetPasswordExpiry = undefined;

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) throw err;
          Users.findOneAndUpdate({ userName: req.body.emailId },
            { $set: { resetPasswordToken: resetPasswordToken,password: hash, resetPasswordExpiry:resetPasswordExpiry} }).
            then((users)=>{
              //console.log(users);
              if(users!=null){
                //send sign up confirmation Email
                var transporter = nodemailer.createTransport(sesTransport({
                  scKeyID: emailcredentials.scKeyID,
                  scKey: emailcredentials.scKey,
                  rateLimit: 5
                }));
                
                var mailOptions = {
                  from: emailcredentials.emailid,
                  to: user.emailId,
                  subject: 'ScoreCarts Password Changed Successfully!',
                  text: 'Your Password has been changed successfully. \n' +
                  'Hello, \n' +
                  'This is a confirmation that your password has been changed for your ScoreCarts Account'
                };
                
                transporter.sendMail(mailOptions, function(error, info){
                  if (error) {
                    //console.log(error);
                  } else {
                    //console.log('Email sent: ' + info.response);
                  }
                });
     
                return makeResponse(res, true, 200, true, "Password updated", "Password updated");
              }else{
                let err = 'Reset password failure';
                return makeResponse(res, false, 400, false, err, err);
              }
            })
        });
      });
              
      }
      });
    
};

const verifyaccount = async (req, res) => {
    Users.findOne({registationToken: req.body.registationToken}, (err, user)=>{
      if(!user){
        let errorText = 'token is invalid or has expired!';
        return makeResponse(res, true, 200, false, errorText, errorText);
      }
      else{
        const registationToken = undefined;
        const registationExpiry = undefined;
  
            if (err) throw err;
            options = { upsert: true, new: true, setDefaultsOnInsert: true };
            Users.findOneAndUpdate({ userName: req.body.emailId },
              { $set: { registationToken: registationToken, registationExpiry:registationExpiry, isActivated:true} },options).
              then((users)=>{
                if(users!=null){
                  //send sign up confirmation Email
                  var transporter = nodemailer.createTransport(sesTransport({
                    scKeyID: emailcredentials.scKeyID,
                    scKey: emailcredentials.scKey,
                    rateLimit: 5
                  }));
                  
                  var mailOptions = {
                    from: emailcredentials.emailid,
                    to: user.emailId,
                    subject: 'ScoreCarts Account Activated Successfully!',
                    text: 'Your Account Activated successfully. \n' +
                    'Hello, \n' +
                    'This is a confirmation that your account has been activated for your ScoreCarts'
                  };
                  
                  transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                      //console.log(error);
                    } else {
                      //console.log('Email sent: ' + info.response);
                    }
                  });
       
                  const token = jwt.sign(users.toJSON(), config.secret, {
                    expiresIn: 604800 //Seconds in 1 Week
                  });
                  
                  return makeResponse(res, true, 200, true, "Account Activated", "Account Activated",[{
                    token: 'JWT ' + token,
                    user: {
                      _id: user._id,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      userName: user.emailId,
                      isActivated:user.isActivated    
                    },
                    bucketDetails:{
                      bucketName:"osabuckets/categorypictures",
                      accessKey:"AKIA4NRYEVGGS4JF23CK",
                      secretKey:"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"
                    }
                  }]);
                }else{
                  let err = 'Account Activation failure';
                  return makeResponse(res, false, 400, false, err, err);
                }
              })
                
        }
        });
      
  
} 
const deviceRegistration = async (req, res) =>{
  var data = {}
  data["deviceToken"] = req.body.deviceToken
  let _id = req.body.userId;
  
  Users.findByIdAndUpdate({_id}, {$set: data}, async (err, response) =>{
    if(err ) {
      return makeResponse(res, false, 400, false, 'An Error occured.', 'An Error occured.');     
     }
     else{
      const users =  await Users.findOne({_id:req.body.userId})
      return makeResponse(res, true, 200, true, 'Changes saved successfully.', 'Changes saved successfully.',users);
     }
  });
}


const getUsers = async (req, res) => {
  let { limit, page } = req.body;
  limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
  page = (!page) ? parseInt(0) : parseInt(page);
  let skip = limit * page;
  
  Users.aggregate([
          { $match: { 'isDeleted': false } },
        {$facet:{
           "stage1" : [ {"$group": {_id:null, count:{$sum:1}}} ],  
           "stage2" : [ { "$skip": skip}, {"$limit": limit} ]
         }},
         { "$sort": { "created": -1 } },
        {$unwind: "$stage1"},
        {$project:{
           count: "$stage1.count",
           data: "$stage2"
        }}  
    ]).then(async(users) => {
        let data = [];
      //   //console.log();
        await Promise.all(users[0].data.map( async(item) =>{


          userData = {
                  "_id" : item._id,
                  "firstName": item.firstName,
                  "lastName": item.lastName,
                  "userName": item.userName,
                  "contactNumber": item.contactNumber,
                  "password": item.password,
                  "userId" : item.userId,
                  "active": item.active,
                  "isActivated": item.isActivated,
                  "isDeleted":item.isDeleted,
                  "registationExpiry": item.registationExpiry,
                  "registationToken": item.registationToken,
                  "age": item.age,
      
                  "created": moment(item.created).format('DD, MMM YYYY'),

          } 
          data.push(userData);
        }));
        result = {
            count: users[0].count,
            data:data
        }
         res.status(200).json(result);
     })
}
const updateUsers = async (req, res) =>{
  if (!req.body) {
    let errorText = 'Users can not be empty.';
        return makeResponse(res, true, 400, false, errorText, errorText);
}

// Find Static Pages and update it with the request body
if(req.body.password&&req.body.password!=''){
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(req.body.password, salt, (err, hash) => {
      if (err){
        res.json({success: false, message: "An Error occured."});
      }
      // data[prop] = hash;
      Users.find({_id:mongoose.Types.ObjectId(req.body.userId)}).then(user => {
      Users.findByIdAndUpdate(user[0]._id, {
      firstName: req.body.firstName ? req.body.firstName : user[0].firstName,
      lastName: req.body.lastName ? req.body.lastName : user[0].lastName,
      userName: req.body.username ? req.body.username : user[0].userName,
      password: req.body.password ? hash :  user[0].password,
      contactNumber:req.body.contact ? req.body.contact :user[0].contactNumber,
      }, { new: true })
          .then(response => {
              if (!response) {
                  let errorText = "Users not found with id " + req.body.pageId;
              return makeResponse(res, true, 404, false, errorText, errorText);
              }
              return makeResponse(res, true, 200, true, 'Users', 'Users updated successfully',response);
          })
      });
    });
  });
}else{
  Users.find({_id:mongoose.Types.ObjectId(req.body.userId)}).then(user => {
    Users.findByIdAndUpdate(user[0]._id, {
      firstName: req.body.firstName ? req.body.firstName : user[0].firstName,
      lastName: req.body.lastName ? req.body.lastName : user[0].lastName,
      userName: req.body.username ? req.body.username : user[0].userName,
      contactNumber:req.body.contact ? req.body.contact :user[0].contactNumber,
      }, { new: true })
          .then(response => {
              if (!response) {
                  let errorText = "Users not found with id " + req.body.pageId;
              return makeResponse(res, true, 404, false, errorText, errorText);
              }
              return makeResponse(res, true, 200, true, 'Users', 'Users updated successfully',response);
          })
      });
}

}
const createUsers = async (req, res)=>{
  const user = await Users.findOne({userName:req.body.username});
    if(user&&user.userName){
      let err =  'username already exists'
      return makeResponse(res, false, 200, false, err,err);
    }

  let secretCode = Math.random(); 
  let newUsers = new Users({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    userName: req.body.username,
    userId:req.body.userId,
    secretCode: secretCode,
    password: req.body.password ? req.body.password : Date.now() + +(3600000 * 1),
    contactNumber:req.body.contact,
    active:true,
    isDeleted:false,
    resetPasswordExpiry: undefined,
    resetPasswordToken: undefined,
    isActivated: true,
    roles: 'Agent',
    registationToken: undefined,
    registationExpiry: undefined
  });
 
  Users.addUsers(newUsers, async (err, user)=>{
    if(err){
      return makeResponse(res, true, 400, false, err, err);
    }
    else{
      const token = Math.floor(100000 + Math.random() * 900000);
      let foundUser = await Users.findOneAndUpdate(
        { userName: req.body.username },
        { $set: { registationToken: token,registationExpiry: +Date.now() + +(3600000 * 1)} }
       );
        if(!foundUser){
            return makeResponse(res, true, 401, false, 'An error occured', 'An error occured');
        }
        else{
          return makeResponse(res, true, 200, true, 'User Registered', 'User Registered', user);
        }
    }
  });
}

module.exports = {
    authenticate,
    register,
    registationEmail,
    verifyaccount,
    forgetPassword,
    resetPassword,
    addProfile,
    getProfile,
    updateProfile,
    updateProfilePicture,
    deviceRegistration,
    getUsers,
    createUsers,
    updateUsers,
  };
  