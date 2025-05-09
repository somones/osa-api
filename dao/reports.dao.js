const jwt = require('jsonwebtoken');
const db = require('../config/database');
const config = require('../config/config');
const { makeResponse } = require('../utils/utils')
var mongoose = require('mongoose');
const Categories = require('../models/categories');
const Surveyactivities = require('../models/surveyactivity');
const Categoryactivities = require('../models/categoryactivity');
const Brands = require('../models/brands');
const Regions = require('../models/regions');
const Retailers = require('../models/retailers');
const Cities = require('../models/cities');
const Channels = require('../models/channels')
const Skus = require('../models/skus')
const Corporation = require('../models/corporation')
const Surveyschedules = require('../models/surveyschedules');
const Segments = require('../models/segments');
const Sources = require('../models/source');
const Branchretailers = require('../models/branchretailers');
const moment = require('moment');
const Users = require('../models/user');
// const Corporation = require('../models/corporation');


const viewCategoryReport = async (req, res) => {
    let approvedSurvey = [];
    let categoryReport = [];

    const categoryQuery = {}
    let surveyIds = [];
    let catIds = [];
    let todayDate = new Date();
    let startdate = moment(todayDate, "DD-MM-YYYY").subtract(1, 'days').format('YYYY-MM-DD');
    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
    const corporation = await Corporation.findOne({ emailId: req.body.emailId, _id: mongoose.Types.ObjectId(req.body.id) })

    await getAccessList(req, res, async function (retailerAccessIds) {
        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                    if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                        
                            if (corporation.accessList && corporation.accessList.length > 1) {
                                catIds = await Skus.find({ _id: { $in: corporation.accessList } }).distinct('catId');
                            } else {
                                catIds = await Skus.find().distinct('catId');
                            }
                            surveyIds.push(brData.surveyId);
                            approvedSurvey.push(brData.surveyId)
                        }
                }
            }))
        }))
    })
    var countObj = {};
    var countPromises = [
        Surveyactivities.count({ surveyId: { $in: surveyIds } }).exec().then(count => countObj.countAll = count),
        Surveyactivities.count({ surveyId: { $in: surveyIds }, available: true }).exec().then(count => countObj.countTrueAll = count)
    ];
    const counts = await Promise.all(countPromises).then(() => countObj)
    const totalScore = parseFloat((counts.countTrueAll * 100) / counts.countAll).toFixed(2);
    const countData = {
        approvedSurvey: approvedSurvey ? approvedSurvey.length : 0,
        totalScore: totalScore ? totalScore : 0
    };
    categoryQuery['_id'] = { $in: catIds }
    await Categories.aggregate([

        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { categoryId: { $toString: "$_id" }, available: true },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$catId", "$$categoryId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                        { $eq: ["$available", "$$available"] }
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }
                    // { $project: {  _id: 1 } }
                ],
                as: "saTrueCount"
            }
        },
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { categoryId: { $toString: "$_id" } },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$catId", "$$categoryId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }
                    // { $project: {  _id: 1 } }
                ],
                as: "saTotalCount"
            }
        },
        {
            $project: {
                _id: 1,
                category: 1,
                saTrueCount: { $size: "$saTrueCount" },
                saTotalCount: { $size: "$saTotalCount" },
            }
        }
    ]).then(async (result) => {

        await result.map(async (item) => {
            const countTrue = item.saTrueCount;
            const countTotal = item.saTotalCount;
            // console.log(countTrue,countTotal);
            const data = {
                name: item.category,
                value: (countTrue * 100) / countTotal
            }
            categoryReport.push(data)
            if (categoryReport.length == result.length) {
                return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully', { countData, categoryReport });
            }
        })
    })
}
// const viewRegionReport = async (req, res) => {
//     let regionReport = [];
//     const regionQuery = {}
//     const grandQuery = {};
//     let surveyIds = [];
//     let regionIds = [];
//     const surveys = await Surveyschedules.find({isDeleted:false,"branchRetailerDetails.active":true,"branchRetailerDetails.isCompleted":true})
//     await getAccessList(req, res, async function(retailerAccessIds){


//     await Promise.all(surveys.map(async(item) =>{
//         await Promise.all(item.branchRetailerDetails.map(async(brData) =>{
//             if(brData.active===true && brData.isCompleted === true){
//                 const branchretailers = await Branchretailers.find({_id: mongoose.Types.ObjectId(brData.storeId)});
//                 if(retailerAccessIds.includes(branchretailers[0].retailerId)){
//                         surveyIds.push(brData.surveyId);
//                         regionIds.push(branchretailers[0].regionId);
//                     }


//             }
//         }))
//     }))
// })
//     grandQuery['surveyId'] = {$in:surveyIds}

//     // let uniqueIds = regionIds.filter((item, i, ar) => ar.indexOf(item) === i);

//     // Region Report
//     regionQuery['_id'] = {$in:regionIds}
//     await Regions.aggregate([
//         {
//             $lookup:{
//                 from: "surveyactivities",       // other table name
//                 let: { regId: {$toString: "$_id"}, available: true },
//                 pipeline: [
//                     { $match:
//                         { $expr:
//                            { $and:
//                               [
//                                 { $eq: [ "$regionId",  "$$regId" ] },
//                                 { $eq: [ "$available", "$$available" ] }
//                               ]
//                            }
//                         }
//                      },
//                      { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
//                      { $project: { "_id": 0, "totalCount": 1 } }

//                     // { $project: {  _id: 1 } }
//                 ],
//                 as: "saTrueCount"
//          }         
//         },
//         {
//             $lookup:{
//                 from: "surveyactivities",       // other table name
//                 let: { regId: {$toString: "$_id"}, available: false },
//                 pipeline: [
//                     { $match:
//                         { $expr:
//                            { $and:
//                               [
//                                 { $eq: [ "$regionId",  "$$regId" ] },
//                                 { $eq: [ "$available", "$$available" ] }
//                               ]
//                            }
//                         }
//                      },
//                      { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
//                      { $project: { "_id": 0, "totalCount": 1 } }
//                     // { $project: {  _id: 1 } }
//                 ],
//                 as: "saFalseCount"
//          }         
//         },
//         {
//             $lookup:{
//                 from: "surveyactivities",       // other table name
//                 let: { regId: {$toString: "$_id"} },
//                 pipeline: [
//                     { $match:
//                         { $expr:{ $eq: [ "$regionId",  "$$regId" ] },}
//                      },
//                     // { $project: {  _id: 1 } }
//                 ],
//                 as: "saTotalCount"
//          }         
//         },
//         {   
//             $project:{
//                 _id : 1,
//                 regionName : 1,
//                 saTrueCount : {$size:"$saTrueCount"},
//                 saFalseCount : {$size:"$saFalseCount"},
//                 saTotalCount : {$size:"$saTotalCount"},
//             } 
//         }
//     ]).then(async(result) =>{
//         await Promise.all(result.map( async(items)=>{
//             const data = {
//                 name:items.regionName,
//                 series: [
//                     {
//                       "name": "Yes",
//                       "value": (items.saTrueCount*100)/items.saTotalCount
//                     },
//                     {
//                       "name": "No",
//                       "value": (items.saFalseCount*100)/items.GrandCount
//                     }
//                 ]
//             }
//             regionReport.push(data);
//         }))
//         if(regionReport.length == result.length){
//             return makeResponse(res, true, 200, true, 'Region Reports', 'Region Reports fetched successfully',regionReport);
//         }
//     })

// }

const viewRegionReport = async (req, res) => {
    let regionReport = [];
    const regionQuery = {}
    const grandQuery = {};
    let surveyIds = [];
    let regionIds = [];
    
    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
    await getAccessList(req, res, async function (retailerAccessIds) {


        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                    if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                        
                            surveyIds.push(brData.surveyId);
                            regionIds.push(branchretailers[0].regionId);
                        
                }
            
                }
            }))
        }))
    })

    grandQuery['surveyId'] = { $in: surveyIds }

    // let uniqueIds = regionIds.filter((item, i, ar) => ar.indexOf(item) === i);

    // Region Report
    regionQuery['_id'] = { $in: regionIds };
    const regionData = await Regions.find(regionQuery, 'regionName');
    let regionYesQuery = {};
    let regionNoQuery = {};
    await Promise.all(regionData.map(async (items) => {
        regionYesQuery['regionId'] = items._id
        regionYesQuery['surveyId'] = { $in: surveyIds }
        regionYesQuery['available'] = true
        regionNoQuery['available'] = false
        regionNoQuery['regionId'] = items._id
        grandQuery['regionId'] = items._id
        regionNoQuery['surveyId'] = { $in: surveyIds }
        var countObj = {};
        var countPromises = [
            Surveyactivities.count(regionYesQuery).exec().then(count => countObj.regionYesCount = count),
            Surveyactivities.count(grandQuery).exec().then(count => countObj.GrandCount = count),
            Surveyactivities.count(regionNoQuery).exec().then(count => countObj.regionNoCount = count),
        ];
        const counts = await Promise.all(countPromises).then(() => countObj)
        // const regionYesCount =  await Surveyactivities.count(regionYesQuery);
        // const regionNoCount =  await Surveyactivities.count(regionNoQuery);
        data = {
            name: items.regionName,
            series: [
                {
                    "name": "Yes",
                    "value": (counts.regionYesCount * 100) / counts.GrandCount
                },
                {
                    "name": "No",
                    "value": (counts.regionNoCount * 100) / counts.GrandCount

                }
            ]
        }
        regionReport.push(data);
    }))
    return makeResponse(res, true, 200, true, 'Region Reports', 'Region Reports fetched successfully', regionReport);
}
const viewSegmentReport = async (req, res) => {
    let segmentReport = [];
    let segmentQuery = {}
    let surveyIds = [];
    let segmentIds = [];
    let todayDate = new Date();
    let startdate = moment(todayDate, "DD-MM-YYYY").subtract(1, 'days').format('YYYY-MM-DD');
    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
    const corporation = await Corporation.findOne({ emailId: req.body.emailId, _id: mongoose.Types.ObjectId(req.body.id) })

    await getAccessList(req, res, async function (retailerAccessIds) {
        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                    if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                        const retailer = await Retailers.find({ _id: mongoose.Types.ObjectId(branchretailers[0].retailerId) })
                        
                            if (corporation.accessList && corporation.accessList.length > 1) {
                                // console.log(corporation.accessList);
                                segmentIds = await Skus.find({ _id: { $in: corporation.accessList } }).distinct('segmentId');
                            } else {
                                // console.log(retailer[0].channels);
                                segmentIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('segmentId');
                            }
                            surveyIds.push(brData.surveyId);
                    }
                }
            }))
        }))
    })
    segmentQuery['_id'] = { $in: segmentIds }
    await Segments.aggregate([
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { segId: { $toString: "$_id" }, available: true },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$segmentId", "$$segId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                        { $eq: ["$available", "$$available"] }
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }

                    // { $project: {  _id: 1 } }
                ],
                as: "saTrueCount"
            }
        },
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { segId: { $toString: "$_id" } },
                pipeline: [
                    {
                        $match:
                        {
                            $expr: {
                                $and:
                                    [
                                        { $eq: ["$segmentId", "$$segId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                    ]
                            },
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }

                    // { $project: {  _id: 1 } }
                ],
                as: "saTotalCount"
            }
        },
        {
            $project: {
                // _id : 1,
                segmentName: 1,
                saTrueCount: { $size: "$saTrueCount" },
                saTotalCount: { $size: "$saTotalCount" },
            }
        }
    ]).then(async (result) => {
        await result.map(async (item) => {
            const countTrue = item.saTrueCount;
            const countTotal = item.saTotalCount;
            const data = {
                name: item.segmentName,
                value: (countTrue * 100) / countTotal
            }
            segmentReport.push(data)
            if (segmentReport.length == result.length) {
                return makeResponse(res, true, 200, true, 'Segment Reports', 'Segment Reports fetched successfully', segmentReport);
            }
        })
    }).catch(err => {
        console.log(err)
    })
}
const viewSourceReport = async (req, res) => {

    let sourceReport = [];
    const sourceQuery = {}
    const grandQuery = {};
    let surveyIds = [];
    let sourceIds = [];
    let todayDate = new Date();
    let startdate = moment(todayDate, "DD-MM-YYYY").subtract(1, 'days').format('YYYY-MM-DD');
    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
    const corporation = await Corporation.findOne({ emailId: req.body.emailId, _id: mongoose.Types.ObjectId(req.body.id) })
    await getAccessList(req, res, async function (retailerAccessIds) {

        // ////console.log("retailerAccessIds",retailerAccessIds);

        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                        if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                            const retailer = await Retailers.find({ _id: mongoose.Types.ObjectId(branchretailers[0].retailerId) })
                            if (corporation.accessList && corporation.accessList.length > 1) {
                                sourceIds = await Skus.find({ _id: { $in: corporation.accessList } }).distinct('sourceId');
                                // ////console.log(segmentIds);
                            } else {
                                sourceIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('sourceId');
                            }
                            surveyIds.push(brData.surveyId);
                        }
                    
                }
            }))
        }))
    })
    // ////console.log(skuIds);
    grandQuery['surveyId'] = { $in: surveyIds }

    // let uniqueIds = sourceIds.filter((item, i, ar) => ar.indexOf(item) === i);

    // Source Report
    sourceQuery['_id'] = { $in: sourceIds }
    const sourceData = await Sources.find(sourceQuery, 'sourceName');
    let sourceNoQuery = {};
    let sourceYesQuery = {};

    await Promise.all(sourceData.map(async (items) => {
        sourceYesQuery['sourceId'] = items._id
        sourceNoQuery['sourceId'] = items._id
        sourceYesQuery['surveyId'] = { $in: surveyIds }
        sourceNoQuery['surveyId'] = { $in: surveyIds }
        sourceYesQuery['available'] = true
        sourceNoQuery['available'] = false
        grandQuery['sourceId'] = items._id

        var countObj = {};

        var countPromises = [
            Surveyactivities.count(grandQuery).exec().then(count => countObj.GrandCount = count),
            Surveyactivities.count(sourceYesQuery).exec().then(count => countObj.sourceYesCount = count),
            Surveyactivities.count(sourceNoQuery).exec().then(count => countObj.sourceNoCount = count),
        ];
        const counts = await Promise.all(countPromises).then(() => countObj)
        data = {
            name: items.sourceName,
            series: [
                {
                    "name": "Yes",
                    "value": (counts.sourceYesCount * 100) / counts.GrandCount
                },
                {
                    "name": "No",
                    "value": (counts.sourceNoCount * 100) / counts.GrandCount

                }
            ]
        }
        sourceReport.push(data);
    }))


    return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully', sourceReport);

}
// const viewSourceReport = async (req, res) => {

