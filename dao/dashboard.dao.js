const jwt = require ('jsonwebtoken');
const config = require ('../config/database');
const Users = require ('../models/user');
const {makeResponse} = require('../utils/utils') 
const moment = require('moment');
const Surveyschedules = require('../models/surveyschedules')
const Cities = require('../models/cities');
const Countries = require('../models/countries');
var mongoose = require('mongoose');
const Channels = require('../models/channels')
const Retailers = require('../models/retailers');


//dashboard for cloud sourcing application
const dashboard = async(req, res, next) =>{
  console.log("userId",req.body.userId)
  if (req.body.userId=='') {
    let errorText = 'userId can not be empty.';
        return makeResponse(res, false, 501, false, errorText, errorText);
  }
  const user = await Users.findOne({_id:mongoose.Types.ObjectId(req.body.userId),active:false});
    if(user&&user.userName){
      let err =  'Your account is deactivated please contact administrator.'
      return makeResponse(res, false, 200, false, err,err);
    }
  let query = {};
  var startmonth = moment().format('M');
  var startday = moment().format('D');
  var secondday = moment(startday, "D").add(1, 'days').format('D');
  console.log(startday,startmonth,secondday);
  
  let arrDayFirst = [];
  let arrDaySecond = [];
  query = {};
  query['userId'] = req.body.userId
  query['isDeleted'] = false;
  //query['active'] = true;
  query['day'] = startday
  query['month'] = startmonth
  await Surveyschedules.findOne(query).sort({scheduleDate:-1}).
  then(async(surveySchedulesData) => {
    if(surveySchedulesData){
      await Promise.all(surveySchedulesData.branchRetailerDetails.map(async (items) =>{
        const countries = await Countries.findOne({_id:mongoose.Types.ObjectId(surveySchedulesData.countryId)},'countryName');
        const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(items.cityId)},'cityName');
        const channels = await Channels.findOne({_id:{$in:items.channelId}},'channelName');
         const retailers = await Retailers.findOne({_id:{$in:items.retailerId}},'retailerName');

              data = {
                surveyId: items.surveyId,
                surveyScheduleId:surveySchedulesData._id,
                latitude: items.latitude,
                longitude: items.longitude,
                googleMapLink: items.googleLink,
                city: cities,
                country: countries,
                storeName: items.branchRetailerName,
                scheduleDate:surveySchedulesData.scheduleDate,
                storeId:items.storeId,
                channelType: channels,
                retailerType: retailers,
                isCompleted: items.active
                };
                arrDayFirst.push(data);
              }));
            }
           }).catch(err => {
          let errorText = 'Some error occurred while retrieving Categories.';
          return makeResponse(res, true, 500, false, err, err);
      });
      surveySchedulesSecondDay = await Surveyschedules.findOne({isDeleted:false,userId:req.body.userId,day:secondday,month:startmonth}).sort({scheduleDate:-1}).
      then(async (surveySchedulesSecondDayData) => {
        if(surveySchedulesSecondDayData){
          await Promise.all(surveySchedulesSecondDayData.branchRetailerDetails.map(async (ele) =>{
            const countries = await Countries.findOne({_id:mongoose.Types.ObjectId(surveySchedulesSecondDayData.countryId)},'countryName');
            const cities = await Cities.findOne({_id:mongoose.Types.ObjectId(ele.cityId)},'cityName');
            const channels = await Channels.findOne({_id:{$in:ele.channelId}},'channelName');
             const retailers = await Retailers.findOne({_id:{$in:ele.retailerId}},'retailerName');
            data = {
              surveyId: ele.surveyId,
              surveyScheduleId:surveySchedulesSecondDayData._id,
              latitude: ele.latitude,
              longitude: ele.longitude,
              googleMapLink: ele.googleLink,
              city: cities,
              country: countries,
              scheduleDate:surveySchedulesSecondDayData.scheduleDate,
              storeName: ele.branchRetailerName,
              storeId:ele.storeId,
              channelType: channels,
              retailerType: retailers,
              isCompleted: ele.isCompleted
              };
              arrDaySecond.push(data);
          })); 
        }
                
          })
          result = {
              todaySchedule:arrDayFirst,
              tomorrowSchedule: arrDaySecond,
              videoLink:'https://osabuckets.s3.ap-south-1.amazonaws.com/video/Scorecarts+Agents.mp4'
          }

          return makeResponse(res, true, 200, true, 'Survey', 'Survey fetched successfully',result);

}

module.exports = {
    dashboard,
    
}