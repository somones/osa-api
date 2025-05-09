const Categories =  require('../models/categories')
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
const Segments = require('../models/segments');
const Regions = require('../models/regions');
const Sources = require('../models/source');
const Brands = require('../models/brands');

const getSurveySchedules = async (req, res) => {
    let query = {};
    var startdate = moment().format('YYYY-MM-DD');
    var seconddate = moment(startdate, "YYYY-MM-DD").add(1, 'days').format('YYYY-MM-DD');
    let arr = [];
    surveySchedules = await Surveyschedules.find({isDeleted:false,userId:req.body.userId, scheduleDate:{$gte:startdate},scheduleDate:{$lte:seconddate}}).
    then(surveySchedulesData => {
      Promise.all(surveySchedulesData.map(async (items) =>{
        const countries = await Countries.findOne({_id:mongoose.Types.ObjectId(items.countryId)},'countryName');
        const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(items.cityId)},'cityName');
        const channels = await Channels.findOne({_id:{$in:items.channelId}},'channelName');
        data = {
            country:countries,
            city:cities,
            scheduleDate:items.scheduleDate,
            channelType:channels,
            branchRetailers:items.branchRetailerDetails
          };
          arr.push(data);
          if(surveySchedulesData.length == arr.length){
            return makeResponse(res, true, 200, true, 'surveySchedules', 'surveySchedules fetched successfully',arr);
          }
    }));
    
        })

}