//     let sourceReport = [];
//     const sourceQuery = {}
//     const grandQuery = {};
//     let surveyIds = [];
//     let sourceIds =[];

//     const surveys = await Surveyschedules.find({isDeleted:false,"branchRetailerDetails.active":true,"branchRetailerDetails.isCompleted":true})
//      const corporation = await Corporation.findOne({emailId:req.body.emailId,_id:mongoose.Types.ObjectId(req.body.id)})
//     await getAccessList(req, res, async function(retailerAccessIds){

// // ////console.log("retailerAccessIds",retailerAccessIds);

//     await Promise.all(surveys.map(async(item) =>{
//         await Promise.all(item.branchRetailerDetails.map(async(brData) =>{
//             if(brData.active===true && brData.isCompleted === true){
//                 const branchretailers = await Branchretailers.find({_id: mongoose.Types.ObjectId(brData.storeId)});
//                 // ////console.log(retailerAccessIds);
//                 if(retailerAccessIds.includes(branchretailers[0].retailerId)){
//                     const retailer = await Retailers.find({_id: mongoose.Types.ObjectId(branchretailers[0].retailerId)})
//                         if(corporation.accessList&&corporation.accessList.length>1){
//                         sourceIds = await Skus.find({_id:{$in:corporation.accessList}}).distinct('sourceId');
//                         // ////console.log(segmentIds);
//                         }else{
//                         sourceIds = await Skus.find({channels: {$in :retailer[0].channels}}).distinct('sourceId');
//                         }
//                         surveyIds.push(brData.surveyId);
//                     }
//                 }
//             }))
//         }))
//     })
//     // ////console.log(skuIds);
//     grandQuery['surveyId'] = {$in:surveyIds}

//     // let uniqueIds = sourceIds.filter((item, i, ar) => ar.indexOf(item) === i);


//     sourceQuery['_id'] = {$in:sourceIds}
//     await Sources.aggregate([
//         {
//             $lookup:{
//                 from: "surveyactivities",       // other table name
//                 let: { sourcesId: {$toString: "$_id"}, available: true },
//                 pipeline: [
//                     { $match:
//                         { $expr:
//                            { $and:
//                               [
//                                 { $eq: [ "$sourceId",  "$$sourcesId" ] },
//                                 { $eq: [ "$available", "$$available" ] }
//                               ]
//                            }
//                         },

//                      },
//                      { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
//                     { $project: { "_id": 0, "totalCount": 1 } }
//                     // { $project: {  _id: 1 } }
//                 ],
//                 as: "saTrueCount"
//          }         
//         },
//         {
//             $lookup:{
//                 from: "surveyactivities",       // other table name
//                 let: { sourcesId: {$toString: "$_id"}, available: false },
//                 pipeline: [
//                     { $match:
//                         { $expr:
//                            { $and:
//                               [
//                                 { $eq: [ "$sourceId",  "$$sourcesId" ] },
//                                 { $eq: [ "$available", "$$available" ] }
//                               ]
//                            }
//                         }
//                      },
//                      { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
//                      { $project: { "_id": 0, "totalCount": 1 } }
//                     // { $project: {  _id: 1 } }
//                 ],
//                 as: "saFalseCount"
//          }         
//         },
//         {
//             $lookup:{
//                 from: "surveyactivities",       // other table name
//                 let: { sourcesId: {$toString: "$_id"} },
//                 pipeline: [
//                     { $match:
//                         { $expr:{ $eq: [ "$sourceId",  "$$sourcesId" ] },}
//                      },
//                      { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
//                      { $project: { "_id": 0, "totalCount": 1 } }
//                 ],
//                 as: "saTotalCount"
//          }         
//         },
//         {   
//             $project:{
//                 _id : 1,
//                 sourceName : 1,
//                 saTrueCount : {$size:"$saTrueCount"},
//                 saFalseCount : {$size:"$saFalseCount"},
//                 saTotalCount : {$size:"$saTotalCount"},
//             } 
//         }
//     ]).then(async(result) =>{
//         await Promise.all(result.map( async(items)=>{
//             const data = {
//                 name:items.sourceName,
//                 series: [
//                     {
//                       "name": "Yes",
//                       "value": (items.saTrueCount*100)/items.saTotalCount
//                     },
//                     {
//                       "name": "No",
//                       "value": (items.saFalseCount*100)/items.saTotalCount

//                     }
//                 ]
//             }
//             sourceReport.push(data);
//         }))

//         if(result.length == sourceReport.length){
//             return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully',sourceReport);
//         }
//     }).catch(err=>{
//         console.log(err)
//     })


// }
const viewRetailerReport = async (req, res) => {
    let retailerReport = [];
    const retailerQuery = {}

    let surveyIds = [];
    let retailerIds = [];
    
    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
    await getAccessList(req, res, async function (retailerAccessIds) {
        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                        if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                            surveyIds.push(brData.surveyId);
                            retailerIds.push(branchretailers[0].retailerId);
                        }
                    
                }
            }))
        }))
    })
    let uniqueIds = retailerIds.filter((item, i, ar) => ar.indexOf(item) === i);
    let retailerYesQuery = {};

    retailerQuery['_id'] = { $in: uniqueIds }

    // await Retailers.find(retailerQuery,'branchRetailerName')
    await Retailers.aggregate([
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { retId: { $toString: "$_id" }, available: true },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$retailerId", "$$retId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                        { $eq: ["$available", "$$available"] }
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }
                    // { $project: {  _id: 1 } }
                ],
                as: "saTrueCount"
            }
        },
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { retId: { $toString: "$_id" } },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$retailerId", "$$retId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }
                    // { $project: {  _id: 1 } }
                ],
                as: "saTotalCount"
            }
        },
        {
            $project: {
                _id: 1,
                retailerName: 1,
                retailerImage: 1,
                saTrueCount: { $size: "$saTrueCount" },
                saTotalCount: { $size: "$saTotalCount" },
            }
        }
    ]).then(async (result) => {
        result.map(async (items) => {
            const countTrue = items.saTrueCount;
            const countTotal = items.saTotalCount;
            const data = {
                name: items.retailerName,
                value: (countTrue * 100) / countTotal,
                logo: items.retailerImage
            }
            retailerReport.push(data)
            if (retailerReport.length == result.length) {
                return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully', { retailerReport });
            }
        })

    }).catch(err => {
        console.log(err)
    })
}
// const viewBranchReport = async (req, res) => {
//     let branchRetailerReport =[];
//     const grandQuery = {};
//     const branchRetailerQuery = {};
//     let surveyIds = [];
//     let storesIds =[];

//     const surveys = await Surveyschedules.find({isDeleted:false,"branchRetailerDetails.active":true,"branchRetailerDetails.isCompleted":true})
//     await getAccessList(req, res, async function(retailerAccessIds){
//     await Promise.all(surveys.map(async(item) =>{
//         await Promise.all(item.branchRetailerDetails.map(async(brData) =>{
//             if(brData.active===true && brData.isCompleted === true){
//                 const branchretailers = await Branchretailers.find({_id: mongoose.Types.ObjectId(brData.storeId)});
//                 // ////console.log(retailerAccessIds);
//                 if(retailerAccessIds.includes(branchretailers[0].retailerId)){
//                         storesIds.push(brData.storeId);
//                         surveyIds.push(brData.surveyId);

//                     }
//                 }   
//             }))
//         }))
//     })

//     grandQuery['surveyId'] = {$in:surveyIds}
//     let uniqueIds = storesIds.filter((item, i, ar) => ar.indexOf(item) === i);
//     // branchRetailerQuery['_id'] = {$in:storesIds}
//     // await Branchretailers.find(branchRetailerQuery,'branchRetailerName')
//     await Branchretailers.aggregate([
//         {$match:{_id:{$in:uniqueIds}}},
//         {

//             $lookup:{
//                 from: "surveyactivities",       // other table name
//                 let: { brId: {$toString: "$_id"}, available: true },
//                 pipeline: [
//                     { $match:
//                         { $expr:
//                            { $and:
//                               [
//                                 { $eq: [ "$branchRetailerId",  "$$brId" ] },
//                                 { $in: [ "$surveyId",  surveyIds ] },
//                                 { $eq: [ "$available", "$$available" ] }
//                               ]
//                            }
//                         }
//                      },
//                      { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
//                      { $project: { "_id": 0, "totalCount": 1 } }

