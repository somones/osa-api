const Categories =  require('../models/categories')
const { makeResponse } = require('../utils/utils');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const Countries = require('../models/countries');
const Corporation =  require('../models/corporation')
const config = require('../config/config');
var mongoose = require('mongoose');
const Users = require ('../models/user');
var aws = require('aws-sdk');
const Cities = require('../models/cities');
const Surveyschedules = require('../models/surveyschedules')
const Retailers = require('../models/retailers');
const Branchretailers = require('../models/branchretailers');
const Skus = require('../models/skus');
const Channels = require('../models/channels')
const Surveyactivities = require('../models/surveyactivity')
const Regions = require('../models/regions');
const Categoryactivities = require('../models/categoryactivity');
const authenticate = async (req, res) => {
const username = req.body.emailId.toLowerCase();
const password = req.body.password;
  
    Corporation.getCorporationByEmailID(username, (err, corporation) => {
      if(err){
        res.json({success: false, message: "An Error occured."});
      }
      if(!corporation){
        return res.json({success: false, message: 'Account not found. Please enter a valid EmailID'});
      }
  
      if(!corporation.active){
        return res.json({success: false, message: 'Corporation Account is not active. Please Contact Customer Support'});
      }
  
      if(corporation.dateOfExpiry < Date.now()){
        return res.json({success: false, message: 'Your Subscription has expired. Please Contact Customer Support'});
      }
  
      Corporation.comparePassword(password, corporation.password, (err, isMatch) => {
        if (err){
          res.json({success: false, message: "An Error occured."});
        }
        if(isMatch){
          var tokenobject = corporation.toJSON();
          delete tokenobject.profilePictureUrl;
          delete tokenobject.favorites;
          delete tokenobject.accessList;
          delete tokenobject.myBrandsList;
          tokenobject.type = "Corporation";
          tokenobject.issuedAt = new Date();
          const token = jwt.sign(tokenobject, config.secret, {
            expiresIn: 604800 //Seconds in 1 Week
          });
          let refreshToken = jwt.sign(
            { user: corporation },
            config.secret,
            { expiresIn: 604800 }
          );
  
          var distinctcountries = [];//getlist of distinctcountries
          var query = {};
          var cat =[];
          query["consolidated"] = true;
          query["completed"] = true;
          const categories = corporation.productCategory;
          if(Array.isArray(categories)){
            categories.forEach((element,index) => {
              cat.push(element + "-" + corporation.productSubcategory[index])
            });
            query['surveyId'] ={ "$in": cat };
          }else{
            query["surveyId"] = {$regex: corporation.productCategory + "-" + corporation.productSubcategory + ".*", $options: 'i' };
          }
          
         
                  res.json({
                    status:200,
                    success: true,
                    token: 'JWT ' + token,
                    refreshToken,
                    distinctCountries: distinctcountries,
                    // eggTypes: arrSkutypes,
                    corporation: {
                      _id: corporation._id,
                      profilePictureUrl: corporation.profilePictureUrl,
                      repFullName: corporation.repFullName,
                      brandName: corporation.brandName,
                      emailId: corporation.emailId,
                      productCategory: corporation.productCategory,
                      productSubcategory: corporation.productSubcategory,
                      accessList: corporation.accessList,
                      myBrandsList: corporation.myBrandsList,
                      packageCategory: corporation.packageCategory,
                      packageDuration: corporation.packageDuration,
                      expiryDate: corporation.dateOfExpiry,
                      active: corporation.active,
                      contactNumber: corporation.contactNumber,
                      favorites: corporation.favorites,
                      countries: corporation.countries,
                      noOfMonths: corporation.noOfMonths,
                      noOfAudits: corporation.noOfAudits,
                      surveySubscriptionExpiry: corporation.surveySubscriptionExpiry
                    }
                  });
        } else{
          return res.json({status:401,success: false, message: 'Wrong Password'});
        }
      });
    });
  };