const getSurvey = async (req, res) =>{
    if (!req.body) {
        let errorText = 'Available Survey can not be empty.';
            return makeResponse(res, true, 400, false, errorText, errorText);
    }
    let osaSurvey = [];
    const surveyId = req.body.surveyId;
    const branchretailers = await Branchretailers.find({_id: mongoose.Types.ObjectId(req.body.branchRetailerId)});
    const retailer = await Retailers.find({_id: mongoose.Types.ObjectId(branchretailers[0].retailerId)})
    const catIds = await Skus.find({channels: {$in :retailer[0].channels}}).distinct('catId');

    await Categories.find({_id: {$in:catIds} }).sort({categoryId: 'asc'}).exec().then(async(categories) => {
        // console.log(categories);
    await Promise.all(categories.map(async (item) => {
        getSkuData(req, item._id, retailer[0].channels, function(err,result){
            console.log(item.categoryId);
            const data = {
                categoryName: item.category,
                categoryId: item._id,
                catId: item.categoryId,
                categoryQuestions:'Please select which SKUs are available in '+ item.category,
                categorySkus: result,
                categoryPictures:[]
            }
            osaSurvey.push(data);
            survey = {
                osaSurvey: {
                questionCount: categories ? categories.length : 0,
                surveyId: surveyId,
                storeId:branchretailers[0]._id,
                regionId:branchretailers[0].regionId,
                retailerId:branchretailers[0].retailerId,
                channelId:branchretailers[0].channelId,
                cityId:branchretailers[0].cityId,
                surveyStartDate: "",
                surveyQuestions : osaSurvey.sort((a, b) => parseFloat(a.catId) - parseFloat(b.catId)) 
            }
            }
                        // console.log(promise);
                        if(categories.length == osaSurvey.length){
                            return makeResponse(res, true, 200, true, 'Available Survey', 'Available survey fetched successfully',survey);            
                        }
        }); 
            

    }))
    
    })

        
    
}
function getSkuData(req,catId,channelIds, callback) { 
    // const skus = await Skus.find({catId: item._id},'-channels');
    Skus.find({catId: catId, channels:{$in:channelIds}},'-channels')
        // .sort({totalCuttingTime: 1, favoriteCount: -1})
        // .//select({_id: 1})
        // .limit(number)
        .exec().then( async(skus) => {
            console.log("skus.length",skus.length);
                let skuArr = [];
            await Promise.all(skus.map((skuItem) =>{
              const surveyactivity =   Surveyactivities.findOne({surveyId:req.body.surveyId,skuId:skuItem._id,userId:req.body.userId})
              const skuData = {
                  _id:skuItem._id,
                skuId: skuItem.skuId,
                brandId: skuItem.brandId,
                catId: skuItem.catId,
                sourceId:skuItem.sourceId ? skuItem.sourceId : "" ,
                segmentId:skuItem.segmentId ? skuItem.segmentId : "",
                brandSerialNo:skuItem.brandSerialNo,
                catSerialNo:skuItem.catSerialNo,
                skuName: skuItem.skuName,
                skuArabicName: skuItem.skuArabicName,
                skuNumber: skuItem.skuNumber,
                skuImage:skuItem.skuImage ? skuItem.skuImage[0] : "https://osabuckets.s3.ap-south-1.amazonaws.com/skus/tide/laundrydetergent/Tide+LS+Green+Touch+of+Downy+7KG+OR+Tide+LS+Green+Original+7KG/Tide+LS+Green+Touch+of+Downy+7KG+8001090914880.jpg",
                barcode: skuItem.barcode,
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
                return callback(null, skuSortedData)
            }
        );
}
const surveySubmission =  async (req, res) =>{

    // //console.log(req.body.answer);
    // return;
    

    if (!req.body) {
        return res.status(400).json({
            message: "Survey request cannot be empty"
        });
    }
    //console.log(req.body.surveyId);
    const awnsers = req.body.answer;
    // const catAwnsers = awnsers.surveyQuestions
    let userId = req.body.userId;
    let surveyId = req.body.surveyId;
    // Create a SurveyActivity
    catsCount = [];
    checkSchedules = await Surveyschedules.find({branchRetailerDetails:{$elemMatch:{isCompleted:true,surveyId:surveyId}}});
     if(checkSchedules&&checkSchedules.length==0){
         Surveyschedules.updateOne(
             // _id: mongoose.Types.ObjectId(awnsers.surveyId),
             { userId:userId, "branchRetailerDetails.surveyId": surveyId },
             { $set: { "branchRetailerDetails.$.active" : true, "branchRetailerDetails.$.surveyDate" : moment().format() } },
             function(err,numAffected) {
                 //console.log(numAffected);
                // something with the result in here
                awnsers.forEach(ele => {
                 catsData = [];
                 catsCount.push(ele);
                 defaultId = uuidv4();
                 const categoryactivity = {
                     surveyId: surveyId,
                     categoryActivityId: defaultId,
                     clientId: awnsers.clientId ? awnsers.clientId : '0',
                     userId: userId ? userId : '0',
                     channelId: req.body.channelId ? req.body.channelId : '0',
                     retailerId: req.body.retailerId ? req.body.retailerId : '0',
                     branchRetailerId: req.body.branchRetailerId ? req.body.branchRetailerId : '0',
                     catId:ele.categoryId ? ele.categoryId : '0',
                     categoryPictures:ele.categoryPictures,
                     isApproved:false,
                     status: 'Pending',
                     created:moment().format()
                 };
                 catsData.push(categoryactivity);
                 
                
                 const qa = ele.categorySkus
                 qa.forEach(item =>{
                     let postData = [];
                     let SkuDefaultId = uuidv4();
                     const questionanwsers = {
                         surveyId: surveyId,
                         surveyActivityId: SkuDefaultId,
                         clientId: awnsers.clientId ? awnsers.clientId : '0',
                         userId: userId ? userId : '0',
                         channelId: req.body.channelId ? req.body.channelId : '0',
                         retailerId: req.body.retailerId ? req.body.retailerId : '0',
                         branchRetailerId: req.body.branchRetailerId ? req.body.branchRetailerId : '608b246c2c0cee39b4f00b33',
                         regionId: req.body.regionId ? req.body.regionId : '0',
                         cityId: req.body.cityId ? req.body.cityId : '0',
                         segmentId: item.segmentId ? item.segmentId : '608fa1e8dbfa8f3afcd3e389',
                         sourceId: item.sourceId ? item.sourceId : '608f9f7297da3e0ba01e6bf6',
                         skuId: item._id ? item._id : '0',
                         brandId: item.brandId ? item.brandId : '0',
                         catId:item.catId ? item.catId : '0',
                         categoryPictures:awnsers.categoryPictures,
                         isApproved:false,
                         available: item.isAvailable ? item.isAvailable : false,
                         created:moment().format()
                         }
                         postData.push(questionanwsers)
                         Surveyactivities.insertMany(postData).then(async data=>{
     
                             // const skus = await Skus.findOne({_id:mongoose.Types.ObjectId(item._id)});
                             // skus.surveyActivities.push(data[0]._id);
                             // const savedSku = skus.save();
                             
                             // const channels = await Channels.findOne({_id:mongoose.Types.ObjectId(req.body.channelId)});
                             // channels.surveyActivities.push(data[0]._id);
                             // const savedChannels = channels.save();
     
                             // const retailer = await Retailers.findOne({_id:mongoose.Types.ObjectId(req.body.retailerId)});
                             // retailer.surveyActivities.push(data[0]._id);
                             // const savedRetailer = retailer.save();
                                 // console.log("branchRetailerId",req.body.branchRetailerId);
                             // const branchRetailer = await Branchretailers.findOne({_id:mongoose.Types.ObjectId(req.body.branchRetailerId)});
                             // branchRetailer.surveyActivities.push(data[0]._id);
                             // const savedBranchRetailer = branchRetailer.save();
     
     
                             // const region = await Regions.findOne({_id:mongoose.Types.ObjectId(req.body.regionId)});
                             // region.surveyActivities.push(data[0]._id);
                             // const savedRegion = region.save();
     
                             // const city = await Cities.findOne({_id:mongoose.Types.ObjectId(req.body.cityId)});
                             // city.surveyActivities.push(data[0]._id);
                             // const savedCity = city.save();
     
                             // const segment = await Segments.find({_id:mongoose.Types.ObjectId(item.segmentId)});
                             // segment.surveyActivities.push(data[0]._id);
                             // const savedSegment = segment.save();
     
                             // const source = await Sources.find({_id:mongoose.Types.ObjectId(item.sourceId)});
                             // source.surveyActivities.push(data[0]._id);
                             // const savedSource = source.save();
     
                             // const brands = await Brands.findOne({_id:mongoose.Types.ObjectId(item.brandId)});
                             // brands.surveyActivities.push(data[0]._id);
                             // const savedBrands = brands.save();
     
                             // console.log(item.catId);
                             // const category = await Categories.findOne({_id:mongoose.Types.ObjectId(item.catId)});
                             // category.surveyActivities.push(data[0]._id);
                             // const savedCategory = category.save();
                         });
                     });
             
                 // Save Survey Activity in the database
                 CategoryActivity.insertMany(catsData);
                     if(awnsers.length == catsCount.length){
                          return makeResponse(res, true, 200, true, 'Survey Submission', 'Survey Submission successfully');            
                     }
                 })
             }
         );
     }else{
        return makeResponse(res, false, 200, false, 'Survey already submitted', 'Survey already submitted');
     }
    

}

const surveyHistory = async(req, res) =>{
    if (!req.body) {
        let errorText = 'Survey History can not be empty.';
            return makeResponse(res, true, 400, false, errorText, errorText);
    }
    surveys = await Surveyschedules.find({isDeleted:false,userId:req.body.userId, "branchRetailerDetails": { $elemMatch: { active: true } } });  
        let surveyArr = [];  
        let surveySchedulesArr = [];
        if(surveys&&surveys.length>0){
            await Promise.all(surveys.map( async (ele) =>{
                surveySchedulesArr.push(ele)
                await Promise.all(ele.branchRetailerDetails.map( async (item) =>{
            const cities = await Cities.findOne({_id:{$in:ele.cityId}},'cityName');
            const retailer = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.retailerId)},'retailerName');
            const channels = await Channels.findOne({_id:{$in:item.channelId}},'channelName');
    
                    let status ;
                    if(item.active && !item.isCompleted){
                        status ='Pending'
                    }else{
                        if(item.isCompleted){
                            status =  'Approved';
                        }else{
                            status =   'Pending'
                        }               
                    }
                    if(item.active || item.isCompleted){
                         const data = {
                                surveyId: item._id,
                                userId: ele.userId,
                                channels,
                                retailer,
                                cities,
                                branchRetailerId: item.branchRetailerId,
                                branchRetailerName:item.branchRetailerName,
                                createdDate: moment(ele.scheduleDate).format('DD, MMM YYYY'),
                                regionId: item.regionId,
                                skuId: item.skuId,
                                available: item.available,
                                status:status
                            }
                        surveyArr.push(data);
                    }
                }));
            }));
            return makeResponse(res, true, 200, true, 'Survey History', 'Survey History fetched successfully',surveyArr);

        }  else{
            return makeResponse(res, false, 200, false, 'Survey History', 'Survey History not Found');
        }     
}
const termsAndCondtions =  async (req, res) =>{
    await Staticpages.find({pageName:'term and conditions'})
    .then(staticpages => {
        return makeResponse(res, true, 200, true, 'termsAndCondtions', 'Terms And Condtions fetched successfully',staticpages);
    }).catch(err => {
        let errorText = 'Some error occurred while retrieving Terms And Condtions.';
        return makeResponse(res, true, 500, false, errorText, errorText);
    });
}

const aboutUs = async (req, res) =>{
    await Staticpages.find({pageName:'about us'})
    .then(staticpages => {
        return makeResponse(res, true, 200, true, 'About Us', 'About Us fetched successfully',staticpages);
    }).catch(err => {
        let errorText = 'Some error occurred while retrieving Categories.';
        return makeResponse(res, true, 500, false, errorText, errorText);
    });
}

const logout = async (req, res) => {
    try {
      req.session.destroy();
      res.clearCookie();
      return makeResponse(res,true,200,true,"Logout","Logout has been successfully","");
    } catch (e) {
      return makeResponse(res,true,401,false,"Logout","Logout is not sucessfull",e);
    }
  };

const connect = async (req, res) =>{
    
    let defaultId = uuidv4();
    const contact = new Contact({
        userId: req.body.userId,
        emailId: req.body.emailId,
        message: req.body.message,
        active: true,
        created: moment().format(),

    });

    // Save Connect in the database
    contact.save()
        .then(data => {
            return makeResponse(res, true, 200, true, 'contact', 'Message Sent successfully',data);
        }).catch(err => {
            let errorText = 'Some error occurred while creating the contact.';
            return makeResponse(res, true, 500, false, errorText, err);
        });   
}
/*-----------------------------------------------*/

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
const addNewQuestion = async(req, res) => {

    let defaultId = uuidv4();
     questions = new Questions({
        _id:defaultId,
         questionId:defaultId,
         clientId: req.body.userId,
         question: req.body.question,
         isMultiple: true,
         chartType:req.body.chartType ? req.body.chartType : 'n/a',
         isGraph: true,
         active: true,
         isDeleted:false,
         created:moment().format(),
         questionType: req.body.questionType,
     })
     questions.save()
     .then(response =>{
         let q_id = response['_id'];
         const options = req.body.questionOptions 
         if(options&&options.length>0){
            options.forEach((element,index) => {
                let defaultQid = uuidv4();
                var myId = mongoose.Types.ObjectId();
                 questionoptions = new QuestionsOption({
                     _id: new mongoose.Types.ObjectId(),
                    questionOptionId:defaultQid,
                    qId:defaultId,
                    options:element.options,
                    imageText: req.body.imageTexts!='' ? req.body.imageTexts[index] : '',
                    isCorrect:"false",
                    active: true,
                    isDeleted:false,
                    created:moment().format(),
                 }) 
                 questionoptions.save()
                 .then(qoResponse=>{
                     //console.log(q_id);
                     //console.log(qoResponse._id)
                    Questions.findOneAndUpdate(
                        { questionId:q_id }, 
                        { $push: { questionsoptions: qoResponse._id } },
                        { new: false, upsert:true }
                      ).then(response =>{
    
                      }).catch(err => {
                        res.status(500).send({
                            message: err.message || "Some error occurred while creating the schedule."
                        });
                    })
                    })
                });
         }
         
            return makeResponse(res, true, 200, true, 'Question added', 'New question added successfully',response);             
     })
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
const viewApprovedUserSurvey = async (req, res) => {
    await SurveyActivity.find({isApproved:true}).sort({created: 'desc'})
    .then(async (response) => {
        let arr = [];    
        await Promise.all(response.map( async (item) =>{
            const cs = await Crowdsurveys.findOne({_id:mongoose.Types.ObjectId(item.surveyId)});
            const sg = await Surveygroups.findOne({surveyGroupId:cs.surveyGroupId});
            const category = await Categories.findOne({categoryId:sg.categoryId});
            const country = await Country.findOne({countryId:cs.countryId});
            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(sg.clientId)});
            const user = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
            const city = await City.findOne({cityId:cs.cityId});
            const area = await Area.findOne({areaId:cs.area});

            const data = {
                _id: item['_id'],
                categoryId: category.categoryName,
                surveyName: item.surveyName,
                surveyType: item.surveyType,
                surveyStore: item.surveyStore,
                surveyAmount: item.surveyAmount,
                currencyCode: item.currency,
                client: client.repFullName,
                userName: user.fullName,
                emailId: user.emailId,
                areaOfResidence: user.areaOfResidence,
                created: item.created,
                longitude: cs.longitude,
                latitude: cs.latitude,
                noOfQuestions: cs.noOfQuestions,
                gender: cs.gender,
                ageGroup: cs.ageGroup,
                maritalStatus: cs.maritalStatus,
                noOfKids: cs.noOfKids,
                nationality: cs.nationality,
                countryOfResidence: (cs.countryId!='n/a') ?  country.countryName : 'n/a',
                brandName: '',
                city: (cs.cityId!='n/a') ? city.cityName : 'n/a',
                area: (cs.area!='n/a') ? area.areaName : 'n/a',
                dateOfExpiry: moment(cs.dateOfExpiry).format('DD, MMM YYYY'),
                created:moment(item.created).format('DD, MMM YYYY'),
                surveyId: cs.surveyId,
                amount:cs.surveyAmount
            }
            arr.push(data);

        }));
            return makeResponse(res, true, 200, true, 'Approved User Survey', 'Approved User Survey fetched successfully',arr);
            }).catch(err => {
            let errorText = 'Some error occurred while retrieving Approved User Survey.';
            return makeResponse(res, true, 500, false, err, err);
        });
}
const getAllAgents = async (req, res) => {
    const startmonth = moment().format('M');
    const startday = moment().format('D');
    Users.find({roles:'Agent',active:true,isDeleted:false}).then(async(users) => {
          let data = [];
          await Promise.all(users.map( async(item) =>{
            let approvedSurvey = [];    
            let totalSurvey = [];    
            let todaySurvey = [];    
            let todayCompletedSurvey = [];    
            await Surveyschedules.find({isDeleted:false,userId:item._id})
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
                
                await Surveyschedules.find({isDeleted:false,userId:item._id,day:startday,month:startmonth}).sort({scheduleDate:-1})
                .then(async (resp) => {
                    if(resp&&resp!=null){
                        // console.log(resp);
                        await Promise.all(resp.map( async (element) =>{
                            await Promise.all(element.branchRetailerDetails.map( async (items) =>{
                            // if(!items.active && !items.isCompleted){
                                // console.log("in");
                                todaySurvey.push(items);
                            // }
                            if(items.active && !items.isCompleted){
                                todayCompletedSurvey.push(items);
                            }
                            }));
                        }));
                    }
                });          
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
                    "todaySurvey": todaySurvey ? todaySurvey.length : 0,
                    "todayCompletedSurvey": todayCompletedSurvey ? todayCompletedSurvey.length : 0,
                    "completedSurvey": approvedSurvey ? approvedSurvey.length :  0,
                    "totalSurvey": totalSurvey ? totalSurvey.length : 0

            } 
            data.push(userData);
          }));
          result = {
              data:data
          }
          return makeResponse(res, true, 200, true, 'Users fetched successfully.', 'Users fetched successfully.',result);
  
       })
  }