//                     // { $project: {  _id: 1 } }
//                 ],
//                 as: "saTrueCount"
//          }         
//         },
//         {
//             $lookup:{
//                 from: "surveyactivities",       // other table name
//                 let: { brId: {$toString: "$_id"} },
//                 pipeline: [
//                     { $match:
//                         { $expr:
//                             {$and:
//                             [
//                               { $eq: [ "$branchRetailerId",  "$$brId" ] },
//                               { $in: [ "$surveyId",  surveyIds ] },
//                             ]
//                          }
//                         }

//                      },
//                      { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
//                      { $project: { "_id": 0, "totalCount": 1 } }

//                     // { $project: {  _id: 1 } }
//                 ],
//                 as: "saTotalCount"
//          }         
//         },
//         {   
//             $project:{
//                 _id : 1,
//                 branchRetailerName : 1,
//                 saTrueCount : {$size:"$saTrueCount"},
//                 saTotalCount : {$size:"$saTotalCount"},
//             } 
//         }
//     ]).limit(10).exec().then( async(result) => {
//         await result.map(async(item) => {

//             const data = {
//                 name:item.branchRetailerName, 
//                 value: parseFloat((item.saTrueCount*100)/item.saTotalCount).toFixed(2)
//             }
//             branchRetailerReport.push(data)
//             if(branchRetailerReport.length == result.length){
//                 return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully',{branchRetailerReport});
//             }
//         })

//     }).catch(err=>{
//         console.log(err)
//     })
// }

const viewBranchReport = async (req, res) => {
    let branchRetailerReport = [];
    const grandQuery = {};
    const branchRetailerQuery = {};
    let surveyIds = [];
    let storesIds = [];
    
    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
    await getAccessList(req, res, async function (retailerAccessIds) {
        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                    
                        if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                            storesIds.push(brData.storeId);
                            surveyIds.push(brData.surveyId);
                        }
                    
                }
            }))
        }))
    })

    grandQuery['surveyId'] = { $in: surveyIds }


    // let uniqueIds = storesIds.filter((item, i, ar) => ar.indexOf(item) === i);

    // Branch Retailer Report
    branchRetailerQuery['_id'] = { $in: storesIds }

     const branchRetailerData = await Branchretailers.find(branchRetailerQuery, 'branchRetailerName').limit(30);
    
    // 
    const branchYesQuery = {};
    const count = await Branchretailers.count(branchRetailerQuery)

        await Branchretailers.find(branchRetailerQuery,'branchRetailerName').lean().cursor().
        on('data', async function(doc) { 
    
            branchYesQuery['branchRetailerId'] = doc._id
            branchYesQuery['surveyId'] = {$in:surveyIds}
            branchYesQuery['available'] = true
            const branchCount =  await Surveyactivities.count(branchYesQuery).lean();
            const branchTotalCount =  await Surveyactivities.count({surveyId:{$in:surveyIds},branchRetailerId:doc._id}).lean();
    
            data = {
                name:doc.branchRetailerName, 
                value: (branchCount*100)/branchTotalCount
            }
            branchRetailerReport.push(data);
            if(count == branchRetailerReport.length){
                return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully',{branchRetailerReport});
            }
        });

    // return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully', { branchRetailerReport });

}
const viewCityReport = async (req, res) => {
    let cityReport = [];
    const cityQuery = {}
    const grandQuery = {};
    let surveyIds = [];
    let cityIds = []

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })

    await getAccessList(req, res, async function (retailerAccessIds) {
        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                    // ////console.log(retailerAccessIds);
                        if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                            surveyIds.push(brData.surveyId);
                            cityIds.push(branchretailers[0].cityId);
                        }
                    
                }
            }))
        }))
    })
    // let uniqueIds = cityIds.filter((item, i, ar) => ar.indexOf(item) === i);

    grandQuery['surveyId'] = { $in: surveyIds }


    // City Report
    cityQuery['_id'] = { $in: cityIds }
    // await Cities.find(cityQuery,'cityName')
    await Cities.aggregate([
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { cId: { $toString: "$_id" }, available: true },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$cityId", "$$cId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                        { $eq: ["$available", "$$available"] }
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }

                    // { $project: {  _id: 1 } }
                ],
                as: "saTrueCount"
            }
        },
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { cId: { $toString: "$_id" } },
                pipeline: [
                    {
                        $match:
                        {
                            $expr: {
                                $and:
                                    [
                                        { $eq: ["$cityId", "$$cId"] },
                                        { $in: ["$surveyId", surveyIds] },

                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }

                    // { $project: {  _id: 1 } }
                ],
                as: "saTotalCount"
            }
        },
        {
            $project: {
                _id: 1,
                cityName: 1,
                saTrueCount: { $size: "$saTrueCount" },
                saTotalCount: { $size: "$saTotalCount" },
            }
        }
    ]).then(async (result) => {
        await result.map(async (item) => {
            const data = {
                name: item.cityName,
                value: (item.saTrueCount * 100) / item.saTotalCount
            }
            cityReport.push(data)
            if (cityReport.length == result.length) {
                return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully', { cityReport });
            }
        })


    }).catch(err => {
        console.log(err)
    })
}
const viewChannelReport = async (req, res) => {
    let channelReport = [];
    let channelDataReport = [];
    const grandQuery = {};
    const channelQuery = {};
    let surveyIds = [];
    let channelIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })

    await getAccessList(req, res, async function (retailerAccessIds) {
        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                    
                        if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                            channelIds.push(branchretailers[0].channelId);
                            surveyIds.push(brData.surveyId);

                        }
                }
            }))
        }))
    })

    grandQuery['surveyId'] = { $in: surveyIds }


    // Channel Report
    channelQuery['_id'] = { $in: channelIds }
    // const channelData = await Channels.find(channelQuery,'channelName');
    await Channels.aggregate([
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { chId: { $toString: "$_id" }, available: true },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$channelId", "$$chId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                        { $eq: ["$available", "$$available"] }
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }

                    // { $project: {  _id: 1 } }
                ],
                as: "saTrueCount"
            }
        },
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { chId: { $toString: "$_id" } },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$channelId", "$$chId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }

                    // { $project: {  _id: 1 } }
                ],
                as: "saTotalCount"
            }
        },
        {
            $project: {
                _id: 1,
                channelName: 1,
                saTrueCount: { $size: "$saTrueCount" },
                saTotalCount: { $size: "$saTotalCount" },
            }
        }
    ]).then(async (result) => {
        await result.map(async (item) => {
            const countTrue = item.saTrueCount;
            const countTotal = item.saTotalCount;
            const data = {
                name: item.channelName,
                value: parseFloat((countTrue * 100) / countTotal).toFixed(2),
                label: (countTrue * 100) / countTotal + '%'

            }
            channelReport.push(data);
            channelDataReport = {
                series: channelReport
            }
            if (channelReport.length == result.length) {
                return makeResponse(res, true, 200, true, 'Channel Reports', 'Channel Reports fetched successfully', { channelDataReport });
            }
        })
    }).catch(err => {
        console.log(err)
    })
}
const getAccessList = async (req, res, callback) => {
    let retailerAccessIds = [];
    if (req.body.emailId && req.body.emailId == '') {
        let errorText = 'email id can not be empty.';
        return makeResponse(res, true, 200, false, errorText, errorText);
    }
    const corporation = await Corporation.findOne({ emailId: req.body.emailId, _id: mongoose.Types.ObjectId(req.body.id) })
    if (corporation.accessList && corporation.accessList.length > 1) {
        channelds = await Skus.find({ _id: { $in: corporation.accessList } }).distinct('channels');
        retailerAccessIds = await Branchretailers.find({ channelId: { $in: channelds } }).distinct('retailerId');
    } else {
        retailerAccessIds = await Branchretailers.find().distinct('retailerId');
    }
    return callback(retailerAccessIds)
}
const viewBrandReport = async (req, res) => {

    let brandReport = [];
    const brandQuery = {}
    let surveyIds = [];
    let brandIds = []

    const corporation = await Corporation.findOne({ emailId: req.body.emailId, _id: mongoose.Types.ObjectId(req.body.id) })

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
    await getAccessList(req, res, async function (retailerAccessIds) {
        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) })
                    if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                            const retailer = await Retailers.find({ _id: mongoose.Types.ObjectId(branchretailers[0].retailerId) })
                            if (corporation.accessList && corporation.accessList.length > 1) {
                                brandIds = await Skus.find({ _id: { $in: corporation.accessList } }).distinct('brandId');
                            } else {
                                brandIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('brandId');
                            }
                            surveyIds.push(brData.surveyId);
                        }
                }
            }))
        }))
    })


    brandQuery['_id'] = { $in: brandIds };
    // const brandData = await Brands.find(brandQuery,'brandName');
    // {
    //     $lookup:{
    //         from: "surveyactivities",       // other table name
    //         let: { bId: {$toString: "$_id"}, available: true },
    //         pipeline: [{ $match:{ $expr:{ $and:
    //                       [
    //                         { $eq: [ "$brandId",  "$$bId" ] },
    //                         { $in: [ "$surveyId",  surveyIds ] },
    //                         {$eq:["$created", startdate]},
    //                         { $eq: [ "$available", "$$available" ] }] }}
    //              },
    //              { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
    //              { $project: { "_id": 0, "totalCount": 1 } }
    //         ],
    //         as: "saTrueCount"
    //  }         
    // },
    await Brands.aggregate([
        {
            $lookup: {
                from: "surveyactivities",
                let: { bId: { $toString: "$_id" } },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:{ $and:
                          [
                            { $eq: [ "$brandId",  "$$bId" ] },
                            { $in: [ "$surveyId",  surveyIds ] },
                        ] 
                        }
                        }
                    },
                ],
                as: "sa"
            }
        },
        {
            $project: {
                "_id": 1, "brandName": 1, "available": 1,
                saTotalCount: { $size: "$sa" },
                saTrueCount: { $size: {
                    $filter: {
                        input: "$sa",
                        as: "truedata",
                        cond: { $eq: ["$$truedata.available", true] }
                    }
                }
                }
            }
        }
    ]).then((result) => {
        result.map(item => {
            const countTrue = item.saTrueCount;
            const countTotal = item.saTotalCount;
            const data = {
                name: item.brandName,
                value: parseFloat((countTrue * 100) / countTotal).toFixed(2)
            }
            brandReport.push(data)
        })
        return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully', { brandReport });
    }).catch(err => {
        console.log(err)
    })
}
const viewSkuReport = async (req, res) => {
    let skuReport = [];
    let surveyIds = [];
    let skuIds = [];
    const skuQuery = {}
    const corporation = await Corporation.findOne({ emailId: req.body.emailId, _id: mongoose.Types.ObjectId(req.body.id) })

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
    await getAccessList(req, res, async function (retailerAccessIds) {
        await Promise.all(surveys.map(async (item) => {
            await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                if (brData.active === true && brData.isCompleted === true) {
                    const branchretailers = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                    
                        if (retailerAccessIds.includes(branchretailers[0].retailerId)) {
                            const retailer = await Retailers.find({ _id: mongoose.Types.ObjectId(branchretailers[0].retailerId) })
                            if (corporation.accessList && corporation.accessList.length > 1) {
                                skuIds = await Skus.find({ _id: { $in: corporation.accessList } }).distinct('_id');
                            } else {
                                skuIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('_id');
                            }
                            surveyIds.push(brData.surveyId);
                        }
                    
                }
            }))
        }))
    })


    let uniqueIds = skuIds.filter((item, i, ar) => ar.indexOf(item) === i);
    // SKU Report
    skuYesQuery = {};
    // skuQuery
    skuQuery['_id'] = { $in: uniqueIds }
    await Skus.aggregate([
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { sId: { $toString: "$_id" }, available: true },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$skuId", "$$sId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                        { $gte: ["$created", startdate] },
                                        { $eq: ["$available", "$$available"] }
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }

                    // { $project: {  _id: 1 } }
                ],
                as: "saTrueCount"
            }
        },
        {
            $lookup: {
                from: "surveyactivities",       // other table name
                let: { sId: { $toString: "$_id" } },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$skuId", "$$sId"] },
                                        { $in: ["$surveyId", surveyIds] },
                                        { $gte: ["$created", startdate] }
                                    ]
                            }
                        }
                    },
                    { $group: { _id: "$_id", totalCount: { $sum: 1 } } },
                    { $project: { "_id": 0, "totalCount": 1 } }

                    // { $project: {  _id: 1 } }
                ],
                as: "saTotalCount"
            }
        },

        {
            $project: {
                // _id : 1,
                skuName: 1,
                saTrueCount: { $size: "$saTrueCount" },
                saTotalCount: { $size: "$saTotalCount" },
            }
        }
    ]).limit(15).exec().then(async (result) => {
        await result.map(item => {
            const data = {
                name: item.skuName,
                value: (item.saTrueCount * 100) / item.saTotalCount
            }
            skuReport.push(data)
        })
        if (result.length == skuReport.length) {
            return makeResponse(res, true, 200, true, 'Available Survey', 'Available survey fetched successfully', { skuReport });
        }
    }).catch(err => {
        console.log(err)
    })
}
// const viewSkuReport = async (req, res) => {
//     let skuReport =[];
//     let surveyIds = [];
//     let skuIds = [];
//     const skuQuery = {}
//      const corporation = await Corporation.findOne({emailId:req.body.emailId,_id:mongoose.Types.ObjectId(req.body.id)})