const addNewSurveySchedule =  async (req, res) => {
        const selectedMonth = req.body.monthName;
        const dayName = req.body.dayName;
        Promise.all(dayName.map(async(dayData) =>{
          const checkSchedules = await Surveyschedules.find({isDeleted:false,day:dayData,month:selectedMonth,userId:req.body.userName});
          if(checkSchedules&&checkSchedules.length==0){
            let newDate = new Date();
            const year = newDate.getFullYear();
            const scheduleDate = new Date(year+'-'+selectedMonth+'-'+dayData)
            storeQuery ={};
            if(req.body.branchRetailerName&&req.body.branchRetailerName.length>0) {
                storeQuery['_id'] = {$in:req.body.branchRetailerName}
            }
            let stores = await Branchretailers.find(storeQuery);
            let storesData = []
            await Promise.all(stores.map(async (item) =>{
                let defaultId = uuidv4();
    
              const data = {
                surveyId:defaultId,
                surveyDate: moment().format(),
                branchRetailerId: item.branchRetailerId,
                storeId:item._id,
                branchRetailerName: item.branchRetailerName,
                regionId: item.regionId,
                channelId: item.channelId,
                gradeId: item.gradeId,
                cityId: item.cityId,
                retailerId: item.retailerId,
                googleLink: item.googleLink,
                latitude: item.latitude,
                longitude: item.longitude,
                active: false,
                isCompleted:false,
                isDeleted: false,
                created: moment().format()
              }
              storesData.push(data);
                      
            }))
            
                let surveyschedules =  new Surveyschedules({
                  scheduleDate: scheduleDate,
                  clientId: req.body.clientId,
                  userId:req.body.userName,
                  countryId: req.body.countryId,
                  cityId: req.body.cityName,
                  day:dayData,
                  month:selectedMonth,
                  channelId: [],
                  branchRetailerDetails: storesData,
                  hasSubmitted: true,
                  active: true,
                  isDeleted: false,
                  created: moment().format()
                })
                // Save Survey Activity in the database
                await surveyschedules.save()
          }else{
            console.log('already added for the day')
          }
          
        }))
          //console.log(data);
            return makeResponse(res, true, 200, true, 'Survey added', 'Survey added successfully');                    
}
const updateSurvey =  async (req, res) => {
    
    Surveygroups.find({_id:mongoose.Types.ObjectId(req.body.surveyId)}).then(cs => {
        Surveygroups.findByIdAndUpdate(cs[0]._id, {
            surveyAmount: req.body.surveyAmount ? req.body.surveyAmount : cs[0].surveyAmount,            
            dateOfExpiry: req.body.dateOfExpiry ? req.body.dateOfExpiry : cs[0].dateOfExpiry,
        }, { new: true })
        .then(resp => {
            if (!resp) {
                let errorText = "Survey not found with id " + req.body.surveyId;
            return makeResponse(res, true, 404, false, errorText, errorText);
            }
            return makeResponse(res, true, 200, true, 'Survey Approve Request', 'Survey Approve request done successfully',resp);
        }).catch(err => {
            if (err.kind === 'ObjectId') {
                let errorText = "Survey not found with id " + req.body.surveyId;
            return makeResponse(res, true, 404, false, errorText, errorText);
            }
            let errorText = "Error updating Survey with id " + req.body.surveyId;
            return makeResponse(res, true, 500, false, errorText, errorText);
            
        });
    });        
}

const viewApprovedSurvey = async (req, res) => {
  // let { limit, page } = req.body;
  // limit = (!limit) ? parseInt(30) : parseInt(limit)
  // page = (!page) ? parseInt(0) : parseInt(page);
  // let skip = limit * page;
    await Surveyschedules.aggregate([
      {$match:{isDeleted:false,"branchRetailerDetails.active":true,"branchRetailerDetails.isCompleted":true}},
      {$unwind:"$branchRetailerDetails"},
        {$project:{
        cityId:1,
        retailerId:1,
        userId:1,
        clientId:1,
        "branchRetailerDetails.branchRetailerName":1,
        "branchRetailerDetails.latitude":1,
        "branchRetailerDetails.retailerId":1,
        "branchRetailerDetails.cityId":1,
        "branchRetailerDetails.longitude":1,
        "branchRetailerDetails.surveyId":1,
        "branchRetailerDetails.surveyDate":1,
        "branchRetailerDetails.active":1,
        "branchRetailerDetails.isCompleted":1,
        scheduleId:1
      }
    }
    ]).then(async (response) => {
        let arr = [];    
        let arrData = [];    
        await Promise.all(response.map( async (item) =>{
          if(item.branchRetailerDetails.active && item.branchRetailerDetails.isCompleted){
                const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(item.branchRetailerDetails.cityId)},'cityName');
                const retailers = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.branchRetailerDetails.retailerId)}, 'retailerName');
                const users = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
                const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(item.clientId)},'repFullName');
                const data = {
              _id: item['_id'],
              scheduleId:item.scheduleId,
              branchRetailerName: item.branchRetailerDetails.branchRetailerName,
              // branchRetailerId: item.branchRetailerId,
              retailerName: retailers.retailerName,
              client: client.repFullName,
              userId: users._id,
              userName: users.userName,
              emailId: users.emailId,
              longitude: item.branchRetailerDetails.latitude,
              latitude: item.branchRetailerDetails.latitude,
              city: cities.cityName,
              scheduleDate:moment(item.branchRetailerDetails.surveyDate).format('DD, MMM YYYY h:mm:ss a'),
              surveyId: item.branchRetailerDetails.surveyId,
            }

            arr.push(data);
          }
          }));
          return makeResponse(res, true, 200, true, 'Pending Survey', 'Pending Survey fetched successfully',arr);
            })
}
const pendingSurvey = async (req, res) => {
  let { limit, page } = req.body;
  limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
  page = (!page) ? parseInt(0) : parseInt(page);
  let skip = limit * page;
    // await Surveyschedules.find({isDeleted:false}).sort({created: 'desc'})
    // skip(skip).limit(limit)
    await Surveyschedules.find({isDeleted:false, day:12, month:7})
    .then(async (response) => {
        let arr = [];    
        let arrData = [];    
        
        await Promise.all(response.map( async (ele) =>{
            await Promise.all(ele.branchRetailerDetails.map( async (item) =>{
              let status ;
              if(item.active){                
                  status = 'Review'
                  Surveyschedules.updateOne(
                    // _id: mongoose.Types.ObjectId(awnsers.surveyId),
                    { "branchRetailerDetails.surveyId": item.surveyId },
                    { 
                      $set: { 
                      "branchRetailerDetails.$.active" : true, 
                      "branchRetailerDetails.$.isDeleted" : false, 
                      "branchRetailerDetails.$.isCompleted" : true 
                      } 
                    },
                    function(err,numAffected) {
                        console.log(numAffected);
                          })
                  //         .catch(err => {
                              
                         
                  // });
                const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(item.cityId)});
                const retailers = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.retailerId)});
                const users = await Users.findOne({_id:mongoose.Types.ObjectId(ele.userId)});
                const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(ele.clientId)});
                // console.log("object")
                const data = {
                    
                    _id: ele['_id'],
                    scheduleId:ele.scheduleId,
                    branchRetailerName: item.branchRetailerName,
                    branchRetailerId: item.branchRetailerId,
                    retailerName: retailers.retailerName,
                    client: client.repFullName,
                    userId: users._id,
                    userName: users.userName,
                    emailId: users.emailId,
                    longitude: item.latitude,
                    latitude: item.latitude,
                    city: cities.cityName,
                    scheduleDate:moment(item.surveyDate).format('DD, MMM YYYY h:mm:ss a'),
                    surveyId: item.surveyId,
                    status
                   }
                   arr.push(data);
                  }
                
            }));
            arrData.push(ele)
            if(response.length == arrData.length){
              console.log(arr.length);
                let resp = arr.sort((a, b) => parseFloat(a.branchRetailerId) - parseFloat(b.branchRetailerId))
                return makeResponse(res, true, 200, true, 'Pending Survey', 'Pending Survey fetched successfully',resp);
            }
        }));
            })
}
//server side pagination implemented in manage schedules
const manageSchedules = async (req, res) => {

  let { limit, page } = req.body;
  limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
  page = (!page) ? parseInt(0) : parseInt(page);
  let skip = limit * page;
  let count= await Surveyschedules.find({isDeleted:false}).count();

    await Surveyschedules.find({isDeleted:false}).skip(skip).limit(limit).sort({created:-1})
    .then(async (response) => {
        let arr = [];    
        let arrData = [];    
        
        await Promise.all(response.map( async (ele) =>{
              let status ;
              const cities = await Cities.findOne({_id:{$in:ele.cityId}});   
              const users = await Users.findOne({_id:mongoose.Types.ObjectId(ele.userId)});
              const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(ele.clientId)},'repFullName');
              const data = {
                    _id: ele['_id'],
                    scheduleId:ele.scheduleId,
                    client: client.repFullName,
                    userId: users ? users._id : '',
                    userName: users ? users.userName : '',
                    emailId: users ? users.emailId : '',
                    city: cities ? cities.cityName : '',
                    cityId:cities ? cities._id :'',
                    month:ele.month,
                    day:ele.day,
                    scheduleDate:moment(ele.scheduleDate).format('DD, MMM YYYY h:mm:ss a'),
                    count:count,
                    branchRetailerDetails:ele.branchRetailerDetails
                   }
                   arr.push(data);
                   if(response.length == arr.length){
                      let resp = arr.sort((a, b) => parseFloat(a.scheduleId) - parseFloat(b.scheduleId))
                      return makeResponse(res, true, 200, true,'Manage Schedules', 'Manage Schedules fetched successfully',resp);
                  }
            }));
           
          })
            
}