const viewApprovedSurvey = async (req, res) => {
    await Surveygroups.find({active:true}).sort({created: 'desc'})
    .then( async (response) => {
        let arr = [];    
        await Promise.all(response.map( async(item) =>{
            const category = await Categories.findOne({categoryId:item.categoryId});
            const country = await Country.find({countryId:{$in:item.countryId}});
            const city = await City.find({cityId:{$in: item.cityId}});
            const area = await City.find({areaId:{$in: item.area}});
            let surveys = await Crowdsurveys.find({surveyGroupId:item.surveyGroupId}).sort({created: 'desc'});

            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(item.clientId)});
            let completeSurveys = await SurveyActivity.countDocuments({surveyGroupId:item['surveyGroupId'], isApproved:true});

            const data = {
                _id: item['_id'],
                categoryId: category.categoryName,
                surveyName: item.surveyName,
                surveyType: item.surveyType,
                surveyStore: item.surveyStore,
                numberOfStore: (surveys&&surveys.length) ? surveys.length : 0,

                surveyAmount: item.surveyAmount,
                currencyCode: item.currency,
                client: client.repFullName,
                created: item.created,
                noOfQuestions: item.noOfQuestions,
                gender: item.gender,
                ageGroup: item.ageGroup,
                maritalStatus: item.maritalStatus,
                noOfKids: item.noOfKids,
                noOfAuditors: item.noOfAuditors,
                nationality: item.nationality,
                countryOfResidence: item.countryId!='n/a' ? country : 'n/a',
                city:item.cityId!='n/a' ? city : 'n/a',
                brandName: '',
                area: item.area!='n/a' ? area : 'n/a',
                dateOfExpiry: moment(item.dateOfExpiry).format('DD, MMM YYYY'),
                created:moment(item.created).format('DD, MMM YYYY'),
                surveyId: item.surveyId,
                active: item.active,
                countOfCompletedSurvey:completeSurveys

            }
            arr.push(data);
        }));
        return makeResponse(res, true, 200, true, 'Approved Survey', 'Approved Survey fetched successfully',arr);
    }).catch(err => {
        let errorText = 'Some error occurred while retrieving Approved Survey.';
        return makeResponse(res, true, 500, false, errorText, errorText);
    });
}
const pendingSurvey = async (req, res) => {
    await SurveyActivity.find({isApproved:false, isDeleted:false}).sort({created: 'desc'})
    .then(async (response) => {
        let arr = [];    
        await Promise.all(response.map( async (item) =>{
            const cs = await Crowdsurveys.findOne({_id:mongoose.Types.ObjectId(item.surveyId)});
            const sg = await Surveygroups.findOne({surveyGroupId:cs.surveyGroupId});
            const category = await Categories.findOne({categoryId:sg.categoryId});
            const country = await Country.findOne({countryId:cs.countryId});
            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(sg.clientId)});
            const user = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
            const city = await City.findOne({cityId:cs.cityId});
            const area = await Area.findOne({areaId:cs.area});
            //console.log(cs.area);
            const data = {
                _id: item['_id'],
                categoryId:  sg.categoryId&&sg.categoryId!='' ? category.categoryName : '',
                surveyName: item.surveyName,
                surveyType: item.surveyType,
                surveyStore: item.surveyStore,
                surveyAmount: item.amount,
                currencyCode: item.currency,
                client: client.repFullName,
                userName: user.fullName,
                emailId: user.emailId,
                areaOfResidence: user.areaOfResidence,
                created: item.created,
                longitude: cs.longitude,
                latitude: cs.latitude,
                noOfQuestions: sg.noOfQuestions,
                gender: sg.gender,
                ageGroup: sg.ageGroup,
                maritalStatus: sg.maritalStatus,
                noOfKids: sg.noOfKids,
                nationality: sg.nationality,
                countryOfResidence: (cs.countryId!='n/a') ?  country.countryName : 'n/a',
                brandName: '',
                city: (cs.cityId!='n/a') ? city.cityName : 'n/a',
                area: (cs.area!='n/a') ? area.areaName : 'n/a',
                dateOfExpiry: moment(cs.dateOfExpiry).format('DD, MMM YYYY'),
                created:moment(item.created).format('DD, MMM YYYY'),
                surveyId: cs.surveyId,
                amount:cs.surveyAmount
            }
            arr.push(data);

        }));
            return makeResponse(res, true, 200, true, 'Pending Survey', 'Pending Survey fetched successfully',arr);
            })
    }