//     const surveys = await Surveyschedules.find({isDeleted:false,"branchRetailerDetails.active":true,"branchRetailerDetails.isCompleted":true})
//     await getAccessList(req, res, async function(retailerAccessIds){
//         await Promise.all(surveys.map(async(item) =>{
//             await Promise.all(item.branchRetailerDetails.map(async(brData) =>{
//                 if(brData.active===true && brData.isCompleted === true){
//                     const branchretailers = await Branchretailers.find({_id: mongoose.Types.ObjectId(brData.storeId)});
//                     if(retailerAccessIds.includes(branchretailers[0].retailerId)){
//                         const retailer = await Retailers.find({_id: mongoose.Types.ObjectId(branchretailers[0].retailerId)})
//                             if(corporation.accessList&&corporation.accessList.length>1){
//                             skuIds = await Skus.find({_id:{$in:corporation.accessList}}).distinct('_id');
//                             }else{
//                             skuIds = await Skus.find({channels: {$in :retailer[0].channels}}).distinct('_id');
//                             }               
//                             surveyIds.push(brData.surveyId);
//                         }
//                 }
//             }))
//         }))
//     })


//     // let uniqueIds = skuIds.filter((item, i, ar) => ar.indexOf(item) === i);
//     // SKU Report
//     skuYesQuery = {};
//     skuQuery['_id'] = {$in:skuIds}
//     const count = await Skus.count(skuQuery)

//     await Skus.find(skuQuery,'skuName').lean().cursor().
//     on('data', async function(doc) { 

//         skuYesQuery['skuId'] = doc._id
//         skuYesQuery['surveyId'] = {$in:surveyIds}
//         skuYesQuery['available'] = true
//         const skuCount =  await Surveyactivities.count(skuYesQuery).lean();

//         data = {
//             name:doc.skuName, 
//             value: (skuCount*100)/surveyIds.length
//         }
//         skuReport.push(data);
//         if(count == skuReport.length){
//             return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully',{skuReport});
//         }
//     });

