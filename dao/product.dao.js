const Product = require('../models/product')
const config = require('../config/config')
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  scKeyID: "AKIA3E7RFJVQIQM2X4MG",
  scKey: "84Oie3UaJxw/S6p4NGf6HhTdYlYaAoiZ6ItT5Drz",
  Bucket: "uat-fc-aggregator-frontend",
  signatureVersion: "v4",
  region: "us-east-1",

  //s3_host_name: "https://s3-us-east-1.amazonaws.com"
});

const getAll = async (req, res)=>{
  let { limit, page } = req.body;
  limit = (!limit) ? parseInt(config.pageLimit) : parseInt(limit)
  page = (!page) ? parseInt(0) : parseInt(page);
  let skip = limit * page;
  
  Product.aggregate([
         { $match: { 'isDeleted': 'false' } },
        {$facet:{
           "stage1" : [ {"$group": {_id:null, count:{$sum:1}}} ],  
           "stage2" : [ { "$skip": skip}, {"$limit": limit} ]
         }},
        {$unwind: "$stage1"},
        {$project:{
           count: "$stage1.count",
           data: "$stage2"
        }}  
    ]).then(products => {
         res.status(200).json(products);
     }).catch(err => {
         res.status(500).json({
             message: err.message || "Some error occurred while retrieving products."
         });
     });
}

const create = async (req, res) => {
  const params = {
    Bucket: "uat-fc-aggregator-frontend",
    Key: `FrontEnd-logs/${_module}/${_folder}/${_filename}_${dateString}.${_extension}`, // File name you want to save as in S3
    Body: _data,
    // ACL:"public-read",
    ContentDisposition: "inline",
    ContentType: `text/html`,
    // ContentType: "application/octet-stream"
  };
  let data;
  try {
    data = await s3.upload(params).promise();
    logLocation = data.Location;
  } catch (e) {
    //console.log(e);
  }
  //console.log(`File uploaded successfully. ${data.Location}`);
}
module.exports = {
  getAll,
  create
}