const manageTransactions = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    
    Transactions.aggregate([
           { $match: { 'isDeleted': false } },
           { "$sort": { "created": -1 } },
          {$facet:{
             "stage1" : [ {"$group": {_id:null, count:{$sum:1}}} ],  
             "stage2" : [ { "$skip": skip}, {"$limit": limit} ]
           }},
          {$unwind: "$stage1"},
          {$project:{
             count: "$stage1.count",
             data: "$stage2"
          }}  
      ]).then( async (transactions) => {
  
        let arr = [];    

          //   //console.log();
            await Promise.all(transactions[0].data.map( async(item) =>{
            const user = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
            const wallet = await Wallet.findOne({clientId:item.userId});
                data = {
                    _id: item._id,
                active: item.active,
                isDeleted: item.isDeleted,
                transactionId: item.transactionId,
                user: user,
                wallet: wallet,
                amount: item.amount,
                reciept: item.reciept,
                paymentType: item.paymentType,
                created:moment(item.created).format('DD, MMM YYYY')
                }
                arr.push(data);
            }));
            result = {
                count: transactions[0].count,
                data:arr
            }
             res.status(200).json(result);
       }).catch(err => {
           res.status(500).json({
               message: err.message || "Some error occurred while retrieving areas."
           });
       });
   
}