// }
const viewCategoryPictures = async (req, res, surveyIdsData = []) => {
    let pictureOfCatgories = [];
    let surveyIds = [];
    let segmentsdata = [];
    let skudata = [];
    let catdata = [];
    let branddata = [];
    let sourcedata = [];
    await getFilters(req, res, async function (response) {
        segmentsdata = response.segmentIds;
        skudata = response.skuIds;
        catIds = response.catIds;
        cityIds = response.cityIds;
        brandIds = response.brandIds
        approvedSurvey = response.approvedSurvey
        sourceIds = response.sourceIds
        storesIds = response.storesIds
        channelIds = response.channelIds
        surveyIds = response.surveyIds
        retailerIds = response.retailerIds
        regionIds = response.regionIds
    })




    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(14) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    var countObj = {};
    var countPromises = [
        Categoryactivities.count({ surveyId: { $in: surveyIds } }).exec().then(count => countObj.count = count),
    ];
    const counts = await Promise.all(countPromises).then(() => countObj)
    //   const  = await Categoryactivities.count();
    await Categoryactivities.aggregate([
        { $match: { surveyId: { $in: surveyIds } } },
        { $sort: { created: -1 } },
        {
            $facet: {
                "stage1": [{ "$group": { _id: null, count: { $sum: 1 } } }],
                "stage2": [{ "$skip": skip }, { "$limit": limit }]
            }
        },
        { $unwind: "$stage1" },
        {
            $project: {
                count: "$stage1.count",
                data: "$stage2"
            }
        }
    ]).then(async (resp) => {
        await Promise.all(resp[0].data.map(async (items) => {
            if (items.retailerId != 0) {
                const retailer = await Retailers.findOne({ _id: mongoose.Types.ObjectId(items.retailerId) })
                const branchRetailer = await Branchretailers.findOne({ _id: mongoose.Types.ObjectId(items.branchRetailerId) })
                const city = await Cities.findOne({ _id: { $in: retailer.cities } })
                const data = {
                    id: items._id,
                    name: retailer.retailerName,
                    branchName: branchRetailer ? branchRetailer.branchRetailerName : '',
                    imageUrl: items.categoryPictures.length > 0 ? items.categoryPictures : [],
                    created: moment(items.created).format('DD, MMM YYYY'),
                    city: city.cityName
                }
                pictureOfCatgories.push(data);
            }
        }))
        const picArr = pictureOfCatgories.sort((a, b) => (a.created) - (b.created))
        const countData = {
            approvedSurvey: approvedSurvey ? approvedSurvey.length : 0
        };
        const response = {
            count: counts.count, countData, pictureOfCatgories: picArr, page
        }
        return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully', response);
    })


    // 
    // return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully',{countData,pictureOfCatgories});

}
const getFilters = async (req, res, callback) => {

    try {
        const regions = req.body.region ? req.body.region : [];
        const cities = req.body.city ? req.body.city : [];
        const channels = req.body.channel ? req.body.channel : [];
        const retailers = req.body.retailer ? req.body.retailer : [];
        const branches = req.body.branch ? req.body.branch : [];
        const segments = req.body.segment ? req.body.segment : [];
        const sources = req.body.source ? req.body.source : [];
        const categories = req.body.category ? req.body.category : [];
        const brands = req.body.brand ? req.body.brand : [];
        const skus = req.body.sku ? req.body.sku : [];
        let surveyIds = [];
        let approvedSurvey = [];
        let catIds = []
        let brandIds = []
        let retailerIds = [];
        let regionIds = [];
        let sourceIds = [];
        let segmentIds = [];
        let cityIds = []
        let channelIds = [];
        let skuIds = [];
        let storesIds = [];
        let surveys = [];
        if (req.body.date && req.body.date.start != '' && req.body.date.end != '') {
            const dateFilter = req.body.date;
            const startDate = new Date(dateFilter.start);
            const endDate = new Date(dateFilter.end);
            surveys = await Surveyschedules.find({ isDeleted: false, scheduleDate: { $gte: startDate, $lte: endDate }, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
        } else {
            surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true })
        }

        await getAccessList(req, res, async function (retailerAccessIds) {
            await Promise.all(surveys.map(async (item) => {
                await Promise.all(item.branchRetailerDetails.map(async (brData) => {
                    if (brData.active === true && brData.isCompleted === true) {
                        const branchretailersurveylist = await Branchretailers.find({ _id: mongoose.Types.ObjectId(brData.storeId) });
                        if (retailerAccessIds.includes(branchretailersurveylist[0].retailerId)) {
                            retailer = await Retailers.find({ _id: mongoose.Types.ObjectId(branchretailersurveylist[0].retailerId) })
                            if (regions && regions.length > 0 && cities.length == 0 && channels.length == 0 && retailers.length == 0 && branches.length == 0 && segments.length == 0 && sources.length == 0 && categories.length == 0 && brands.length == 0 && skus.length == 0) {
                                if (regions.includes(branchretailersurveylist[0].regionId)) {
                                    if (req.body.accessList && req.body.accessList.length > 1) {
                                        catIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('catId');
                                        skuIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('_id');
                                        brandIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('brandId');
                                        sourceIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('segmentId');
                                    } else {
                                        catIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('catId');
                                        skuIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('_id');
                                        brandIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('brandId');
                                        sourceIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                    }
                                    storesIds.push(brData.storeId);
                                    surveyIds.push(brData.surveyId);
                                    retailerIds.push(branchretailersurveylist[0].retailerId);
                                    regionIds.push(branchretailersurveylist[0].regionId);
                                    cityIds.push(branchretailersurveylist[0].cityId);
                                    channelIds.push(branchretailersurveylist[0].channelId);
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions && regions.length > 0 && cities && cities.length > 0 && channels.length == 0 && retailers.length == 0 && branches.length == 0 && segments.length == 0 && sources.length == 0 && categories.length == 0 && brands.length == 0 && skus.length == 0) {

                                if (regions.includes(branchretailersurveylist[0].regionId) && cities.includes(branchretailersurveylist[0].cityId)) {
                                    if (req.body.accessList && req.body.accessList.length > 1) {
                                        catIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('catId');
                                        skuIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('_id');
                                        brandIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('brandId');
                                        sourceIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('segmentId');
                                    } else {
                                        catIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('catId');
                                        skuIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('_id');
                                        brandIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('brandId');
                                        sourceIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                    }
                                    storesIds.push(brData.storeId);
                                    surveyIds.push(brData.surveyId);
                                    retailerIds.push(branchretailersurveylist[0].retailerId);
                                    regionIds.push(branchretailersurveylist[0].regionId);
                                    cityIds.push(branchretailersurveylist[0].cityId);
                                    channelIds.push(branchretailersurveylist[0].channelId);
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions && regions.length > 0 && cities && cities.length > 0 && channels && channels.length > 0 && retailers.length == 0 && branches.length == 0 && segments.length == 0 && sources.length == 0 && categories.length == 0 && brands.length == 0 && skus.length == 0) {

                                if (regions.includes(branchretailersurveylist[0].regionId) && cities.includes(branchretailersurveylist[0].cityId) && channels.includes(branchretailersurveylist[0].channelId)) {
                                    if (req.body.accessList && req.body.accessList.length > 1) {
                                        catIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('catId');
                                        skuIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('_id');
                                        brandIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('brandId');
                                        sourceIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('segmentId');
                                    } else {
                                        catIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('catId');
                                        skuIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('_id');
                                        brandIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('brandId');
                                        sourceIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                    }
                                    storesIds.push(brData.storeId);
                                    surveyIds.push(brData.surveyId);
                                    retailerIds.push(branchretailersurveylist[0].retailerId);
                                    regionIds.push(branchretailersurveylist[0].regionId);
                                    cityIds.push(branchretailersurveylist[0].cityId);
                                    channelIds.push(branchretailersurveylist[0].channelId);
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions && regions.length > 0 && cities && cities.length > 0 && channels && channels.length > 0 && retailers && retailers.length > 0 && branches.length == 0 && segments.length == 0 && sources.length == 0 && categories.length == 0 && brands.length == 0 && skus.length == 0) {

                                if (regions.includes(branchretailersurveylist[0].regionId) && cities.includes(branchretailersurveylist[0].cityId) && channels.includes(branchretailersurveylist[0].channelId) && retailers.includes(branchretailersurveylist[0].retailerId)) {
                                    retailer = await Retailers.find({ _id: mongoose.Types.ObjectId(branchretailersurveylist[0].retailerId) })
                                    branchretailers = await Branchretailers.find({ retailerId: branchretailersurveylist[0].retailerId }).distinct('_id');

                                    if (req.body.accessList && req.body.accessList.length > 1) {
                                        catIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('catId');
                                        skuIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('_id');
                                        brandIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('brandId');
                                        sourceIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('segmentId');
                                    } else {
                                        catIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('catId');
                                        skuIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('_id');
                                        brandIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('brandId');
                                        sourceIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                    }
                                    storesIds = branchretailers;
                                    surveyIds.push(brData.surveyId);
                                    retailerIds.push(retailer[0]['_id']);
                                    regionIds.push(branchretailersurveylist[0].regionId);
                                    cityIds.push(branchretailersurveylist[0].cityId);
                                    channelIds.push(branchretailersurveylist[0].channelId);
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions && regions.length > 0 && cities && cities.length > 0 && channels && channels.length > 0 && retailers && retailers.length > 0 && branches && branches.length > 0 && segments.length == 0 && sources.length == 0 && categories.length == 0 && brands.length == 0 && skus.length == 0) {

                                if (regions.includes(branchretailersurveylist[0].regionId) && cities.includes(branchretailersurveylist[0].cityId)
                                    && channels.includes(branchretailersurveylist[0].channelId) && retailers.includes(branchretailersurveylist[0].retailerId)
                                    && branches.includes(brData.storeId)) {
                                    if (req.body.accessList && req.body.accessList.length > 1) {
                                        catIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('catId');
                                        skuIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('_id');
                                        brandIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('brandId');
                                        sourceIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('segmentId');
                                    } else {
                                        catIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('catId');
                                        skuIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('_id');
                                        brandIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('brandId');
                                        sourceIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                        segmentIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                    }
                                    storesIds.push(brData.storeId);
                                    surveyIds.push(brData.surveyId);
                                    retailerIds.push(branchretailersurveylist[0].retailerId);
                                    regionIds.push(branchretailersurveylist[0].regionId);
                                    cityIds.push(branchretailersurveylist[0].cityId);
                                    channelIds.push(branchretailersurveylist[0].channelId);
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions && regions.length > 0 && cities && cities.length > 0 && channels && channels.length > 0 && retailers && retailers.length > 0 && branches && branches.length > 0 && segments && segments.length > 0 && sources.length == 0 && categories.length == 0 && brands.length == 0 && skus.length == 0) {

                                let segmentAllIds = [];
                                if (req.body.accessList && req.body.accessList.length > 1) {
                                    segmentAllIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('segmentId');
                                } else {
                                    segmentAllIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                }
                                if (regions.includes(branchretailersurveylist[0].regionId) && cities.includes(branchretailersurveylist[0].cityId)
                                    && channels.includes(branchretailersurveylist[0].channelId) && retailers.includes(branchretailersurveylist[0].retailerId)
                                    && branches.includes(brData.storeId)) {
                                    segmentsdata = segments.filter((word) => !segmentAllIds.includes(word));
                                    segmentIds = segmentsdata;
                                    catIds = await Skus.find({ segmentId: { $in: segmentsdata }, channels: { $in: retailer[0].channels } }).distinct('catId');
                                    skuIds = await Skus.find({ segmentId: { $in: segmentsdata }, channels: { $in: retailer[0].channels } }).distinct('_id');
                                    brandIds = await Skus.find({ segmentId: { $in: segmentsdata }, channels: { $in: retailer[0].channels } }).distinct('brandId');
                                    sourceIds = await Skus.find({ segmentId: { $in: segmentsdata }, channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                    storesIds = branches;
                                    surveyIds.push(brData.surveyId);
                                    retailerIds = retailers;
                                    regionIds = regions;
                                    cityIds = cities;
                                    channelIds = channels;
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions && regions.length > 0 && cities && cities.length > 0 && channels && channels.length > 0 && retailers && retailers.length > 0 && branches && branches.length > 0 && segments && segments.length > 0 && sources && sources.length > 0 && categories.length == 0 && brands.length == 0 && skus.length == 0) {

                                let sourcesAllIds = [];
                                if (req.body.accessList && req.body.accessList.length > 1) {
                                    sourcesAllIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('sourceId');
                                } else {
                                    sourcesAllIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                }
                                if (regions.includes(branchretailersurveylist[0].regionId) && cities.includes(branchretailersurveylist[0].cityId)
                                    && channels.includes(branchretailersurveylist[0].channelId) && retailers.includes(branchretailersurveylist[0].retailerId)
                                    && branches.includes(brData.storeId)) {
                                    sourcedata = sources.filter((word) => !sourcesAllIds.includes(word));
                                    catIds = await Skus.find({ sourceId: { $in: sourcedata }, channels: { $in: retailer[0].channels } }).distinct('catId');
                                    skuIds = await Skus.find({ sourceId: { $in: sourcedata }, channels: { $in: retailer[0].channels } }).distinct('_id');
                                    brandIds = await Skus.find({ sourceId: { $in: sourcedata }, channels: { $in: retailer[0].channels } }).distinct('brandId');
                                    sourceIds = sourcedata
                                    segmentIds = await Skus.find({ sourceId: { $in: sourcedata }, channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                    storesIds = branches;
                                    surveyIds.push(brData.surveyId);
                                    retailerIds = retailers;
                                    regionIds = regions;
                                    cityIds = cities;
                                    channelIds = channels;
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions && regions.length > 0 && cities && cities.length > 0 && channels && channels.length > 0 && retailers && retailers.length > 0 && branches && branches.length > 0 && segments && segments.length > 0 && sources && sources.length > 0 && categories && categories.length > 0 && brands.length == 0 && skus.length == 0) {

                                let catAllIds = [];
                                if (req.body.accessList && req.body.accessList.length > 1) {
                                    catAllIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('catId');
                                } else {
                                    catAllIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('catId');
                                }
                                if (regions.includes(branchretailersurveylist[0].regionId) && cities.includes(branchretailersurveylist[0].cityId)
                                    && channels.includes(branchretailersurveylist[0].channelId) && retailers.includes(branchretailersurveylist[0].retailerId)
                                    && branches.includes(brData.storeId)) {
                                    catdata = categories.filter((word) => !catAllIds.includes(word));
                                    catIds = catdata
                                    skuIds = await Skus.find({ catId: { $in: catdata }, channels: { $in: retailer[0].channels } }).distinct('_id');
                                    brandIds = await Skus.find({ catId: { $in: catdata }, channels: { $in: retailer[0].channels } }).distinct('brandId');
                                    sourceIds = await Skus.find({ catId: { $in: catdata }, channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                    segmentIds = await Skus.find({ catId: { $in: catdata }, channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                    storesIds = branches;
                                    surveyIds.push(brData.surveyId);
                                    retailerIds = retailers;
                                    regionIds = regions;
                                    cityIds = cities;
                                    channelIds = channels;
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions && regions.length > 0 && cities && cities.length > 0 && channels && channels.length > 0 && retailers && retailers.length > 0 && branches && branches.length > 0 && segments && segments.length > 0 && sources && sources.length > 0 && categories && categories.length > 0 && brands && brands.length > 0 && skus.length == 0) {

                                let brandAllIds = [];
                                if (req.body.accessList && req.body.accessList.length > 1) {
                                    brandAllIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('brandId');
                                } else {
                                    brandAllIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('brandId');
                                }
                                if (regions.includes(branchretailersurveylist[0].regionId) && cities.includes(branchretailersurveylist[0].cityId)
                                    && channels.includes(branchretailersurveylist[0].channelId) && retailers.includes(branchretailersurveylist[0].retailerId)
                                    && branches.includes(brData.storeId)) {
                                    branddata = brands.filter((word) => !brandAllIds.includes(word));

                                    catIds = await Skus.find({ brandId: { $in: branddata }, channels: { $in: retailer[0].channels } }).distinct('catId');
                                    skuIds = await Skus.find({ brandId: { $in: branddata }, channels: { $in: retailer[0].channels } }).distinct('_id');
                                    brandIds = branddata
                                    sourceIds = await Skus.find({ brandId: { $in: branddata }, channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                    segmentIds = await Skus.find({ brandId: { $in: branddata }, channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                    storesIds = branches;
                                    surveyIds.push(brData.surveyId);
                                    retailerIds = retailers;
                                    regionIds = regions;
                                    cityIds = cities;
                                    channelIds = channels;
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions && regions.length > 0 && cities && cities.length > 0 && channels && channels.length > 0 && retailers && retailers.length > 0 && branches && branches.length > 0 && segments && segments.length > 0 && sources && sources.length > 0 && categories && categories.length > 0 && brands && brands.length > 0 && skus && skus.length > 0) {

                                let skuAllIds = [];
                                if (req.body.accessList && req.body.accessList.length > 1) {
                                    skuAllIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('_id');;
                                } else {
                                    skuAllIds = await Skus.find().distinct('_id');;
                                }
                                if (regions.includes(branchretailersurveylist[0].regionId) && cities.includes(branchretailersurveylist[0].cityId)
                                    && channels.includes(branchretailersurveylist[0].channelId) && retailers.includes(branchretailersurveylist[0].retailerId)
                                    && branches.includes(brData.storeId)) {
                                    skudata = skus.filter((word) => !skuAllIds.includes(word));
                                    catIds = await Skus.find({ _id: { $in: skudata }, channels: { $in: retailer[0].channels } }).distinct('catId');
                                    skuIds = skudata;
                                    brandIds = await Skus.find({ _id: { $in: skudata }, channels: { $in: retailer[0].channels } }).distinct('brandId');
                                    sourceIds = await Skus.find({ _id: { $in: skudata }, channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                    segmentIds = await Skus.find({ _id: { $in: skudata }, channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                    storesIds = branches;
                                    surveyIds.push(brData.surveyId);
                                    retailerIds = retailers;
                                    regionIds = regions;
                                    cityIds = cities;
                                    channelIds = channels;
                                    approvedSurvey.push(item);

                                }
                            }
                            if (regions.length == 0 && cities.length == 0 && channels.length == 0 && retailers.length == 0 && branches.length == 0 && segments.length == 0 && sources.length == 0 && categories.length == 0 && brands.length == 0 && skus.length == 0) {
                                if (req.body.accessList && req.body.accessList.length > 1) {
                                    catIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('catId');
                                    skuIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('_id');
                                    brandIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('brandId');
                                    sourceIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('sourceId');
                                    segmentIds = await Skus.find({ _id: { $in: req.body.accessList } }).distinct('segmentId');
                                } else {
                                    catIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('catId');
                                    skuIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('_id');
                                    brandIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('brandId');
                                    sourceIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('sourceId');
                                    segmentIds = await Skus.find({ channels: { $in: retailer[0].channels } }).distinct('segmentId');
                                }

                                storesIds.push(brData.storeId);
                                surveyIds.push(brData.surveyId);
                                retailerIds.push(branchretailersurveylist[0].retailerId);
                                regionIds.push(branchretailersurveylist[0].regionId);
                                cityIds.push(branchretailersurveylist[0].cityId);
                                channelIds.push(branchretailersurveylist[0].channelId);
                                approvedSurvey.push(item);
                            }
                        }
                    }
                }))
            }))
        })

        const response = { cityIds, segmentIds, skuIds, catIds, brandIds, sourceIds, storesIds, approvedSurvey, channelIds, surveyIds, surveyIds, retailerIds, regionIds }
        return callback(response)
    }
    catch (err) {
        console.log(err)
    }

}
const viewReports = async (req, res) => {
    let approvedSurvey = [];
    let report = [];
    let userId = req.body.userId;
    let categoryReport = [];
    let brandReport = [];
    let regionReport = [];
    let retailerReport = [];
    let cityReport = [];
    let pictureOfCatgories = [];
    let segmentReport = [];
    let sourceReport = [];

    let skuReport = [];
    let channelReport = [];
    let channelDataReport = [];
    let branchRetailerReport = [];

    const brandQuery = {}
    const segmentQuery = {}
    const sourceQuery = {}
    const branchQuery = {}
    const regionQuery = {}
    const categoryQuery = {}
    const channelQuery = {}
    const cityQuery = {}
    const retailerQuery = {}
    const skuQuery = {}
    const grandQuery = {};
    const branchRetailerQuery = {};

    let surveyIds = [];
    let catIds = []
    let brandIds = []
    let retailerIds = [];
    let regionIds = [];
    let sourceIds = [];
    let segmentIds = [];
    let cityIds = []
    let channelIds = [];
    let skuIds = [];
    let storesIds = [];

    let segmentsdata = [];
    let skudata = [];
    let catdata = [];
    let branddata = [];
    let sourcedata = [];
    //////console.log(req.body.date);

    await getFilters(req, res, async function (response) {
        segmentIds = response.segmentIds;
        skuIds = response.skuIds;
        catIds = response.catIds;
        cityIds = response.cityIds;
        brandIds = response.brandIds
        approvedSurvey = response.approvedSurvey
        sourceIds = response.sourceIds
        storesIds = response.storesIds
        channelIds = response.channelIds
        surveyIds = response.surveyIds
        retailerIds = response.retailerIds
        regionIds = response.regionIds

    })

    // console.log(storesIds.length);
    // console.log(surveyIds.length);
    grandQuery['surveyId'] = { $in: surveyIds }
    const GrandCount = await Surveyactivities.count(grandQuery);
    var countObj = {};
    var countPromises = [
        Surveyactivities.count({ surveyId: { $in: surveyIds } }).exec().then(count => countObj.countAll = count),
        Surveyactivities.count({ surveyId: { $in: surveyIds }, available: true }).exec().then(count => countObj.countTrueAll = count)
    ];
    const promiseCounts = await Promise.all(countPromises).then(() => countObj)
    const totalScore = parseFloat((promiseCounts.countTrueAll * 100) / promiseCounts.countAll).toFixed(2);
    // Category Report
    categoryQuery['_id'] = { $in: catIds }
    const categoryData = await Categories.find(categoryQuery, 'category');
    let catYesQuery = {};
    await Promise.all(categoryData.map(async (items) => {
        catYesQuery['catId'] = items._id
        catYesQuery['surveyId'] = { $in: surveyIds }
        catYesQuery['available'] = true
        if (segmentsdata && segmentsdata.length > 0) {
            catYesQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            // //////console.log(sourcedata);
            catYesQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            catYesQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            catYesQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            catYesQuery['skuId'] = { $in: skudata }
        }
        const catCount = await Surveyactivities.find(catYesQuery).distinct('surveyId');
        //////console.log(catCount,surveyIds.length);
        data = {
            name: items.category,
            value: (catCount.length * 100) / surveyIds.length
        }
        categoryReport.push(data);
    }))

    // Brand Report
    brandQuery['_id'] = { $in: brandIds };
    const brandData = await Brands.find(brandQuery, 'brandName');
    let brandYesQuery = {};
    await Promise.all(brandData.map(async (items) => {
        brandYesQuery['brandId'] = items._id
        brandYesQuery['surveyId'] = { $in: surveyIds }
        brandYesQuery['available'] = true
        if (segmentsdata && segmentsdata.length > 0) {
            brandYesQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            brandYesQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            brandYesQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            brandYesQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            brandYesQuery['skuId'] = { $in: skudata }
        }
        const brandCount = await Surveyactivities.find(brandYesQuery).distinct('surveyId');
        data = {
            name: items.brandName,
            value: +((brandCount.length) * 100) / (surveyIds.length).toFixed(2)
        }
        brandReport.push(data);
    }))

    // Region Report
    regionQuery['_id'] = { $in: regionIds }
    const regionData = await Regions.find(regionQuery, 'regionName');
    let regionYesQuery = {};
    let regionNoQuery = {};
    await Promise.all(regionData.map(async (items) => {
        regionYesQuery['regionId'] = items._id
        regionYesQuery['surveyId'] = { $in: surveyIds }
        regionYesQuery['available'] = true
        regionNoQuery['available'] = false
        regionNoQuery['regionId'] = items._id
        regionNoQuery['surveyId'] = { $in: surveyIds }
        if (segmentsdata && segmentsdata.length > 0) {
            regionYesQuery['segmentId'] = { $in: segmentsdata }
            regionNoQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            regionYesQuery['sourceId'] = { $in: sourcedata }
            regionNoQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            regionYesQuery['catId'] = { $in: catdata }
            regionNoQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            regionYesQuery['brandId'] = { $in: branddata }
            regionNoQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            regionYesQuery['skuId'] = { $in: skudata }
            regionNoQuery['skuId'] = { $in: skudata }
        }
        ////////console.log(regionYesQuery);
        ////////console.log(regionNoQuery);
        const regionYesCount = await Surveyactivities.count(regionYesQuery);
        const regionNoCount = await Surveyactivities.count(regionNoQuery);
        data = {
            name: items.regionName,
            series: [
                {
                    "name": "Yes",
                    "value": (regionYesCount * 100) / GrandCount
                },
                {
                    "name": "No",
                    "value": (regionNoCount * 100) / GrandCount

                }
            ]
        }
        regionReport.push(data);
    }))

    // Segment Report
    // //////console.log("segmentIds",segmentIds);
    // //////console.log(surveyIds.length);
    segmentQuery['_id'] = { $in: segmentIds }
    const segmentData = await Segments.find(segmentQuery, 'segmentName');
    let segmentYesQuery = {};
    await Promise.all(segmentData.map(async (items) => {
        segmentYesQuery['segmentId'] = items._id
        segmentYesQuery['surveyId'] = { $in: surveyIds }
        segmentYesQuery['available'] = true
        if (segmentsdata && segmentsdata.length > 0) {
            segmentYesQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            segmentYesQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            segmentYesQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            segmentYesQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            segmentYesQuery['skuId'] = { $in: skudata }
        }
        const segmentCount = await Surveyactivities.count(segmentYesQuery);
        data = {
            name: items.segmentName,
            value: (segmentCount * 100) / GrandCount
        }
        segmentReport.push(data);
    }))

    // Source Report
    sourceQuery['_id'] = { $in: sourceIds }
    const sourceData = await Sources.find(sourceQuery, 'sourceName');
    let sourceNoQuery = {};
    let sourceYesQuery = {};

    await Promise.all(sourceData.map(async (items) => {
        sourceYesQuery['sourceId'] = items._id
        sourceNoQuery['sourceId'] = items._id
        sourceYesQuery['surveyId'] = { $in: surveyIds }
        sourceNoQuery['surveyId'] = { $in: surveyIds }
        sourceYesQuery['available'] = true
        sourceNoQuery['available'] = false
        if (segmentsdata && segmentsdata.length > 0) {
            sourceYesQuery['segmentId'] = { $in: segmentsdata }
            sourceNoQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            sourceYesQuery['sourceId'] = { $in: sourcedata }
            sourceNoQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            sourceYesQuery['catId'] = { $in: catdata }
            sourceNoQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            sourceYesQuery['brandId'] = { $in: branddata }
            sourceNoQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            sourceYesQuery['skuId'] = { $in: skudata }
            sourceNoQuery['skuId'] = { $in: skudata }
        }
        var countObj = {};
        var countPromises = [
            Surveyactivities.count(sourceYesQuery).exec().then(count => countObj.sourceYesCount = count),
            Surveyactivities.count(sourceNoQuery).exec().then(count => countObj.sourceNoCount = count),
        ];
        const counts = await Promise.all(countPromises).then(() => countObj)
        //   //////console.log(counts);
        // const sourceYesCount =  await Surveyactivities.count();
        // const sourceNoCount =  await Surveyactivities.count();
        data = {
            name: items.sourceName,
            series: [
                {
                    "name": "Yes",
                    "value": (counts.sourceYesCount * 100) / GrandCount
                },
                {
                    "name": "No",
                    "value": (counts.sourceNoCount * 100) / GrandCount

                }
            ]
        }
        sourceReport.push(data);
    }))

    // Branch Retailer Report
    let uniqueBRIds = storesIds.filter((item, i, ar) => ar.indexOf(item) === i);
    //  //////console.log("uniqueBRIds",uniqueBRIds);
    branchRetailerQuery['_id'] = { $in: uniqueBRIds }
    const branchRetailerData = await Branchretailers.find(branchRetailerQuery, 'branchRetailerName');
    // //////console.log(branchRetailerData);
    let branchYesQuery = {};
    await Promise.all(branchRetailerData.map(async (items) => {
        branchYesQuery['branchRetailerId'] = items._id
        branchYesQuery['surveyId'] = { $in: surveyIds }
        branchYesQuery['available'] = true
        if (segmentsdata && segmentsdata.length > 0) {
            branchYesQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            branchYesQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            branchYesQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            branchYesQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            branchYesQuery['skuId'] = { $in: skudata }
        }
        const branchCount = await Surveyactivities.count(branchYesQuery);
        data = {
            name: items.branchRetailerName,
            value: (branchCount * 100) / GrandCount,
        }
        branchRetailerReport.push(data);
    }))

    // Retailer Report
    let uniqueIds = retailerIds.filter((item, i, ar) => ar.indexOf(item) === i);
    // //////console.log("uniqueIds",uniqueIds);
    retailerQuery['_id'] = { $in: uniqueIds }
    const retailerData = await Retailers.find(retailerQuery);
    let retailerYesQuery = {};
    await Promise.all(retailerData.map(async (items) => {
        retailerYesQuery['retailerId'] = items._id
        retailerYesQuery['surveyId'] = { $in: surveyIds }
        retailerYesQuery['available'] = true
        if (segmentsdata && segmentsdata.length > 0) {
            retailerYesQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            retailerYesQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            retailerYesQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            retailerYesQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            retailerYesQuery['skuId'] = { $in: skudata }
        }
        const regionCount = await Surveyactivities.count(retailerYesQuery);
        data = {
            name: items.retailerName,
            value: (regionCount * 100) / GrandCount,
            logo: items.retailerImage
        }
        retailerReport.push(data);
    }))

    // City Report
    cityQuery['_id'] = { $in: cityIds }
    const cityData = await Cities.find(cityQuery);
    let cityYesQuery = {};
    await Promise.all(cityData.map(async (items) => {
        cityYesQuery['cityId'] = items._id
        cityYesQuery['surveyId'] = { $in: surveyIds }
        cityYesQuery['available'] = true
        if (segmentsdata && segmentsdata.length > 0) {
            cityYesQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            cityYesQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            cityYesQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            cityYesQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            cityYesQuery['skuId'] = { $in: skudata }
        }
        const cityCount = await Surveyactivities.count(cityYesQuery);
        data = {
            name: items.cityName,
            value: (cityCount * 100) / GrandCount
        }
        cityReport.push(data);
    }))

    // Channel Report
    channelQuery['_id'] = { $in: channelIds }
    const channelData = await Channels.find(channelQuery);
    let channelYesQuery = {};
    await Promise.all(channelData.map(async (items) => {
        channelYesQuery['channelId'] = items._id
        channelYesQuery['surveyId'] = { $in: surveyIds }
        channelYesQuery['available'] = true
        if (segmentsdata && segmentsdata.length > 0) {
            channelYesQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            channelYesQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            channelYesQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            channelYesQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            channelYesQuery['skuId'] = { $in: skudata }
        }
        const channelCount = await Surveyactivities.count(channelYesQuery);
        data = {
            name: items.channelName,
            value: (channelCount * 100) / GrandCount,
            label: (channelCount * 100) / GrandCount + '%'
        }
        channelReport.push(data);
        channelDataReport = {
            series: channelReport
        }
    }))
    // SKU Report
    skuQuery['_id'] = { $in: skuIds }
    const skuData = await Skus.find(skuQuery);
    skuYesQuery = {};
    await Promise.all(skuData.map(async (items) => {
        skuYesQuery['skuId'] = items._id
        skuYesQuery['surveyId'] = { $in: surveyIds }
        skuYesQuery['available'] = true
        if (segmentsdata && segmentsdata.length > 0) {
            skuYesQuery['segmentId'] = { $in: segmentsdata }
        }
        if (sourcedata && sourcedata.length > 0) {
            skuYesQuery['sourceId'] = { $in: sourcedata }
        }
        if (catdata && catdata.length > 0) {
            skuYesQuery['catId'] = { $in: catdata }
        }
        if (branddata && branddata.length > 0) {
            skuYesQuery['brandId'] = { $in: branddata }
        }
        if (skudata && skudata.length > 0) {
            skuYesQuery['skuId'] = { $in: skudata }
        }
        const skuCount = await Surveyactivities.find(skuYesQuery).distinct('surveyId');
        data = {
            name: items.skuName,
            value: (skuCount.length * 100) / surveyIds.length
        }
        skuReport.push(data);
    }))


    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(14) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    var countObj = {};
    let picArr = [];
    var countPromises = [
        Categoryactivities.count({ surveyId: { $in: surveyIds } }).exec().then(count => countObj.count = count),
    ];
    const counts = await Promise.all(countPromises).then(() => countObj)
    //   const  = await Categoryactivities.count();
    await Categoryactivities.aggregate([
        { $match: { surveyId: { $in: surveyIds } } },
        { $sort: { created: -1 } },
        {
            $facet: {
                "stage1": [{ "$group": { _id: null, count: { $sum: 1 } } }],
                "stage2": [{ "$skip": skip }, { "$limit": limit }]
            }
        },
        { $unwind: "$stage1" },
        {
            $project: {
                count: "$stage1.count",
                data: "$stage2"
            }
        }
    ]).then(async (resp) => {
        if (resp && resp.length > 0) {
            await Promise.all(resp[0].data.map(async (items) => {
                if (items.retailerId != 0) {
                    const retailer = await Retailers.findOne({ _id: mongoose.Types.ObjectId(items.retailerId) })
                    const branchRetailer = await Branchretailers.findOne({ _id: mongoose.Types.ObjectId(items.branchRetailerId) })
                    const city = await Cities.findOne({ _id: { $in: retailer.cities } })
                    const data = {
                        id: items._id,
                        name: retailer.retailerName,
                        branchName: branchRetailer ? branchRetailer.branchRetailerName : '',
                        imageUrl: items.categoryPictures.length > 0 ? items.categoryPictures : [],
                        created: moment(items.created).format('DD, MMM YYYY'),
                        city: city.cityName
                    }
                    pictureOfCatgories.push(data);
                }
            }))
            picArr = pictureOfCatgories.sort((a, b) => (a.created) - (b.created))
        } else {
            picArr = []
            page = 0
        }
    })

    let picturesReport = { pictureOfCatgories: picArr, page, count: counts.count }
    const countData = {
        totalScore: totalScore ? totalScore : 0,
        approvedSurvey: approvedSurvey ? approvedSurvey.length : 0
    };
    if (sourceReport && sourceReport.length == 0) {
        sourceReport = ['No data availbale']
    }
    if (segmentReport && segmentReport.length == 0) {
        segmentReport = ['No data availbale']
    }
    if (skuReport && skuReport.length == 0) {
        skuReport = ['No data availbale']
    }
    if (cityReport && cityReport.length == 0) {
        cityReport = ['No data availbale']
    }
    if (channelDataReport && channelDataReport.length == 0) {
        channelDataReport = {
            series: ['No data availbale']
        }
    }
    if (cityReport && cityReport.length == 0) {
        cityReport = ['No data availbale']
    }
    if (retailerReport && retailerReport.length == 0) {
        retailerReport = ['No data availbale']
    }
    if (categoryReport && categoryReport.length == 0) {
        categoryReport = ['No data availbale']
    }
    if (regionReport && regionReport.length == 0) {
        regionReport = ['No data availbale']
    }
    if (branchRetailerReport && branchRetailerReport.length == 0) {
        branchRetailerReport = ['No data availbale']
    }
    if (brandReport && brandReport.length == 0) {
        brandReport = ['No data availbale']
    }

    return makeResponse(res, true, 200, true, 'Reports', 'Reports fetched successfully', { picturesReport, countData, sourceReport, segmentReport, skuReport, channelDataReport, cityReport, retailerReport, categoryReport, regionReport, branchRetailerReport, brandReport });

}



function calculateDays(startDate, endDate) {
    var start_date = moment(startDate, 'YYYY-MM-DD');
    var end_date = moment(endDate, 'YYYY-MM-DD');
    var duration = moment.duration(end_date.diff(start_date));
    var days = duration.asDays();
    return Math.round(days, 0);
}
const getRawDataDump = async (req, res) => {
    let todayDate = new Date("2021-06-16");
    let startdate = moment(todayDate, "DD-MM-YYYY").subtract(1, 'days').format('YYYY-MM-DD');
    let arr = [];
    let surveyIds = []
    console.log(startdate);
    const surveys = await Surveyschedules.find({isDeleted:false, day:12, month:7})
    await Promise.all(surveys.map(async (items) => {
        await Promise.all(items.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                // let endDate = moment(brData.surveyDate).format('YYYY-MM-DD');
                // const days = calculateDays(startdate, endDate);
                // if (days == 0) {
                    surveyIds.push(brData.surveyId)
                // }
            }
        }));
    }));
    console.log(surveyIds.length);
    
    // const countDocs = await Surveyactivities.count({surveyId:{$in:surveyIds}});
    await Surveyactivities.find({ surveyId: { $in: surveyIds } })
        .then(async (sa) => {
            await Promise.all(sa.map(async (item) => {

                const channels = await Channels.findOne({_id:{$in:item.channelId}},'channelName').lean();
                const retailer = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.retailerId)},'retailerName').lean();
                const branchRetailer = await Branchretailers.findOne({_id:mongoose.Types.ObjectId(item.branchRetailerId)},'branchRetailerName').lean();

                const region = await Regions.findOne({ _id: mongoose.Types.ObjectId(item.regionId) }, 'regionName').lean();
                const cities = await Cities.findOne({ _id: mongoose.Types.ObjectId(item.cityId) }, 'cityName').lean();
                const segment = await Segments.findOne({ _id: mongoose.Types.ObjectId(item.segmentId) }, 'segmentName').lean();
                const sources = await Sources.findOne({ _id: mongoose.Types.ObjectId(item.sourceId) }, 'sourceName').lean();

                const sku = await Skus.findOne({_id:mongoose.Types.ObjectId(item.skuId)},'skuName').lean();
                const barcode = await Skus.findOne({_id:mongoose.Types.ObjectId(item.skuId)},'barcode').lean();
                const brand = await Brands.findOne({_id:mongoose.Types.ObjectId(item.brandId)},'brandName').lean();
                const category = await Categories.findOne({_id:mongoose.Types.ObjectId(item.catId)},'category').lean();
                const data = {
                    channelName: channels ? channels.channelName : '',
                    retailerName: retailer ? retailer.retailerName : '',
                    branchRetailerName: branchRetailer ? branchRetailer.branchRetailerName : '',
                    regionName: region ? region.regionName : '',
                    cityName: cities ? cities.cityName : '',
                    segment: segment ? segment.segmentName : '',
                    source: sources ? sources.sourceName : '',
                    sku: sku ? sku.skuName : '',
                    skuBarCode: barcode ? barcode.barcode : '',
                    brand: brand ? brand.brandName : '',
                    category: category ? category.category : '',
                    available:item.available,
                    id: item._id,
                    createdDate: moment(item.created).format('DD, MMM YYYY'),
                }
                arr.push(data);
            }));
            return makeResponse(res, true, 200, true, 'Regions', 'surveyactivity Fetched successfully', arr);

        })

}
const getRawDataDumps = async (req, res) =>{
    let arr = []
    const surveys = await Surveyschedules.find()
    await Promise.all(surveys.map(async (items) => {
        await Promise.all(items.branchRetailerDetails.map(async (brData) => {
                const data = {_id:items._id,
                active:items.active,
                cityId:items.cityId[0],
                clientId:items.clientId,
                countryId:items.countryId,
                isDeleted:items.isDeleted,
                scheduleDate:items.scheduleDate,
                scheduleId:items.scheduleId,
                userId:items.userId,
                surveyId:brData.surveyId,    
                channelId:brData.channelId, 
                isCompleted:brData.active,
                isApproved:brData.isCompleted,
                isRemoved:brData.isDeleted,
                day:items.day,
                month:items.month,
                sid:0,
                branchRetailerId:brData.storeId,
                retailerId:brData.retailerId,
                regionId:brData.regionId,
                }
                arr.push(data);
            }));
            return makeResponse(res, true, 200, true, 'Regions', 'surveyactivity Fetched successfully', arr);
    }));
    

       
}
const getCatRawDataDumps = async (req, res) =>{
    let arr = []
    let { limit, page } = req.body;
  limit = (!limit) ? parseInt(5000) : parseInt(limit)
  page = (!page) ? parseInt(0) : parseInt(page);
  let skip = limit * 13;
  console.log(skip,limit)
    const surveys = await Categoryactivities.find()
    // .skip(skip).limit(limit)
    console.log(surveys)
        await Promise.all(surveys.map(async (items) => {
        // await Promise.all(items.categoryPictures.map(async (brData) => {
            // console.log(items.categoryPictures)    
            const data = {
                    _id:items._id,
                isDeleted:items.isDeleted,
                userId:items.userId,
                pictures:JSON.stringify(items.categoryPictures),
                categoryActivityId:items.categoryActivityId,    
                surveyId:items.surveyId,    
                channelId:items.channelId, 
                branchRetailerId:items.branchRetailerId, 
                retailerId:items.retailerId,
                catId:items.catId,
                created: items.created
                }
                // console.log(data)
                arr.push(data);
            }));
            return makeResponse(res, true, 200, true, 'Regions', 'surveyactivity Fetched successfully', arr);
    // }));
    

       
}
const getCategoryRawDataDump = async (req, res) => {
    let todayDate = new Date("2021-06-02");
    let startdate = moment(todayDate, "DD-MM-YYYY").subtract(1, 'days').format('YYYY-MM-DD');
    let arr = [];
    let surveyIds = []
    console.log(startdate);
    const surveys = await Surveyschedules.find()
    await Promise.all(surveys.map(async (items) => {
        await Promise.all(items.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                let endDate = moment(brData.surveyDate).format('YYYY-MM-DD');
                const days = calculateDays(startdate, endDate);
                if (days == 0) {
                    surveyIds.push(brData.surveyId)
                }
            }
        }));
    }));
    console.log(surveyIds.length);
    
    // const countDocs = await Surveyactivities.count({surveyId:{$in:surveyIds}});
    await Categoryactivities.find({ surveyId: { $in: surveyIds } })
        .then(async (sa) => {
            await Promise.all(sa.map(async (item) => {

                const retailer = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.retailerId)},'retailerName').lean();
                const branchRetailer = await Branchretailers.findOne({_id:mongoose.Types.ObjectId(item.branchRetailerId)},'branchRetailerName').lean();
                 const data = {
                    retailerName: retailer ? retailer.retailerName : '',
                    branchRetailerName: branchRetailer ? branchRetailer.branchRetailerName : '',
                    id: item._id,
                    createdDate: moment(item.created).format('DD, MMM YYYY'),
                    categoryPictures1:item.categoryPictures[0] ? item.categoryPictures[0] : [],
                    categoryPictures2:item.categoryPictures[1] ? item.categoryPictures[1] : [],
                    categoryPictures3:item.categoryPictures[2] ? item.categoryPictures[2] : [],
                    categoryPictures3:item.categoryPictures[3] ? item.categoryPictures[3] : [],
                }
                arr.push(data);
            }));
            return makeResponse(res, true, 200, true, 'Regions', 'surveyactivity Fetched successfully', arr);

        })

}

const updatesurvey = async (req, res) => {
    const sku = await Skus.find().then(item => {
        Promise.all(item.map(ele => {
            count = [];
            Surveyactivities.updateOne(
                // _id: mongoose.Types.ObjectId(awnsers.surveyId),
                { "skuId": ele._id, sourceId: "0", segmentId: "0" },
                { $set: { "sourceId": ele.sourceId, "segmentId": ele.segmentId } },
                function (err, numAffected) {
                    console.log(numAffected);
                })
        }))

    })
}
const getRawDataforGraph = async (req, res) => {
    let todayDate = req.body.exportdate;
    let startdate = moment(todayDate, "YYYY-MM-DD").format('YYYY-MM-DD');
    let arr = [];
    let surveyIds = [];

    const surveys = await Surveyschedules.find()
    await Promise.all(surveys.map(async (items) => {
        await Promise.all(items.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                let endDate = moment(brData.surveyDate).format('YYYY-MM-DD');
                const days = calculateDays(startdate, endDate);
                if (days == 0) {
                    surveyIds.push(brData.surveyId)
                }
            }
        }));
    }));
    // const countDocs = await Surveyactivities.count({surveyId:{$in:surveyIds}});
    await Surveyactivities.find({ surveyId: { $in: surveyIds } })
        .then(async (sa) => {
            await Promise.all(sa.map(async (item) => {

                const channels = await Channels.findOne({ _id: { $in: item.channelId } }, 'channelName');
                const retailer = await Retailers.findOne({ _id: mongoose.Types.ObjectId(item.retailerId) }, 'retailerName');
                const branchRetailer = await Branchretailers.findOne({ _id: mongoose.Types.ObjectId(item.branchRetailerId) }, 'branchRetailerName');
                const region = await Regions.findOne({ _id: mongoose.Types.ObjectId(item.regionId) }, 'regionName');
                const cities = await Cities.findOne({ _id: mongoose.Types.ObjectId(item.cityId) }, 'cityName');
                const segment = await Segments.findOne({ _id: mongoose.Types.ObjectId(item.segmentId) }, 'segmentName');
                const sources = await Sources.findOne({ _id: mongoose.Types.ObjectId(item.sourceId) }, 'sourceName');
                const sku = await Skus.findOne({ _id: mongoose.Types.ObjectId(item.skuId) }, 'skuName');
                const brand = await Brands.findOne({ _id: mongoose.Types.ObjectId(item.brandId) }, 'brandName');
                const category = await Categories.findOne({ _id: mongoose.Types.ObjectId(item.catId) }, 'category');
                const data = {
                    channelName: channels.channelName,
                    retailerName: retailer.retailerName,
                    branchRetailerName: branchRetailer.branchRetailerName,
                    regionName: region.regionName,
                    cityName: cities.cityName,
                    segment: segment.segmentName,
                    source: sources.sourceName,
                    sku: sku ? sku.skuName : '',
                    brand: brand.brandName,
                    category: category.category,
                    available: item.available,
                    createdDate: moment(item.created).format('DD, MMM YYYY'),
                }
                arr.push(data);
            }));
            return makeResponse(res, true, 200, true, 'Regions', 'surveyactivity Fetched successfully', arr);

        })

}
function chunkArrayInGroups(arr, size) {
    var myArray = [];
    for (var i = 0; i < arr.length; i += size) {
        myArray.push(arr.slice(i, i + size));
    }
    return myArray;
}

const updatetable = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {
                // const skus = await Skus.findOne({_id:mongoose.Types.ObjectId(item.skuId)});
                //             skus.surveyActivities.push(item._id);
                //             const savedSku = skus.save().then(data =>{
                //                 console.log(data);
                //             });

                const channels = await Channels.findOne({ _id: mongoose.Types.ObjectId(item.channelId) });
                channels.surveyActivities.push(item._id);
                const savedChannels = channels.save().then(data => {
                    gagan.push(data._id)

                    console.log(gagan.length);
                });

                // const retailer = await Retailers.findOne({_id:mongoose.Types.ObjectId(item.retailerId)});
                // retailer.surveyActivities.push(item._id);
                // const savedRetailer = retailer.save();
                //     // console.log("branchRetailerId",req.body.branchRetailerId);
                // const branchRetailer = await Branchretailers.findOne({_id:mongoose.Types.ObjectId(item.branchRetailerId)});
                // branchRetailer.surveyActivities.push(item._id);
                // const savedBranchRetailer = branchRetailer.save();


                // const region = await Regions.findOne({_id:mongoose.Types.ObjectId(item.regionId)});
                // region.surveyActivities.push(item._id);
                // const savedRegion = region.save();

                // const city = await Cities.findOne({_id:mongoose.Types.ObjectId(item.cityId)});
                // city.surveyActivities.push(item._id);
                // const savedCity = city.save();

                // const segment = await Segments.find({_id:mongoose.Types.ObjectId(item.segmentId)});
                // segment.surveyActivities.push(item._id);
                // const savedSegment = segment.save();

                // const source = await Sources.find({_id:mongoose.Types.ObjectId(item.sourceId)});
                // source.surveyActivities.push(item._id);
                // const savedSource = source.save();

                // const brands = await Brands.findOne({_id:mongoose.Types.ObjectId(item.brandId)});
                // brands.surveyActivities.push(item._id);
                // const savedBrands = brands.save();

                // const category = await Categories.findOne({_id:mongoose.Types.ObjectId(item.catId)});
                // category.surveyActivities.push(item._id);
                // const savedCategory = category.save();

            }))

        })

    }))

}
const updatecategory = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {
                const category = await Categories.findOne({ _id: mongoose.Types.ObjectId(item.catId) });
                category.surveyActivities.push(item._id);
                const savedCategory = category.save().then(data => {
                    gagan.push(data._id)

                    console.log(gagan.length);
                });
            }))

        })

    }))

}
const updateretailer = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {
                const retailer = await Retailers.findOne({ _id: mongoose.Types.ObjectId(item.retailerId) });
                retailer.surveyActivities.push(item._id);
                const savedRetailer = retailer.save().then(data => {
                    gagan.push(data._id)

                    console.log(gagan.length);
                });
                // console.log("branchRetailerId",req.body.branchRetailerId);
            }))

        })

    }))

}
const updatebr = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {

                const branchRetailer = await Branchretailers.findOne({ _id: mongoose.Types.ObjectId(item.branchRetailerId) });
                branchRetailer.surveyActivities.push(item._id);
                const savedBranchRetailer = branchRetailer.save().then(data => {
                    gagan.push(data._id)

                    console.log(gagan.length);
                });
            }))

        })

    }))

}
const updateregion = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {



                const region = await Regions.findOne({ _id: mongoose.Types.ObjectId(item.regionId) });
                region.surveyActivities.push(item._id);
                const savedRegion = region.save().then(data => {
                    gagan.push(data._id)

                    console.log(gagan.length);
                });

            }))

        })

    }))

}
const updatecity = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {


                const city = await Cities.findOne({ _id: mongoose.Types.ObjectId(item.cityId) });
                city.surveyActivities.push(item._id);
                const savedCity = city.save().then(data => {
                    gagan.push(data._id)

                    console.log(gagan.length);
                });


            }))

        })

    }))

}
const updatesku = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {
                const skus = await Skus.findOne({ _id: mongoose.Types.ObjectId(item.skuId) });
                skus.surveyActivities.push(item._id);
                const savedSku = skus.save().then(data => {
                    gagan.push(data._id)

                    console.log(gagan.length);
                });


            }))

        })

    }))

}
const updatesegment = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {
                if (item.segmentId != 0) {
                    const segment = await Segments.findOne({ _id: mongoose.Types.ObjectId(item.segmentId) });
                    segment.surveyActivities.push(item._id);
                    const savedSegment = segment.save().then(data => {
                        gagan.push(data._id)

                        console.log(gagan.length);
                    });
                }

            }))

        })

    }))

}
const updatesource = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {

                const source = await Sources.findOne({ _id: mongoose.Types.ObjectId(item.sourceId) });
                source.surveyActivities.push(item._id);
                const savedSource = source.save().then(data => {
                    gagan.push(data._id)

                    console.log(gagan.length);
                });



            }))

        })

    }))

}
const updatebrand = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(1) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    let surveyIds = [];

    const surveys = await Surveyschedules.find({ isDeleted: false, "branchRetailerDetails.active": true, "branchRetailerDetails.isCompleted": true }).limit(limit).skip(skip)
    await Promise.all(surveys.map(async (item) => {
        await Promise.all(item.branchRetailerDetails.map(async (brData) => {
            if (brData.active === true && brData.isCompleted === true) {
                surveyIds.push(brData.surveyId);
            }

        }))
    }))

    // console.log(surveyIds);
    var mySlicedArray = chunkArrayInGroups(surveyIds, 7);
    console.log(mySlicedArray.length);
    console.log(mySlicedArray);
    var gagan = []
    await Promise.all(mySlicedArray.map(async (items) => {
        // console.log(items);
        await Surveyactivities.find({ surveyId: { $in: items } }).then(async (resp) => {
            // console.log(resp);
            await Promise.all(resp.map(async (item) => {

                const brands = await Brands.findOne({ _id: mongoose.Types.ObjectId(item.brandId) });
                brands.surveyActivities.push(item._id);
                const savedBrands = brands.save().then(data => {
                    gagan.push(data._id)

                    console.log(gagan.length);
                });

                // const category = await Categories.findOne({_id:mongoose.Types.ObjectId(item.catId)});
                // category.surveyActivities.push(item._id);
                // const savedCategory = category.save();

            }))

        })

    }))

}
const deletesurvey = async (req, res) => {
    Surveyactivities.remove({ userId: '6085515c6153c02840150411' }, function (err) {
        if (!err) {

        }
        else {
        }
    });
}
module.exports = {
    viewReports,
    viewCategoryReport,
    viewRegionReport,
    viewSegmentReport,
    viewRetailerReport,
    viewSourceReport,
    viewBranchReport,
    viewCityReport,
    viewBrandReport,
    viewChannelReport,
    viewSkuReport,
    viewCategoryPictures,
    getRawDataforGraph,
    getCategoryRawDataDump,
    getRawDataDump,
    getRawDataDumps,
    getCatRawDataDumps,
    updatesurvey,
    deletesurvey,
    updatetable,
    updatesku,
    updatebr,
    updateretailer,
    updateregion,
    updatecity,
    updatesegment,
    updatesource,
    updatebrand,
    updatecategory

}