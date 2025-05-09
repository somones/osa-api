const Staticpages = require ('../models/staticpages');
const config = require('../config/config');
const moment = require('moment');
const { makeResponse } = require('../utils/utils');
const { v4: uuidv4 } = require('uuid');

const getStaticPages = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    
    Staticpages.aggregate([
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
      ]).then(areas => {
           res.status(200).json(areas);
       }).catch(err => {
           res.status(500).json({
               message: err.message || "Some error occurred while retrieving areas."
           });
       });
}
const createStaticPages = async(req, res)=>{
    let defaultId = uuidv4();
   //console.log(req.body)
        const staticpages = new Staticpages({
            _id: defaultId,
            pageId: defaultId,
            pageName: req.body.pageName,
            pageTitle: req.body.pageTitle,
            pageContent: req.body.pageContent,
            pageMetaTitle: req.body.pageMetaTitle,
            pageMetaDescription: req.body.pageMetaDescription,
            pageMetaKeywords: req.body.pageMetaKeywords,
            created:moment().format(),
            active:true,
            isDeleted:false,
         });

    // Save Wallet in the database
    staticpages.save()
        .then(data => {
            return makeResponse(res, true, 200, true, 'Static Pages', 'Static Pages Added successfully',data);
        }).catch(err => {
            let errorText = 'Some error occurred while creating the Static Pages.';
            return makeResponse(res, true, 500, false, errorText, err);
        });   
    
}
const updateStaticPages = async(req, res)=>{
    if (!req.body) {
        let errorText = 'Static Pages can not be empty.';
            return makeResponse(res, true, 400, false, errorText, errorText);
    }

    // Find Static Pages and update it with the request body
    Staticpages.find({pageId:req.body.pageId}).then(sp => {
        Staticpages.findByIdAndUpdate(sp[0]._id, {
            pageName: req.body.pageName,
            pageTitle: req.body.pageTitle,
            pageContent: [req.body.pageContent],
            pageMetaTitle: req.body.pageMetaTitle,
            pageMetaDescription: req.body.pageMetaDescription,
            pageMetaKeywords: req.body.pageMetaKeywords,
        }, { new: true })
            .then(response => {
                if (!response) {
                    let errorText = "Static Pages not found with id " + req.body.pageId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
                return makeResponse(res, true, 200, true, 'Static Pages', 'Static Pages updated successfully',response);
            })
    });
}
module.exports = {
    getStaticPages,
    updateStaticPages,
    createStaticPages
}