const manageGraphs = async (req, res) => {}
const questionsLists = async(req, res) =>{
    await Questions
    .find()
    .populate({
        path: 'questionsoptions',
        model: 'QuestionsOptions',
    }).then((result) => {
        //console.log(result);
        return makeResponse(res, true, 200, true, 'Available Survey', 'Available survey fetched successfully',result);
        }).catch(err=>{
            //console.log(err)
        })   
}

const geoDistance = (lat1, lon1, lat2, lon2, unit) => {
	if ((lat1 == lat2) && (lon1 == lon2)) {
		return 0;
	}
	else {
		var radlat1 = Math.PI * lat1/180;
		var radlat2 = Math.PI * lat2/180;
		var theta = lon1-lon2;
		var radtheta = Math.PI * theta/180;
		var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		if (dist > 1) {
			dist = 1;
		}
		dist = Math.acos(dist);
		dist = dist * 180/Math.PI;
		dist = dist * 60 * 1.1515;
		if (unit=="K") { dist = dist * 1.609344 }
		if (unit=="N") { dist = dist * 0.8684 }
        if (unit=="M") { dist = dist * 1609.344}
		return Math.round(dist,0);
	}
}
const getRadius = (req, res) =>{
    lat1 = '24.453884'
    lon1 ='54.3773438'
    lat2 = '25.2048493'
    lon2 = '55.2707828'
    unit = 'K'

    resp =  geoDistance(lat1, lon1, lat2, lon2, unit)
        res.json(resp)
    
}
const getSurveyAwnsers =  async (req, res) => {
    let arr = [];

    let _id = req.body.surveyId
    const surveyData = await SurveyActivity.findById(_id);
    const surveyGroupData = await Surveygroups.find({surveyGroupId:surveyData.surveyGroupId});


    const questionData = await Questions.find({surveyId: { $in: [mongoose.Types.ObjectId(surveyGroupData[0]._id)]}}, '-surveyId')
    //console.log(questionData);
    await Promise.all(questionData.map(async (element) => {
        const awnsersData = await QuestionAwnsers.findOne({qId:element.questionId});
        const data = {
            awnser: awnsersData ? awnsersData.options : '',
            question:element.question,
            questionType:element.questionType,
            questionId:element.questionId
        }
        arr.push(data)
    }));        
    result = {
        questionAnwsers: arr,
        categoryPictures:surveyData.categoryPictures
    }
    res.send(result)
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
const approveUserSurvey =  async (req, res) =>{
    SurveyActivity.find({surveyActivityId:req.body.surveyActivityId}).then(cs => {
        SurveyActivity.findByIdAndUpdate(cs[0]._id, {
               active:true,
               isApproved:true
           }, { new: true })
               .then(async (resp) => {
                   if (!resp) {
                       let errorText = "Survey not found with id " + req.body.surveyId;
                   return makeResponse(res, true, 404, false, errorText, errorText);
                   }
                   userDao.sendNotification(req, res, 'surveyStatus',resp);
                   await Wallet.find({clientId:cs[0].userId}).then(wallet =>{
                    if(wallet.length!=0){
                        let newAmount = +wallet[0].totalAmount + +cs[0].amount;
                        //console.log(newAmount);
                        Wallet.findByIdAndUpdate(wallet[0].walletId, {
                            totalAmount: newAmount,
                        }, { new: true }).then(wallets => {
                            if (!wallets) {
                                let errorText = "User not found with id " + cs[0].surveyActivityId;
                            return makeResponse(res, true, 404, false, errorText, errorText);
                            }
                   return makeResponse(res, true, 200, true, 'Survey Approve Request', 'Redeem request done successfully',resp);
                            
                        }).catch(err => {
                            if (err.kind === 'ObjectId') {
                                let errorText = "Survey not found with id " + cs[0].surveyActivityId;
                            return makeResponse(res, true, 404, false, errorText, errorText);
                            }
                            let errorText = "Error updating Survey with id " + cs[0].surveyActivityId;
                            return makeResponse(res, true, 500, false, errorText, errorText);
                            
                        });        
                    }else{
                        let newAmount = +cs[0].amount;
                        let defaultId = uuidv4();
                        const wallet = new Wallet({
                            _id: defaultId,
                            walletId: defaultId,
                            clientId: cs[0].userId,
                            bankIBANNumber: 'n/a',
                            bankAccountName: 'n/a',
                            bankAccountNumber: 'n/a',
                            bankName:'n/a',
                            bankBranch:null,
                            emiratesIdFront:'n/a',
                            emiratesIdBack: 'n/a',
                            bankSwiftCode:null,
                            active: 'true',
                            totalAmount:newAmount,
                            countOfSurveys:0,
                            status:'Pending',
                            redeemRequest:false,
                            created: moment().format(),
                        });
            
                        // Save Wallet in the database
                        wallet.save();
                   return makeResponse(res, true, 200, true, 'Survey Approve Request', 'Redeem request done successfully',resp);
                        
                            }
                        });
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

const discardUserSurvey = async(req ,res) =>{
    SurveyActivity.find({surveyActivityId:req.body.surveyActivityId}).then(cs => {
        SurveyActivity.findByIdAndUpdate(cs[0]._id, {
            active:false,
            isDeleted:true
        }, { new: true })
            .then(resp => {
                if (!resp) {
                    let errorText = "Survey not found with id " + req.body.surveyId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
                userDao.sendNotification(req, res, 'custom',resp);
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
    
    Contact.aggregate([
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
      ]).then(async (contactData) => {
        let data = [];
        //   //console.log();
          await Promise.all(contactData[0].data.map( async(item) =>{
            const users = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});

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
          }));
          result = {
              count: contactData[0].count,
              data:data
          }
           res.status(200).json(result);
       })
}
const surveyPayment =  async(req, res)=>{

    let defaultId = uuidv4();
        const transactions = new Transactions({
            _id: defaultId,
            transactionId: defaultId,
            userId: req.body.userId,
            clientId: req.body.clientId ? req.body.clientId : '' ,
            walletId: req.body.walletId,
            amount: req.body.amount,
            currency: req.body.currencyCode,
            reciept: req.body.reciept,
            paymentType: req.body.paymentType,
            created:moment().format(),
            active:true,
            isDeleted:false,
         });

    // Save Wallet in the database
    transactions.save()
        .then(async(data) => {
            await Wallet.find({walletId:req.body.walletId}).then(wallet =>{
                let newAamount = +wallet[0].totalAmount - req.body.amount;
                Wallet.findByIdAndUpdate(wallet[0].walletId, {
                    totalAmount: newAamount,
                    redeemRequest:false
                }, { new: true }).then(response =>{
                    userDao.sendNotification(req, res, 'wallet', data);
                });        
            });
            return makeResponse(res, true, 200, true, 'Transactions', 'Transactions Added successfully',data);
        }).catch(err => {
            let errorText = 'Some error occurred while creating the Transactions.';
            return makeResponse(res, true, 500, false, errorText, err);
        });   
    
}
const respondToConnect = async(req, res)=>{}
const viewUserSurveyHistory =  async(req, res) =>{
    await SurveyActivity.find({ userId:req.body.userId})
    .then(async (response) => {
        let arr = [];    
        await Promise.all(response.map( async (item) =>{
            //console.log(item);
            const cs = await Crowdsurveys.findOne({_id:mongoose.Types.ObjectId(item.surveyId)});
            const sg = await Surveygroups.findOne({surveyGroupId:item.surveyGroupId});
            const category = await Categories.findOne({categoryId:sg.categoryId});
            const country = await Country.findOne({countryId:cs.countryId});
            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(sg.clientId)});
            const user = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
            const data = {
                _id: item['_id'],
                categoryId: category.categoryName,
                surveyName: item.surveyName,
                surveyType: item.surveyType,
                surveyStore: item.surveyStore,
                surveyAmount: item.amount,
                currencyCode: item.currency,
                isApproved:item.isApproved,
                client: client.repFullName,
                userName: user.fullName,
                emailId: user.emailId,
                areaOfResidence: user.areaOfResidence,
                created: moment(item.created).format('DD, MMM YYYY'),
                longitude: cs.longitude,
                latitude: cs.latitude,
                noOfQuestions: cs.noOfQuestions,
                gender: cs.gender,
                ageGroup: cs.ageGroup,
                maritalStatus: cs.maritalStatus,
                noOfKids: cs.noOfKids,
                nationality: cs.nationality,
                countryOfResidence: (cs.countryId!='n/a') ? country.countryName : 'n/a',
                brandName: '',
                area: cs.area,
                dateOfExpiry: moment(cs.dateOfExpiry).format('DD, MMM YYYY'),
                created:moment(cs.created).format('DD, MMM YYYY'),
                surveyId: cs.surveyId,
                amount:cs.surveyAmount
            }
            arr.push(data);

        }));
            return makeResponse(res, true, 200, true, 'User Survey History', 'User Survey History fetched successfully',arr);
            }).catch(err => {
            let errorText = 'Some error occurred while retrieving User Survey History.';
            return makeResponse(res, true, 500, false, err, err);
        });
}
const viewUserTransactionHistory =  async(req, res) =>{
    await Transactions.find({ userId:req.body.userId}).sort({created: 'desc'})
    .then(async (response) => {
        let arr = [];    
        await Promise.all(response.map( async (item) =>{
            //console.log(item);
            const wallet = await Wallet.findOne({walletId:item.walletId});
            const user = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
            const data = {
                _id: item['_id'],
                transactionId: item.transactionId,
                amount: item.amount,
                created:moment(item.created).format('DD, MMM YYYY'),
                reciept: item.reciept,
                paymentType: item.paymentType,
                surveyAmount: item.surveyAmount,
                currencyCode: item.currency,
                user:user.fullName,
                wallet: wallet,
            }
            arr.push(data);

        }));
            return makeResponse(res, true, 200, true, 'Transaction History', 'Transaction History fetched successfully',arr);
            }).catch(err => {
            let errorText = 'Some error occurred while retrieving Transaction History.';
            return makeResponse(res, true, 500, false, err, err);
        });
}
const manageWallet = async (req, res) =>{
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    
    Wallet.aggregate([
        //    { $match: { 'isDeleted': 'false' } },
        { "$sort": { "created": -1 } },
          {$facet:{
             "stage1" : [ {"$group": {_id:null, count:{$sum:1}}} ],  
             "stage2" : [ { "$skip": skip}, {"$limit": limit} ]
           }},
          {$unwind: "$stage1"},
          {$project:{
             count: "$stage1.count",
             data: "$stage2"
          }}  
      ]).then(users => {
           res.status(200).json(users);
       }).catch(err => {
           res.status(500).json({
               message: err.message || "Some error occurred while retrieving areas."
           });
       });   
} 
const manageRedeemRequests =  async (req, res) => {
    await Wallet.find({redeemRequest:true}).sort({created: 'desc'})
    .then( async (response) => {
        let arr = [];    
        await Promise.all(response.map( async(item) =>{
            const users = await Users.findOne({_id:mongoose.Types.ObjectId(item.clientId)});
            let paymentOption = '';
            if(item.bankAccountNumber!='n/a' && item.emirateIdNumber=='n/a'){
                paymentOption = 'Bank';
            }else if(item.bankAccountNumber=='n/a' && item.emirateIdNumber!='n/a'){
                paymentOption = 'EmiratesId';
            }else if(item.bankAccountNumber!='n/a' && item.emirateIdNumber!='n/a'){
                paymentOption = 'Bank/EmiratesId';
            }
            let currencyCode;
            if(users.countryOfResidence=='United Arab Emirates' || users.countryOfResidence=='UAE'){
            currencyCode = 'AED';
            }else if(users.countryOfResidence=='Saudi Arabia' || users.countryOfResidence=='SAU'){
            currencyCode = 'SAR';
            }
            const data = {
                    fullName: users.fullName,
                    totalAmount: item.totalAmount,
                    currencyCode,
                    created:moment(item.created).format('DD, MMM YYYY'),
                    amountRequested: item.amountRequested,
                    paymentOption:paymentOption,
                    Paid:'Unpaid',   
                    userId:users._id,
                    walletId: item._id       
            }
            arr.push(data);
        }));
        return makeResponse(res, true, 200, true, 'Redeem Requests', 'Redeem Requests fetched successfully',arr);
    })
}
const surveyDetails =  async (req, res) =>{
    await SurveyActivity.find({_id:req.body.surveyId})
    .then( async (response) => {
        let arr = [];    
        await Promise.all(response.map( async (item) =>{
            //console.log(item);
            const cs = await Crowdsurveys.findOne({_id:mongoose.Types.ObjectId(item.surveyId)});
            const category = await Categories.findOne({categoryId:cs.categoryId});
            const country = await Country.findOne({countryId:cs.countryId});
            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(cs.clientId)});
            const user = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
            const data = {
                _id: item['_id'],
                categoryId: category.categoryName,
                surveyName: item.surveyName,
                surveyType: item.surveyType,
                surveyStore: item.surveyStore,
                surveyAmount: item.surveyAmount,
                currencyCode: item.currency,
                isApproved:item.isApproved,
                client: client.repFullName,
                userName: user.fullName,
                emailId: user.emailId,
                areaOfResidence: user.areaOfResidence,
                created: moment(item.created).format('DD, MMM YYYY'),
                longitude: cs.longitude,
                latitude: cs.latitude,
                noOfQuestions: cs.noOfQuestions,
                gender: cs.gender,
                ageGroup: cs.ageGroup,
                maritalStatus: cs.maritalStatus,
                noOfKids: cs.noOfKids,
                nationality: cs.nationality,
                countryOfResidence: (cs.countryId!='n/a') ? country.countryName : 'n/a',
                brandName: '',
                area: cs.area,
                dateOfExpiry: moment(cs.dateOfExpiry).format('DD, MMM YYYY'),
                surveyId: cs.surveyId,
                amount:cs.surveyAmount
            }
            arr.push(data);

        }));
        return makeResponse(res, true, 200, true, 'Survey Details', 'Survey Details fetched successfully',arr);
    }).catch(err => {
        let errorText = 'Some error occurred while retrieving Survey Details.';
        return makeResponse(res, true, 500, false, errorText, errorText);
    });
}
const archivedSurvey = async(req, res) =>{
    await Surveygroups.find({isDeleted:true})
    .then( async (response) => {
        let arr = [];    
        await Promise.all(response.map( async(item) =>{
            const category = await Categories.findOne({categoryId:item.categoryId});
            const country = await Country.find({countryId:{$in:item.countryId}});
            const city = await City.find({cityId:{$in:item.cityId}});
            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(item.clientId)});
            let completeQuestionnaire= await SurveyActivity.countDocuments({surveyGroupId:item['surveyGroupId'], isApproved:true});

            const data = {
                _id: item['_id'],
                categoryId: category.categoryName,
                surveyName: item.surveyName,
                surveyType: item.surveyType,
                surveyStore: item.surveyStore,
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
                countryOfResidence: item.countryId!='n/a' ? country : 'n/a',
                city:item.cityId!='n/a' ? city : 'n/a',
                brandName: '',
                area: item.area,
                dateOfExpiry: moment(item.dateOfExpiry).format('DD, MMM YYYY'),
                created:moment(item.created).format('DD, MMM YYYY'),
                surveyId: item.surveyId,
                active: item.active,
                countOfCompletedSurvey:completeQuestionnaire

            }
            arr.push(data);
        }));
        return makeResponse(res, true, 200, true, 'Deleted Survey', 'Deleted Survey fetched successfully',arr);
    }).catch(err => {
        let errorText = 'Some error occurred while retrieving Deleted Survey.';
        return makeResponse(res, true, 500, false, errorText, errorText);
    });
}
const archivedUserSurvey = async(req, res) =>{
    await SurveyActivity.find({isDeleted:true})
    .then(async (response) => {
        let arr = [];    
        await Promise.all(response.map( async (item) =>{
            //console.log(item);
            const sg = await Surveygroups.findOne({surveyGroupId:item.surveyGroupId});

            const cs = await Crowdsurveys.findOne({_id:mongoose.Types.ObjectId(item.surveyId)});
            //console.log(sg);
            const category = await Categories.findOne({categoryId:sg.categoryId});
            const country = await Country.findOne({countryId:cs.countryId});
            const client = await Corporation.findOne({_id:mongoose.Types.ObjectId(sg.clientId)});
            const user = await Users.findOne({_id:mongoose.Types.ObjectId(item.userId)});
            const data = {
                _id: item['_id'],
                categoryId: category.categoryName,
                surveyName: item.surveyName,
                surveyType: item.surveyType,
                surveyStore: item.surveyStore,
                surveyAmount: item.surveyAmount,
                currencyCode: item.currency,
                client: client.repFullName,
                userName: user.fullName,
                emailId: user.emailId,
                areaOfResidence: user.areaOfResidence,
                created: item.created,
                longitude: cs.longitude,
                latitude: cs.latitude,
                noOfQuestions: cs.noOfQuestions,
                gender: cs.gender,
                ageGroup: cs.ageGroup,
                maritalStatus: cs.maritalStatus,
                noOfKids: cs.noOfKids,
                nationality: cs.nationality,
                countryOfResidence: (cs.countryId!='n/a') ? country.countryName : 'n/a',
                brandName: '',
                area: cs.area,
                dateOfExpiry: moment(cs.dateOfExpiry).format('DD, MMM YYYY'),
                created:moment(item.created).format('DD, MMM YYYY'),
                surveyId: cs.surveyId,
                amount:cs.surveyAmount
            }
            arr.push(data);

        }));
            return makeResponse(res, true, 200, true, 'Deleted User Survey', 'Deleted User Survey fetched successfully',arr);
            })
}
const createsegments = async(req, res) =>{
    let defaultId = uuidv4();
    const segment = new Segments({
        segmentName: req.body.segmentName,
        active: true,
        isDeleted:false,
        created: moment().format(),

    });

    // Save Connect in the database
    segment.save()
        .then(data => {
            return makeResponse(res, true, 200, true, 'contact', 'Message Sent successfully',data);
        }).catch(err => {
            let errorText = 'Some error occurred while creating the contact.';
            return makeResponse(res, true, 500, false, errorText, err);
        }); 
}
const getSurveyStoreList = async (req, res) =>{
    await Crowdsurveys.find({surveyGroupId:req.body.surveyGroupId})
    .then(async (response) => {
        let storelist = [];    
        await Promise.all(response.map( async (item) =>{
   
            const data = {
                cityId: item.cityId,
                countryId: item.countryId,
                retailerId: item.retailerId,
                retailerCode: item.retailerCode,
                storeId: item.storeId,
                surveyStore: item.surveyStore,
                longitude: item.longitude,
                latitude: item.latitude,
                area: item.areaId,
                active: item.active,
                isDeleted: item.active
            }
            storelist.push(data);

        }));
            return makeResponse(res, true, 200, true, 'Survey Store List', 'Survey Store List fetched successfully',storelist);
            }).catch(err => {
            let errorText = 'Some error occurred while retrieving Survey Store List.';
            return makeResponse(res, true, 500, false, err, err);
        });
}
module.exports = {
    getSurveySchedules,
    getSurvey,
    surveySubmission,
    surveyHistory,
    termsAndCondtions,
    aboutUs,
    connect,
    logout,

    // Admin -- Scorecarts
    manageSurvey,
    addNewSurveySchedule,
    updateSurvey,
    addNewQuestion,
    viewSurvey,
    viewApprovedSurvey,
    viewApprovedUserSurvey,
    archivedSurvey,
    archivedUserSurvey,
    pendingSurvey,
    manageWallet,
    manageTransactions,
    manageGraphs,
    questionsLists,
    geoDistance,
    getRadius,
    
    getSurveyAwnsers,
    approveSurvey,
    approveUserSurvey,
    discardSurvey,
    discardUserSurvey,
    connectDetails,
    surveyPayment,
    respondToConnect,
    viewUserSurveyHistory,
    viewUserTransactionHistory,
    surveyDetails,
    manageRedeemRequests,
    getSurveyStoreList,
    createsegments,
    getSkuData,
    getAllAgents
}