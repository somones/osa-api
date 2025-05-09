const Categories =  require('../models/categories');
const jwt = require ('jsonwebtoken');
const db = require ('../config/database');

const { makeResponse } = require('../utils/utils');
const { v4: uuidv4 } = require('uuid');
const Contact = require('../models/contact')
const moment = require('moment');
const Staticpages = require('../models/staticpages');
const Countries = require('../models/countries');
const Corporation =  require('../models/corporation')
const config = require('../config/config');
const userDao = require('./users.dao')
var mongoose = require('mongoose');
const Users = require ('../models/user');
var AWS = require('aws-sdk');
const Cities = require('../models/cities');
const Surveyschedules = require('../models/surveyschedules')
const Retailers = require('../models/retailers');
const Branchretailers = require('../models/branchretailers');
const Skus = require('../models/skus');
const Channels = require('../models/channels')
const CategoryActivity = require('../models/categoryactivity');
const Surveyactivities = require('../models/surveyactivity')
const Regions = require('../models/regions');
const Brands = require('../models/brands');
const Segments =  require('../models/segments');
const Sources = require('../models/source');
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
          tokenobject.type = "Corporation";
          tokenobject.issuedAt = new Date();
          const token = jwt.sign(tokenobject, db.secret, {
            expiresIn: 604800 //Seconds in 1 Week
          });
          let refreshToken = jwt.sign(
            { user: corporation },
            db.secret,
            { expiresIn: 604800 }
          );
  
          var distinctcountries = [];//getlist of distinctcountries
          var query = {};
          var cat =[];
          query["consolidated"] = true;
          query["completed"] = true;
          
          
          
                  res.json({
                    status:200,
                    success: true,
                    token: 'JWT ' + token,
                    refreshToken,
                    distinctCountries: distinctcountries,
                    corporation: {
                      _id: corporation._id,
                      profilePictureUrl: corporation.profilePictureUrl,
                      repFullName: corporation.repFullName,
                      brandName: corporation.brandName,
                      emailId: corporation.emailId,
                      productCategory: corporation.productCategory,
                      productSubcategory: corporation.productSubcategory,
                      accessList: corporation.accessList,
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

const manageSurvey = async (req, res) => {
    let query = {};
    let arr = [];
    var startdate = new Date();
    query["dateOfExpiry"] = {$gte: startdate};
    query['active'] = false;
    surveyGroups = await Surveygroups.find(query).sort({created: 'desc'});
    if(surveyGroups&&surveyGroups[0]){ 
    await Promise.all( surveyGroups.map(async (item, index) => {
        //console.log(item.created);
            let surveys = await Crowdsurveys.find({surveyGroupId:item.surveyGroupId}).sort({created: 'desc'});
            let completedSurvey = await SurveyActivity.countDocuments({surveyGroupId: { $in: [item._id]}});
            const category = await Categories.findOne({categoryId:item.categoryId});
            let country = await Country.find({_id:{$in:item.countryId}});
            let city = await City.find({_id:{$in:item.cityId}});
            const area = await Area.find({areaId:{$in:item.area}});
            const retailer = await RetailerList.find({areaId:{$in:item.retailerId}});

            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(item.clientId)});
            const respData = {
                _id: item._id,
                categoryId: category.categoryName,
                surveyName: item.surveyName,
                surveyGroupId: item.surveyGroupId,
                surveyType: item.surveyType,
                surveyStore: (surveys&&surveys.length) ? surveys.length : 0,
                surveyAmount: item.surveyAmount,
                currencyCode: item.currency,
                client: client.repFullName,
                created: item.created,
                longitude: item.longitude,
                latitude: item.latitude,
                noOfQuestions: item.noOfQuestions,
                gender: item.gender,
                ageGroup: item.ageGroup,
                maritalStatus: item.maritalStatus,
                noOfKids: item.noOfKids,
                nationality: item.nationality,
                country: item.countryId!='n/a' ? country : 'n/a',
                city: item.cityId!='n/a' ? city : 'n/a',
                brandName: '',
                area: item.area.length > 0 ? area : 'n/a',
                retailer:item.retailerId.length > 0 ? retailer : 'n/a',
                dateOfExpiry: moment(item.dateOfExpiry).format('DD, MMM YYYY'),
                isSurveyCompleted: completedSurvey >= item.noOfAuditors ? true : false, 
                noOfAuditors: item.noOfAuditors,
                completedSurvey,
                surveyId: item.surveyId,
                created:moment(item.created).format('DD, MMM YYYY'),
                // questions:questions
            }
            arr.push(respData)
            if(arr.length === surveyGroups.length){
                result = {
                    arr : arr,
                    count: surveyGroups.length
                }
                return makeResponse(res, true, 200, true, 'Manage Survey', 'Manage Survey Fetched successfully',result);
            }  
        }));
    }else{
        return makeResponse(res, true, 200, true, 'Manage Survey', 'No survey is pending');

    }   
}
const addNewSurveySchedule =  async (req, res) => {
    
        // //console.log(req.body);
        storeQuery ={};
        if(req.body.branchRetailerId&&req.body.branchRetailerId.length>0) {
            storeQuery['branchRetailerId'] = {$in:req.body.branchRetailerId}
        }
        let stores = await Branchretailers.find(storeQuery);
        
            let surveyschedules =  new Surveyschedules({
                categoryId: req.body.categoryId,
                clientId:req.body.clientId,
                cityId: req.body.city,
                surveyGroupId: groupId,
                countryId: req.body.country,
                surveyName: req.body.surveyName,
                surveyType: req.body.surveyType,
                surveyNumber:"CS"+moment().format('YYYYMMDD')+req.body.surveyAmount,
                surveyAmount: req.body.surveyAmount,
                currency:currency,
                created: moment().format(),
                noOfQuestions: req.body.noOfQuestions,
                gender: req.body.gender,
                ageGroup: req.body.ageGroup,
                maritalStatus: req.body.maritalStatus,
                noOfKids: req.body.noOfKids,
                nationality: req.body.nationality,
                noOfAuditors: req.body.noOfAuditors,
                dateOfExpiry: req.body.dateOfExpiry,
                image:req.body.surveyImage,
                active: false,
                isDeleted: false
            })
            // Save Survey Activity in the database
            surveyschedules.save()
        .then(async (data) => {
            return makeResponse(res, true, 200, true, 'Survey added', 'Survey added successfully',data);            
            }).catch(err => {
                res.status(500).send({
                    message: err.message || "Some error occurred while creating the schedule."
                });
            })
        
        
        
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

const viewSurvey = async (req, res) => {
    await Surveygroups.find({clientId:req.body.clientId}).sort({created: 'desc'})
    .then( async (response) => {
        let arr = [];    
        await Promise.all(response.map( async(item) =>{
            const category = await Categories.findOne({categoryId:item.categoryId});
            const country = await Country.find({countryId:{$in:item.countryId}});
            const area = await Area.find({areaId:{$in:item.area}});
            let noOfStores = await Crowdsurveys.countDocuments({surveyGroupId: item.surveyGroupId});
            let city = await City.find({_id:{$in:item.cityId}});
            let completeSurveys = await SurveyActivity.countDocuments({surveyGroupId:item['surveyGroupId'], isApproved:true});

            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(item.clientId)});
            const data = {
                _id: item['_id'],
                categoryId: category.categoryName,
                surveyName: item.surveyName,
                surveyType: item.surveyType,
                noOfStores: noOfStores,
                surveyGroupId: item._id,
                surveyAmount: item.surveyAmount,
                currencyCode: item.currency,
                client: client.repFullName,
                created: item.created,
                noOfQuestions: item.noOfQuestions,
                gender: item.gender,
                ageGroup: item.ageGroup,
                maritalStatus: item.maritalStatus,
                noOfAuditors: item.noOfAuditors,
                noOfKids: item.noOfKids,
                nationality: item.nationality,
                country: (item.countryId!='n/a') ? country : 'n/a',
                city: (item.cityId!='n/a') ? city : 'n/a',
                brandName: '',
                area: (item.area!='n/a') ? area : 'n/a',
                dateOfExpiry: moment(item.dateOfExpiry).format('DD, MMM YYYY'),
                created:moment(item.created).format('DD, MMM YYYY'),
                surveyId: item.surveyId,
                countOfCompletedSurvey:completeSurveys,
                active: item.active
            }
            arr.push(data);
        }));
        return makeResponse(res, true, 200, true, 'Survey History', 'Survey History fetched successfully',arr);
        

    }).catch(err => {
        let errorText = 'Some error occurred while retrieving Survey History.';
        return makeResponse(res, true, 500, false, errorText, errorText);
    });
}
const viewApprovedSurvey = async (req, res) => {
    await Surveyschedules.find()
    .then(async (response) => {
        let arr = [];    
        let arrData = [];    
        await Promise.all(response.map( async (ele) =>{
            await Promise.all(ele.branchRetailerDetails.map( async (item) =>{
            const regions = await Regions.findOne({categoryId:item.regionId});
            const channels = await Channels.findOne({countryId:item.channelId});
            const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(item.cityId)});
            const retailers = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.retailerId)});
            const users = await Users.findOne({_id:mongoose.Types.ObjectId(ele.userId)});
            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(ele.clientId)});
            const data = {
                _id: item['_id'],
                branchRetailerName: item.branchRetailerName,
                retailerName: retailers.retailerName,
                client: client.repFullName,
                userName: users.fullName,
                emailId: users.emailId,
                longitude: item.latitude,
                latitude: item.latitude,
                city: cities.cityName,
                scheduleDate:moment(ele.scheduleDate).format('DD, MMM YYYY'),
                surveyId: item._id,
            }
            arr.push(data);
            }));
            arrData.push(ele)
            if(response.length == arrData.length){
                return makeResponse(res, true, 200, true, 'Pending Survey', 'Pending Survey fetched successfully',arr);
            }
        }));
            })
}
const pendingSurvey = async (req, res) => {
    // await Surveyschedules.find({isDeleted:false}).sort({created: 'desc'})
    await Surveyschedules.find({isDeleted:false})
    .then(async (response) => {
        let arr = [];    
        let arrData = [];    
        let status ;
        await Promise.all(response.map( async (ele) =>{
            await Promise.all(ele.branchRetailerDetails.map( async (item) =>{
              if(!item.active && !item.isCompleted){
                status = 'Pending to Audit'
              }else if(item.active && !item.isCompleted){
                status = 'Review'
              }
              if(!item.active || !item.isCompleted){
                const regions = await Regions.findOne({categoryId:item.regionId});
                const channels = await Channels.findOne({countryId:item.channelId});
                const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(item.cityId)});
                const retailers = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.retailerId)});
                const users = await Users.findOne({_id:mongoose.Types.ObjectId(ele.userId)});
                const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(ele.clientId)});
                const data = {
                    _id: ele['_id'],
                    branchRetailerName: item.branchRetailerName,
                    branchRetailerId: item.branchRetailerId,
                    retailerName: retailers.retailerName,
                    client: client.repFullName,
                    userName: users.fullName,
                    emailId: users.emailId,
                    longitude: item.latitude,
                    latitude: item.latitude,
                    city: cities.cityName,
                    scheduleDate:moment(ele.scheduleDate).format('DD, MMM YYYY'),
                    surveyId: item._id,
                    status
                   }
                   arr.push(data);
                  }
            }));
            arrData.push(ele)
            if(response.length == arrData.length){
                return makeResponse(res, true, 200, true, 'Pending Survey', 'Pending Survey fetched successfully',arr);
            }
        }));
            })
}
const approveSurvey =  async (req, res) =>{
 Surveygroups.find({_id:mongoose.Types.ObjectId(req.body.surveyId)}).then(sg => {
    Surveygroups.findByIdAndUpdate(sg[0]._id, {
            active:true
        }, { new: true })
            .then(async (resp) => {
                if (!resp) {     
                    let errorText = "Survey not found with id " + req.body.surveyId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
                userDao.sendNotification(req, res, 'survey', sg[0]);
                await Crowdsurveys.findOneAndUpdate({surveyGroupId:sg[0].surveyGroupId},{active:true},{upsert: true}).then(csresp =>{

                })
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
const discardSurvey = async(req ,res) =>{
    Surveygroups.find({_id:mongoose.Types.ObjectId(req.body.surveyId)}).then(cs => {
        Surveygroups.findByIdAndUpdate(cs[0]._id, {
            active:false,
            isDeleted:true
        }, { new: true })
            .then(async (resp) => {
                if (!resp) {
                    let errorText = "Survey not found with id " + req.body.surveyId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
                await Crowdsurveys.findOneAndUpdate({surveyGroupId:cs[0].surveyGroupId},{active:false,isDeleted:true},{upsert: true}).then(csresp =>{

                })
                return makeResponse(res, true, 200, true, 'Survey Discard Request', 'Redeem request done successfully',resp);
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
  //console.log(req.body._id);
    await Surveyschedules.find({isDeleted:false,_id:mongoose.Types.ObjectId(req.body._id)})
    .then( async (response) => {
      let osaSurvey = [];
      const branchretailers = await Branchretailers.find({_id: mongoose.Types.ObjectId(req.body.branchRetailerId)});
      const retailer = await Retailers.find({_id: mongoose.Types.ObjectId(branchretailers[0].retailerId)})
      const catIds = await Skus.find({channels: {$in :retailer[0].channels}}).distinct('catId');
      let surveyQuestions = [];
      const categories = await Categories.find({_id: {$in:catIds} });
      Promise.all(categories.map(async (item) => {
      const skus = await Skus.find({catId: item._id},'-channels');
          const data = {
              categoryName: item.category,
              categoryQuestions:'How much SKUs available in '+ item.category,
              categorySkus: skus,
              categoryPictures:[]
          }
          osaSurvey.push(data);
          survey = {
              osaSurvey: {
              questionCount: 10,
          surveyId: "34444",
          surveyStartDate: "",
              surveyQuestions : osaSurvey 
          }
          }
          if(categories.length == osaSurvey.length){
              return makeResponse(res, true, 200, true, 'Available Survey', 'Available survey fetched successfully',survey);            
          }
      }))
        return makeResponse(res, true, 200, true, 'Survey Details', 'Survey Details fetched successfully',arr);
    }).catch(err => {
        let errorText = 'Some error occurred while retrieving Survey Details.';
        return makeResponse(res, true, 500, false, errorText, errorText);
    });
}
const archivedSurvey = async(req, res) =>{
    await Surveyschedules.find({isDeleted:false})
    .then(async (response) => {
        let arr = [];    
        let arrData = [];    
        await Promise.all(response.map( async (ele) =>{
            await Promise.all(ele.branchRetailerDetails.map( async (item) =>{
            const regions = await Regions.findOne({categoryId:item.regionId});
            const channels = await Channels.findOne({countryId:item.channelId});
            const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(item.cityId)});
            const retailers = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.retailerId)});
            const users = await Users.findOne({_id:mongoose.Types.ObjectId(ele.userId)});
            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(ele.clientId)});
            const data = {
                _id: item['_id'],
                branchRetailerName: item.branchRetailerName,
                retailerName: retailers.retailerName,
                client: client.repFullName,
                userName: users.fullName,
                emailId: users.emailId,
                longitude: item.latitude,
                latitude: item.latitude,
                city: cities.cityName,
                scheduleDate:moment(ele.scheduleDate).format('DD, MMM YYYY'),
                surveyId: item._id,
            }
            arr.push(data);
            }));
            arrData.push(ele)
            if(response.length == arrData.length){
                return makeResponse(res, true, 200, true, 'Pending Survey', 'Pending Survey fetched successfully',arr);
            }
        }));
            })
}
const dashboard = async (req, res) => {
    let totalSurvey = await Surveyschedules.countDocuments({userId:req.body.userId, surveyType:'Location',isDeleted:false});
    // let corporations = await Corporation.countDocuments({isDeleted:false});
    let users = await Users.countDocuments({isDeleted:false});
    let approvedSurvey = await Surveyschedules.countDocuments({userId:req.body.userId, surveyType:'Location',isDeleted:false});
    
    const result = {
        approvedSurvey: approvedSurvey ? approvedSurvey :  0,
        users,
        corporations,
        totalSurvey: totalSurvey ? totalSurvey : 0
    }

    return makeResponse(res, true, 200, true, 'Dashboard', 'Dashboard Added successfully',result);

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
  await Cities.find({isDeleted:false,active:true})
  .then(cities => {
    return makeResponse(res, true, 200, true, 'Dashboard', 'Dashboard Added successfully',cities);

  }).catch(err => {
      res.status(500).json({
          message: err.message || "Some error occurred while retrieving cities."
      });
  });
}
const viewBranchRetailers = async(req, res) =>{
  await Branchretailers.find({retailerId:{$in:req.body.retailerIds},cityId:{$in:req.body.cityIds},isDeleted:false,active:true})
  .then(branchretailers => {
    return makeResponse(res, true, 200, true, 'Dashboard', 'Dashboard Added successfully',branchretailers);

  }).catch(err => {
      res.status(500).json({
          message: err.message || "Some error occurred while retrieving cities."
      });
  });
}
const viewRetailers = async(req, res) =>{
  console.log(req.body);
  
  await Retailers.find({channels:{$in:req.body.channelIds},isDeleted:false,active:true})
  .then(async(retailers) => {
    //console.log(retailers);
    return makeResponse(res, true, 200, true, 'Dashboard', 'Dashboard Added successfully',retailers);

  }).catch(err => {
      res.status(500).json({
          message: err.message || "Some error occurred while retrieving cities."
      });
  });
}

const viewRegions =  async (req, res) =>{
    await Regions.find()
    .then(async(regions) => {
      return makeResponse(res, true, 200, true, 'Regions', 'Regions Fetcheduccessfully',regions);
  
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving cities."
        });
    });
  }

  const viewCities =  async (req, res) =>{
    await Cities.find({regionId:{$in:req.body.regionIds}})
    .then(cities => {
      return makeResponse(res, true, 200, true, 'Cities', 'Cities Fetched successfully',cities);
  
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving cities."
        });
    });
  }
  const viewChannels =  async (req, res) =>{
    await Channels.find({cities:{$in:req.body.cityIds}})
    .then(channels => {
      return makeResponse(res, true, 200, true, 'channels', 'channels Fetched successfully',channels);
  
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving channels."
        });
    });
  }

  const viewRetailerFilter =  async (req, res) =>{
    if (req.body.cityIds&&req.body.cityIds==0 || req.body.channelIds&&req.body.channelIds==0) {
      let errorText = 'segments body can not be empty.';
          return makeResponse(res, true, 200, false, errorText, errorText);
    }
    await Retailers.find({cities:{$in:req.body.cityIds},channels:{$in:req.body.channelIds}})
    .then(retailers => {
      return makeResponse(res, true, 200, true, 'retailers', 'retailers Fetched successfully',retailers);  
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving retailers."
        });
    });
  }

  const viewBranchRetailerFilter =  async (req, res) =>{
    // console.log(req.body);
    // Branchretailers.find({retailerId:{$in:req.body.retailerId},cityId:{$in:req.body.cityIds}})
    await Branchretailers.find({retailerId:{$in:req.body.retailerIds},cityId:{$in:req.body.cityIds}})
    .then(regions => {
      return makeResponse(res, true, 200, true, 'Regions', 'Regions Fetched successfully',regions);  
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving cities."
        });
    });
  }
  const viewSegmentFilter = async(req, res) =>{

    if (req.body.branchIds&&req.body.branchIds==0) {
      let errorText = 'segments body can not be empty.';
          return makeResponse(res, true, 200, false, errorText, errorText);
    }
    let branchretailers = [];
    let segmentIds = [];
    let channels = [];
    if(req.body.accessList&&req.body.accessList.length>1){
      // channelds = await Skus.find({_id: {$in :req.body.accessList}}).distinct('channels');
      branchretailers = await Branchretailers.find({_id: {$in:req.body.branchIds}}).distinct('retailerId');
      channels = await Retailers.find({_id: {$in:branchretailers}}).distinct('channels')
      segmentIds = await Skus.find({channels: {$in :channels},_id: {$in :req.body.accessList}}).distinct('segmentId');
    }else{
       branchretailers = await Branchretailers.find({_id: {$in:req.body.branchIds}}).distinct('retailerId');
       channels = await Retailers.find({_id: {$in:branchretailers}}).distinct('channels')
       segmentIds = await Skus.find({channels: {$in :channels}}).distinct('segmentId');
    }
    await Segments.find({_id: {$in:segmentIds} })
    .then(segments => {
      return makeResponse(res, true, 200, true, 'Categories', 'segments Fetched successfully',segments);
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving Categories."
        });
    });
  }
  const viewSourceFilter = async(req, res) =>{
    await Sources.find({segments:{$in:req.body.segmentIds}},'-segments')
    .then(sources => {
      // console.log(sources);
      return makeResponse(res, true, 200, true, 'Regions', 'Regions Fetched successfully',sources);  
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving cities."
        });
    });
  }
  const viewCategoryFilter =  async (req, res) =>{
    if (req.body.segmentIds&&req.body.segmentIds==0) {
      let errorText = 'segmentIds body can not be empty.';
          return makeResponse(res, true, 200, false, errorText, errorText);
    }
    const catIds = await Skus.find({segmentId: {$in :req.body.segmentIds},sourceId: {$in :req.body.sourceIds}}).distinct('catId');
    await Categories.find({_id: {$in:catIds} })
    .then(categories => {
      return makeResponse(res, true, 200, true, 'Categories', 'Categories Fetched successfully',categories);
  
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving Categories."
        });
    });
  }

  const viewBrandFilter =  async (req, res) =>{
    if (req.body.categoryIds&&req.body.categoryIds.length==0 || req.body.segmentIds&&req.body.segmentIds.length==0 || req.body.sourceIds&&req.body.sourceIds.length==0) {
      let errorText = 'categoryIds body can not be empty.';
          return makeResponse(res, true, 200, false, errorText, errorText);
    }
    await Brands.find({categories: {$in:req.body.categoryIds},segments:{$in:req.body.segmentIds},sources:{$in:req.body.sourceIds} })
    .then(brands => {
      return makeResponse(res, true, 200, true, 'brands', 'brands Fetched successfully',brands);
  
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving Categories."
        });
    });
  }

  const viewSkuFilter =  async (req, res) =>{
    if (req.body.brandIds&&req.body.brandIds==0) {
      let errorText = 'brandIds body can not be empty.';
          return makeResponse(res, true, 200, false, errorText, errorText);
    }
    await Skus.find({brandId: {$in:req.body.brandIds},segmentId:{$in:req.body.segmentIds},sourceId:{$in:req.body.sourceIds}})
    .then(skus => {
      return makeResponse(res, true, 200, true, 'Skus', 'Skus Fetched successfully',skus);
    }).catch(err => {
        res.status(500).json({
            message: err.message || "Some error occurred while retrieving Categories."
        });
    });
  }


  const support = async (req, res, next)=>{
    async.waterfall([
      function(done){
        let newSupport = new Contact({
          subject: req.body.subject,
          message: req.body.message,
          emailId: req.body.emailId,
          dateTimeSupportRequest: new Date()
        });
        newSupport.save((err) => {
         if(err) {
           //console.log(err);
           res.json({success: false, message: 'Support Request not submitted! An error occured.'});
         }
         else{
           var transporter = nodemailer.createTransport(sesTransport({
               scKeyID: emailcredentials.scKeyID,
               scKey: emailcredentials.scKey,
               rateLimit: 5
           }));
  
           var mailOptions = {
             from: emailcredentials.emailid,
             to: "support@scorecarts.com",
             subject: 'New Support Request Received from ' + req.body.emailId,
             text: req.body.message
           };
  
           transporter.sendMail(mailOptions, (error, info) => {
             if (error) {
               //console.log(error);
             } else {
               //console.log('Email sent: ' + info.response);
               res.json({success: true, message: 'Thank you for the Support Request. We will get in touch with you shortly.'});
             }
           });
         }
        });
      },
    ], function(err) {
      if (err) {
        console.log(err);
        return res.json({success: false, message:'An Error Occured.'});
      }
    });
  };

module.exports = {
    authenticate,
    dashboard,
    manageSurvey,
    addNewSurveySchedule,
    updateSurvey,
    viewSurvey,
    viewApprovedSurvey,
    archivedSurvey,
    pendingSurvey,    
    approveSurvey,
    discardSurvey,
    connectDetails,
    surveyDetails,
    viewCorporations,
    getCityList,
    viewUsers,
    viewRetailers,
    viewBranchRetailers,
    viewRegions,
    viewCities,
    viewChannels,
    viewRetailerFilter,
    viewBranchRetailerFilter,
    viewCategoryFilter,
    viewSkuFilter,
    viewBrandFilter,
    viewSourceFilter,
    viewSegmentFilter,
    support
}