const updatependingSurvey = async (req, res) => {
  // let { limit, page } = req.body;
  // limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
  // page = (!page) ? parseInt(0) : parseInt(page);
  // let skip = limit * page;
    // await Surveyschedules.find({isDeleted:false}).sort({created: 'desc'})
    // skip(skip).limit(limit)
    await Surveyschedules.find({isDeleted:false})
    .then(async (response) => {
        let arr = [];    
        let arrData = [];    
        
        await Promise.all(response.map( async (ele) =>{
            await Promise.all(ele.branchRetailerDetails.map( async (item) =>{
              let status ;
              if(item.active && !item.isCompleted){
                
                  status = 'Review'
                  Surveyschedules.find({_id:mongoose.Types.ObjectId(ele._id)}).then(ss => {
                    Surveyschedules.updateOne(
                      // _id: mongoose.Types.ObjectId(awnsers.surveyId),
                      { "branchRetailerDetails.surveyId": item.surveyId },
                      { 
                        $set: { 
                        "branchRetailerDetails.$.active" : true, 
                        "branchRetailerDetails.$.isDeleted" : false, 
                        "branchRetailerDetails.$.isCompleted" : true 
                        } 
                      },
                      function(err,numAffected) {
                          console.log(numAffected);
                                if (!numAffected) {
                                    let errorText = "Survey not found with id " + req.body.surveyId;
                                return makeResponse(res, true, 404, false, errorText, errorText);
                                }
                              //  return makeResponse(res, true, 200, true, 'Survey Discard Request', 'Redeem request done successfully',numAffected);
                            }).catch(err => {
                                if (err.kind === 'ObjectId') {
                                    let errorText = "Survey not found with id " + req.body.surveyId;
                                return makeResponse(res, true, 404, false, errorText, errorText);
                                }
                                let errorText = "Error updating Survey with id " + req.body.surveyId;
                                return makeResponse(res, true, 500, false, errorText, errorText);
                                
                            });
                    });
                  }
                
            }));
            // arrData.push(ele)
            // if(response.length == arrData.length){
            //   console.log(arr.length);
            //     let resp = arr.sort((a, b) => parseFloat(a.branchRetailerId) - parseFloat(b.branchRetailerId))
            //     return makeResponse(res, true, 200, true, 'Pending Survey', 'Pending Survey fetched successfully',resp);
            // }
        }));
            })
}
const pendingAuditSurvey = async (req, res) => {

  let { limit, page } = req.body;
  console.log(" req.body", req.body);
  limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
  page = (!page) ? parseInt(0) : parseInt(page);
  let skip = limit * page;

  let todayDate = new Date();
  let startdate = moment(todayDate, "DD-MM-YYYY").subtract(1,'days').format('YYYY-MM-DD');
  let count= await Surveyschedules.find({isDeleted:false}).count();

  await Surveyschedules.find({isDeleted:false}).skip(skip).limit(limit).sort({created:-1})
  .then(async (response) => {

      let arr = [];    
      let arrData = [];    
      await Promise.all(response.map( async (ele) =>{
          await Promise.all(ele.branchRetailerDetails.map( async (item) =>{
            let status ;
            console.log(ele['_id']);
            if(!item.active || !item.isCompleted){
              if(!item.active && !item.isCompleted){
                status = 'Pending to Audit'
              const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(item.cityId)},'cityName');
              const retailers = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.retailerId)},'retailerName');
              const users = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
              const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(item.clientId)});
              const data = {
                  _id: item['_id'],
                  scheduleId:item.scheduleId,
                  branchRetailerName: item.branchRetailerName,
                  retailerName: retailers.retailerName,
                  client: client.repFullName,
                  userId: users._id,
                  userName: users.userName,
                  emailId: users.emailId,
                  longitude: item.latitude,
                  latitude: item.latitude,
                  city: cities.cityName,
                  count:count,
                  scheduleDate:moment(ele.scheduleDate).format('DD, MMM YYYY h:mm:ss a'),
                  surveyId: item.surveyId,
                  status
                 }
                 arr.push(data);
                }
              }
              else{
                status = 'Review' 
              }
              
          }));
          arrData.push(ele)
          if(response.length === arrData.length){
            let resp = arr.sort((a, b) => parseFloat(a.scheduleId) - parseFloat(b.scheduleId))
              return makeResponse(res, true, 200, true, 'Pending Audit Survey', 'Pending Audit Survey fetched successfully',resp);
          }
      }));
          })
}
const approveSurvey =  async (req, res) =>{
  Surveyschedules.find({isDeleted:false,_id:mongoose.Types.ObjectId(req.body._id)}).then(ss => {
    Surveyschedules.updateOne(
      // _id: mongoose.Types.ObjectId(awnsers.surveyId),
      { "branchRetailerDetails.surveyId": req.body.surveyId },
      { 
        $set: { 
        "branchRetailerDetails.$.active" : true, 
        "branchRetailerDetails.$.isDeleted" : false, 
        "branchRetailerDetails.$.isCompleted" : true 
        } 
      },
      function(err,numAffected) {
          //console.log(numAffected);
                if (!numAffected) {
                    let errorText = "Survey not found with id " + req.body.surveyId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
               return makeResponse(res, true, 200, true, 'Survey Discard Request', 'Redeem request done successfully',numAffected);
            }).catch(err => {
                if (err.kind === 'ObjectId') {
                    let errorText = "Survey not found with id " + req.body.surveyId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
                let errorText = "Error updating Survey with id " + req.body.surveyId;
                return makeResponse(res, true, 500, false, errorText, errorText);
                
            });
    });
}
const discardSurvey = async(req ,res) =>{
  Surveyschedules.find({_id:mongoose.Types.ObjectId(req.body._id)}).then(cs => {
    Surveyschedules.updateOne(
      // _id: mongoose.Types.ObjectId(awnsers.surveyId),
      { "branchRetailerDetails.surveyId": req.body.surveyId },
      { 
        $set: { 
        "branchRetailerDetails.$.active" : false, 
        "branchRetailerDetails.$.isDeleted" : true, 
        "branchRetailerDetails.$.remarks" : req.body.remarks, 
        "branchRetailerDetails.$.isCompleted" : false 
        } 
      },
      function(err,numAffected) {
          //console.log(numAffected);
                if (!numAffected) {
                    let errorText = "Survey not found with id " + req.body.surveyId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
               return makeResponse(res, true, 200, true, 'Survey Discard Request', 'Redeem request done successfully',numAffected);
            }).catch(err => {
                if (err.kind === 'ObjectId') {
                    let errorText = "Survey not found with id " + req.body.surveyId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
                let errorText = "Error updating Survey with id " + req.body.surveyId;
                return makeResponse(res, true, 500, false, errorText, errorText);
                
            });
    }); 
}
const connectDetails = async(req, res)=>{
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    
    Connect.aggregate([
        //    { $match: { 'isDeleted': 'false' } },
          {$facet:{
             "stage1" : [ {"$group": {_id:null, count:{$sum:1}}} ],  
             "stage2" : [ { "$skip": skip}, {"$limit": limit} ]
           }},
          {$unwind: "$stage1"},
          {$project:{
             count: "$stage1.count",
             data: "$stage2"
          }}  
      ]).then(async (connect) => {
        let data = [];
        //   //console.log();
          await Promise.all(connect[0].data.map( async(item) =>{
              //console.log(item.userId)
            const users = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
            //console.log(users);

            connectData = {
                    "_id": item._id,
                    "active": item.active,
                    "isDeleted": item.isDeleted,
                    "connectId": item.connectId,
                    "userId": users,
                    "emailId": item.emailId,
                    "message": item.message,
                    "created": moment(item.created).format('DD, MMM YYYY')
            } 
            data.push(connectData);
            //console.log(data);
          }));
          result = {
              count: connect[0].count,
              data:data
          }
           res.status(200).json(result);
       }).catch(err => {
           res.status(500).json({
               message: err.message || "Some error occurred while retrieving areas."
           });
       });
}
const surveyDetails =  async (req, res) =>{
  let osaSurvey = [];
  let catIds = [];
    const branchretailers = await Branchretailers.find({branchRetailerId: req.body.branchRetailerId});
    const retailer = await Retailers.find({_id: mongoose.Types.ObjectId(branchretailers[0].retailerId)})
    catIds = await Skus.find({channels: {$in :retailer[0].channels}}).distinct('catId');
      const categories = await Categories.find({_id: {$in:catIds} });
        await Promise.all(categories.map(async (item) => {
        const categoryactivity = await Categoryactivities.findOne({surveyId:req.body.surveyId,catId:item._id,userId:req.body.userId}) 
        const skus = await Skus.find({catId: item._id},'-channels');
        let skuArr = [];
        await Promise.all(skus.map(async (skuItem) =>{
           //console.log(req.body.surveyId,skuItem._id,req.body.userId)
          const surveyactivity =  await Surveyactivities.findOne({surveyId:req.body.surveyId,skuId:skuItem._id,userId:req.body.userId})
          //console.log(surveyactivity);
          const skuData = {
            skuId: skuItem.skuId,
            brandId: skuItem.brandId,
            catId: skuItem.catId,
            sourceId:skuItem.sourceId,
            segmentId:skuItem.segmentId,
            brandSerialNo:skuItem.brandSerialNo,
            catSerialNo:skuItem.catSerialNo,
            skuName: skuItem.skuName,
            skuArabicName: skuItem.skuArabicName,
            skuNumber: skuItem.skuNumber,
            barcode: skuItem.barcode,
            skuImage: skuItem.skuImage,
            channels:skuItem.channels,
            active: skuItem.active,
            isDeleted: skuItem.isDeleted,
            created: skuItem.created,
            available: surveyactivity ? surveyactivity.available : false,
            surveyActivityId: surveyactivity ? surveyactivity._id : ''
          }
          skuArr.push(skuData);
        }))
        const skuSortedData = skuArr.sort((a, b) => parseFloat(a.catSerialNo) - parseFloat(b.catSerialNo))
          
            const data = {
                categoryName: item.category,
                catId: item.categoryId,
                categoryQuestions:'How much SKUs available in '+ item.category,
                categorySkus: skuSortedData,
                categoryPictures:categoryactivity ? categoryactivity.categoryPictures : [],
                categoryPictureId:categoryactivity ? categoryactivity._id : []
            }
            osaSurvey.push(data);
            survey = {
                osaSurvey: {
                questionCount: 10,
                surveyId: item._id,
                surveyStartDate: "",
                surveyQuestions : osaSurvey.sort((a, b) => parseFloat(a.catId) - parseFloat(b.catId)) 
            }
            }
            if(categories.length == osaSurvey.length){
                return makeResponse(res, true, 200, true, 'Available Survey', 'Available survey fetched successfully',survey);            
            }
        }))
      
    // })
}
const archivedSurvey = async(req, res) =>{
  await Surveyschedules.aggregate([
    {$match:{"branchRetailerDetails.isDeleted":true}},
    {$unwind:"$branchRetailerDetails"},
      {$project:{
      cityId:1,
      retailerId:1,
      userId:1,
      clientId:1,
      "branchRetailerDetails.branchRetailerName":1,
      "branchRetailerDetails.latitude":1,
      "branchRetailerDetails.retailerId":1,
      "branchRetailerDetails.cityId":1,
      "branchRetailerDetails.longitude":1,
      "branchRetailerDetails.surveyId":1,
      "branchRetailerDetails.surveyDate":1,
      "branchRetailerDetails.active":1,
      "branchRetailerDetails.isDeleted":1,
      "branchRetailerDetails.isCompleted":1,
      "branchRetailerDetails.remarks":1,
      scheduleId:1,
    }
  }
  ]).then(async (response) => {
        let arr = [];    
        await Promise.all(response.map( async (item) =>{
          if(!item.branchRetailerDetails.active && !item.branchRetailerDetails.isCompleted && item.branchRetailerDetails.isDeleted){
              const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(item.branchRetailerDetails.cityId)},'cityName');
              const retailers = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.branchRetailerDetails.retailerId)},'retailerName');
              const users = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
              const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(item.clientId)},'repFullName');
            
            const data = {
              _id: item['_id'],
              scheduleId:item.scheduleId,
              branchRetailerName: item.branchRetailerDetails.branchRetailerName,
              // branchRetailerId: item.branchRetailerId,
              retailerName: retailers.retailerName,
              client: client.repFullName,
              userId: users._id,
              userName: users.userName,
              emailId: users.emailId,
              longitude: item.branchRetailerDetails.latitude,
              latitude: item.branchRetailerDetails.latitude,
              city: cities.cityName,
              scheduleDate:moment(item.scheduleDate).format('DD, MMM YYYY'),
              surveyId: item.branchRetailerDetails.surveyId,
              remarks:item.branchRetailerDetails.remarks
            }
            arr.push(data);
          }
            }));
                return makeResponse(res, true, 200, true, 'Pending Survey', 'Pending Survey fetched successfully',arr);
            })
}
const dashboard = async (req, res) => {
    let approvedSurvey = [];    
    let totalSurvey = [];    
    let corporations = await Corporation.find({isDeleted:false});
    let users = await Users.find({isDeleted:false});
    await Surveyschedules.find({isDeleted:false})
    .then(async (response) => {
        await Promise.all(response.map( async (ele) =>{
            await Promise.all(ele.branchRetailerDetails.map( async (item) =>{
              if(!item.isCompleted){
                totalSurvey.push(item);
              }
              if(item.active && item.isCompleted){
                approvedSurvey.push(item);
              }
            }));
          }));
        });
    
    
    
    const result = {
        approvedSurvey: approvedSurvey ? approvedSurvey.length :  0,
        users:users ? users.length : 0,
        corporations: corporations ? corporations.length : 0,
        totalSurvey: totalSurvey ? totalSurvey.length : 0
    }

    return makeResponse(res, true, 200, true, 'Dashboard', 'Dashboard Added successfully',result);

}
const createCorporations = async(req, res) =>{
  await Corporation.findOne({emailId:req.body.emailId}).then(data=>{
    if(data&&data.emailId){
      let err =  'email Id already exists'
      return makeResponse(res, false, 200, false, err,err);
    }
  })
  let newCorporation = new Corporation({
      profilePictureUrl: '',
    repFullName: req.body.repFullName,
    emailId: req.body.emailId,
    password: req.body.password,
    contactNumber: req.body.contactNumber,
    countryId:req.body.country,
    active:  true,
    isDeleted:  false,
    accessList: req.body.skuIds,
    created: moment().format(),
    resetPasswordToken: undefined,
    resetPasswordExpiry: undefined,
  });
  //console.log(req.body);
  Corporation.addCorporation(newCorporation, async (err, user)=>{
    if(err){
      return makeResponse(res, false, 400, false, err,err);
    }
    else{
      const token = Math.floor(100000 + Math.random() * 900000);
      let foundCorporation = await Corporation.findOneAndUpdate(
        { emailId:req.body.emailId },
        { $set: { registationToken: token,registationExpiry: +Date.now() + +(3600000 * 1)} }
       );
        if(!foundCorporation){
            return makeResponse(res, true, 401, false, 'An error occured', 'An error occured');
        }
        else{
          return makeResponse(res, true, 200, true, 'User Registered', 'User Registered', user);
        }
    }
  });
}
const updateCorporations = async(req, res) =>{
  if (!req.body) {
    let errorText = 'Corporation can not be empty.';
        return makeResponse(res, true, 400, false, errorText, errorText);
}

// Find Static Pages and update it with the request body
Corporation.find({_id:mongoose.Types.ObjectId(req.body.corpId)}).then(corp => {
  Corporation.findByIdAndUpdate(corp[0]._id, {
    repFullName: req.body.repFullName ? req.body.repFullName : corp[0].repFullName,
    emailId: req.body.emailId ? req.body.emailId : corp[0].emailId,
    password: req.body.password ? req.body.password : corp[0].password,
    contactNumber: req.body.contactNumber ? req.body.contactNumber : corp[0].contactNumber,
    accessList: req.body.skuIds ? req.body.skuIds : corp[0].accessList,
    countryId:req.body.country ? req.body.country : corp[0].countryId

    }, { new: true })
        .then(response => {
            if (!response) {
                let errorText = "Corporation not found with id " + req.body.pageId;
            return makeResponse(res, true, 404, false, errorText, errorText);
            }
            return makeResponse(res, true, 200, true, 'Corporation', 'Corporation updated successfully',response);
        })
});
}
const viewCorporations = async (req, res) => {
    let { limit, page } = req.body;
 limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
 page = (!page) ? parseInt(0) : parseInt(page);
 let skip = limit * page;
 await Corporation.aggregate([
 {$facet:{
    "stage1" : [ {"$group": {_id:null, count:{$sum:1}}} ],
    "stage2" : [ { "$skip": skip}, {"$limit": limit} ]
  }},
 {$unwind: "$stage1"},
 {$project:{
    count: "$stage1.count",
    data: "$stage2"
 }}
]).then(data => {
  return makeResponse(res, true, 200, true, 'List Fetched Successfully', 'List Fetched Successfully', data);
}).catch(err => {
  res.status(500).json({
      message: err.message || "Some error occurred while retrieving retailer."
  });
});
}
const viewUsers =  async (req, res) =>{
  Users.find({isDeleted:false,active:true})
  .then(cities => {
    return makeResponse(res, true, 200, true, 'Dashboard', 'Dashboard Added successfully',cities);

  }).catch(err => {
      res.status(500).json({
          message: err.message || "Some error occurred while retrieving cities."
      });
  });
}
const getCityList = async(req, res) =>{
  Cities.find({isDeleted:false,active:true})
  .then(cities => {
    return makeResponse(res, true, 200, true, 'Cities', 'Cities Added successfully',cities);

  }).catch(err => {
      res.status(500).json({
          message: err.message || "Some error occurred while retrieving cities."
      });
  });
}
const viewBranchRetailers = async(req, res) =>{
  Branchretailers.find({cityId:{$in:req.body.citiesIds},retailerId:{$in:req.body.retailerIds},isDeleted:false,active:true})
  .then(branchretailers => {
    return makeResponse(res, true, 200, true, 'Branch retailers', 'Branch retailers Added successfully',branchretailers);

  }).catch(err => {
      res.status(500).json({
          message: err.message || "Some error occurred while retrieving Branch retailers."
      });
  });
}
const viewRetailers = async(req, res) =>{

  Retailers.find({cities:{$in:req.body.cityIds},isDeleted:false,active:true})
  .then(retailers => {
    //console.log(retailers);
    return makeResponse(res, true, 200, true, 'Retailers', 'Retailers Added successfully',retailers);

  }).catch(err => {
      res.status(500).json({
          message: err.message || "Some error occurred while retrieving Retailers."
      });
  });
}
const getSkuList = async(req, res)=>{
  Skus.find({isDeleted:false,active:true})
  .then(skus => {
    return makeResponse(res, true, 200, true, 'Skus', 'Skus Added successfully',skus);

  }).catch(err => {
      res.status(500).json({
          message: err.message || "Some error occurred while retrieving Skus."
      });
  });
}
const getCountryList = async (req, res) =>{
  Countries.find({isDeleted:false,active:true})
  .then(countries => {
    return makeResponse(res, true, 200, true, 'Countries', 'Countries Added successfully',countries);

  }).catch(err => {
      res.status(500).json({
          message: err.message || "Some error occurred while retrieving Countries."
      });
  });
}
const updateFalseSurveyActivity = async(req, res) =>{
  //console.log(req.body);
  await Surveyactivities.find({_id:mongoose.Types.ObjectId(req.body.surveyActivityId)}).then(async(ca) => {
    await Surveyactivities.findByIdAndUpdate(ca[0]._id, {
      available: false,
    }, { new: true })
    .then(resp => {
      // //console.log(resp);

      if (!resp) {
            let errorText = "Survey not found with id " + req.body.surveyId;
        return makeResponse(res, true, 404, false, errorText, errorText);
        }
        return makeResponse(res, true, 200, true, 'Survey Approve Request', 'Survey Approve request done successfully',resp);
    }).catch(err => {
        if (err.kind === 'ObjectId') {
            let errorText = "Survey not found with id " + req.body.surveyId;
        return makeResponse(res, true, 404, false, errorText, errorText);
        }
        let errorText = "Error updating Survey with id " + req.body.surveyId;
        return makeResponse(res, true, 500, false, errorText, errorText);
        
    });
}); 
}
const updateTrueSurveyActivity = async(req, res) =>{
  await Surveyactivities.find({_id:mongoose.Types.ObjectId(req.body.surveyActivityId)}).then(async(ca) => {
    await Surveyactivities.findByIdAndUpdate(ca[0]._id, {
      available: true,
    }, { new: true })
    .then(resp => {
      if (!resp) {
            let errorText = "Survey not found with id " + req.body.surveyId;
        return makeResponse(res, true, 404, false, errorText, errorText);
        }
        return makeResponse(res, true, 200, true, 'Survey Approve Request', 'Survey Approve request done successfully',resp);
    }).catch(err => {
        if (err.kind === 'ObjectId') {
            let errorText = "Survey not found with id " + req.body.surveyId;
        return makeResponse(res, true, 404, false, errorText, errorText);
        }
        let errorText = "Error updating Survey with id " + req.body.surveyId;
        return makeResponse(res, true, 500, false, errorText, errorText);
        
    });
}); 
}

