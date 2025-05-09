const Blogs = require ('../models/blogs');
const config = require('../config/config');
const { v4: uuidv4 } = require('uuid');
var AWS = require('aws-sdk');
const moment = require('moment');
const { makeResponse } = require('../utils/utils');

const getBlogs = async (req, res) => {
    let { limit, page } = req.body;
    limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
    page = (!page) ? parseInt(0) : parseInt(page);
    let skip = limit * page;
    
    Blogs.aggregate([
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
      ]).then(blogs => {
           res.status(200).json(blogs);
       }).catch(err => {
           res.status(500).json({
               message: err.message || "Some error occurred while retrieving areas."
           });
       });
}

const createBlogs = async(req, res)=>{
    
        let defaultId = uuidv4();
        const blogs = new Blogs({
            _id: defaultId,
            blogsId: defaultId,
            brandName: req.body.brandName,
            brandHeading: req.body.brandHeading,
            brandLogo: req.body.brandLogo,
            brandDescription: req.body.brandDescription,
            created:moment().format(),
            active:true,
            isDeleted:false,
         });

    // Save Wallet in the database
    blogs.save()
        .then(data => {
            return makeResponse(res, true, 200, true, 'Blogs', 'Blogs Added successfully',data);
        }).catch(err => {
            let errorText = 'Some error occurred while creating the Blogs.';
            return makeResponse(res, true, 500, false, errorText, err);
        });   
    
}
const updateBlogs = async(req, res) =>{
    
            Blogs.find({blogsId:req.body.blogsId}).then(blog => {
                Blogs.findByIdAndUpdate(blog[0].blogsId, {
                brandName: req.body.brandName,
                brandHeading: req.body.brandHeading,
                brandLogo: req.body.brandLogo!='' ? req.body.brandLogo : blog[0].brandLogo,
                brandDescription: req.body.brandDescription,
            }, { new: true })
            .then(blogs => {
                if (!blogs) {
                    let errorText = "Blog not found with id " + req.body.blogId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
                return makeResponse(res, true, 200, true, 'Blog', 'Blog updated successfully',blogs);
            }).catch(err => {
                if (err.kind === 'ObjectId') {
                    let errorText = "Blog not found with id " + req.body.blogId;
                return makeResponse(res, true, 404, false, errorText, errorText);
                }
                let errorText = "Error updating Blog with id " + req.body.blogId;
                return makeResponse(res, true, 500, false, errorText, errorText);
                });
            });
    
    
}
module.exports = {
    getBlogs,
    createBlogs,
    updateBlogs
}