const deletePictures = async (req, res) => {
  if (req.body.id&&req.body.id=='') {
    let errorText = 'picture Id body can not be empty.';
        return makeResponse(res, true, 200, false, errorText, errorText);
  }
  let filenameToRemove;
  if (req.body.image && req.body.image !== "") { // check
    filenameToRemove = req.body.image.split('/').slice(-1)[0];
    const {
      scKeyID,
      scKey,
      region,
      ACL,
      bucket,
    } = config.awsS3;
    const s3Bucket = new aws.S3({
      Bucket: bucket,
      scKeyID,
      scKey,
      region
  });
    var params = {
      Bucket: 'osabuckets/categorypictures',
      Key: filenameToRemove
    };
    s3Bucket.deleteObject(params, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        Categoryactivities.findByIdAndUpdate(req.body.id, 
          { $pull: { "categoryPictures": req.body.image } }, { safe: true, upsert: true },
        function(err, data) {
            if (err) {         
              return makeResponse(res, true, 404, false, err, err);
            }
        return makeResponse(res, true, 200, true, 'Deleted ', 'Deleted done successfully',data);

            // return res.status(200).json(node);
        });
    
        console.log(data);
      }
    });
  }
}
const manageCategoryPictures = async (req, res) =>{
  let pictureOfCatgories = [];
  let surveyIds = [];

  const surveys = await Surveyschedules.find({isDeleted:false,"branchRetailerDetails.active":true,"branchRetailerDetails.isCompleted":true})


await Promise.all(surveys.map(async(item) =>{
    await Promise.all(item.branchRetailerDetails.map(async(brData) =>{
        if(brData.active===true && brData.isCompleted === true){
                    surveyIds.push(brData.surveyId);
        }
    }))
}))
  let { limit, page } = req.body;
  limit = (!limit) ? parseInt(25) : parseInt(limit)
  page = (!page) ? parseInt(0) : parseInt(page);
  let skip = limit * page;
  
  Categoryactivities.aggregate([
         { $match: { surveyId:{$in:surveyIds} } },
         {$sort: {created:-1}},
        {$facet:{
           "stage1" : [ {"$group": {_id:null, count:{$sum:1}}} ],  
           "stage2" : [ { "$skip": skip}, {"$limit": limit} ]
         }},
        {$unwind: "$stage1"},
        {$project:{
           count: "$stage1.count",
           data: "$stage2"
        }}  
    ]).then(async (resp) => {
      await Promise.all(resp[0].data.map( async(items)=>{
        if(items.retailerId!=0){
            const retailer = await Retailers.findOne({_id: mongoose.Types.ObjectId(items.retailerId)})
            const city = await Cities.findOne({_id: {$in: retailer.cities}})
            if(items.categoryPictures.length != 0){
            data = {
                id: items._id,
                name:retailer.retailerName,
                imageUrl:  items.categoryPictures,
                created: moment(items.created).format('DD, MMM YYYY h:mm:ss a'),
                city:city.cityName
            }
            pictureOfCatgories.push(data);
          }
        }
    }))
    const picArr = pictureOfCatgories.sort((a, b) => (a.created) - (b.created))
    return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully',{count:resp[0].count,pictureOfCatgories:picArr});
    })
     


}
const managePictures = async (req, res) =>{
  let pictureOfCatgories = [];
  let surveyIds = [];

  const surveys = await Surveyschedules.find({isDeleted:false,"branchRetailerDetails.active":true,"branchRetailerDetails.isCompleted":true})


await Promise.all(surveys.map(async(item) =>{
    await Promise.all(item.branchRetailerDetails.map(async(brData) =>{
        if(brData.active===true && brData.isCompleted === true){
                    surveyIds.push(brData.surveyId);
        }
    }))
}))
  let { limit, page } = req.body;
  limit = (!limit) ? parseInt(25) : parseInt(limit)
  page = (!page) ? parseInt(0) : parseInt(page);
  let skip = limit * page;
  
  Categoryactivities.aggregate([
         { $match: { surveyId:{$in:surveyIds} } },
         {$sort: {created:-1}},
        {$facet:{
           "stage1" : [ {"$group": {_id:null, count:{$sum:1}}} ],  
           "stage2" : [  ]
         }},
        {$unwind: "$stage1"},
        {$project:{
           count: "$stage1.count",
           data: "$stage2"
        }}  
    ]).then(async (resp) => {
      await Promise.all(resp[0].data.map( async(items)=>{
        if(items.retailerId!=0){
            const retailer = await Retailers.findOne({_id: mongoose.Types.ObjectId(items.retailerId)})
            const city = await Cities.findOne({_id: {$in: retailer.cities}})
            data = {
                id: items._id,
                name:retailer.retailerName,
                imageUrl: items.categoryPictures.length > 0 ? items.categoryPictures : [],
                created: moment(items.created).format('DD, MMM YYYY h:mm:ss a'),
                city:city.cityName
            }
            pictureOfCatgories.push(data);
        }
    }))
    const picArr = pictureOfCatgories.sort((a, b) => (a.created) - (b.created))
    return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully',{count:resp[0].count,pictureOfCatgories:picArr});
    })
     


}
const approveAllSurvey =  async (req, res) =>{
  Surveyschedules.find({isDeleted:false,_id:mongoose.Types.ObjectId(req.body._id)}).then(ss => {
    Surveyschedules.updateOne(
      // _id: mongoose.Types.ObjectId(awnsers.surveyId),
      { "branchRetailerDetails.surveyId": req.body.surveyId },
      { 
        $set: { 
        "branchRetailerDetails.$.active" : true, 
        "branchRetailerDetails.$.isDeleted" : false, 
        "branchRetailerDetails.$.isCompleted" : true 
        } 
      },
      function(err,numAffected) {
          //console.log(numAffected);
                if (!numAffected) {
                    let errorText = "Survey not found with id " + req.body.surveyId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
               return makeResponse(res, true, 200, true, 'Survey Discard Request', 'Redeem request done successfully',numAffected);
            }).catch(err => {
                if (err.kind === 'ObjectId') {
                    let errorText = "Survey not found with id " + req.body.surveyId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
                let errorText = "Error updating Survey with id " + req.body.surveyId;
                return makeResponse(res, true, 500, false, errorText, errorText);
                
            });
    });
}
module.exports = {
    authenticate,
    dashboard,
    manageSchedules,
    addNewSurveySchedule,
    updateSurvey,

    viewApprovedSurvey,
    archivedSurvey,
    pendingSurvey,
    pendingAuditSurvey,    
    approveSurvey,
    discardSurvey,
    connectDetails,
    surveyDetails,
    viewCorporations,
    getCityList,
    viewUsers,
    viewRetailers,
    viewBranchRetailers,
    getSkuList,
    getCountryList,
    createCorporations,
    updateCorporations,
    updateTrueSurveyActivity,
    updateFalseSurveyActivity,
    updatependingSurvey,
    manageCategoryPictures,
    deletePictures,
    managePictures,
    approveAllSurvey
}