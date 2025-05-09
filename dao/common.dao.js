const {
  getModelName,
  makeResponse } = require('./../utils/utils')

const changeStatus =  async (req, res) => {
  let { id, status, table } = req.body;
  if (id && table) {
    const modelData = await getModelName(req, id, status, table);
    var tableID = modelData.tableID;
    var tableStatus = modelData.tableStatus;
    var tableName = modelData.tableName;
    //console.log(modelData);
  }

  try {
    whereQeury = {
      [tableID]: id,
    };
    //console.log(status)
    status = status==true ? false : true;
    //console.log('new status',status)
    // first check if this record is exists
    await tableName.findByIdAndUpdate(id, {
        [tableStatus]: status
      }, { new: true })
      .then((data) => {
        return makeResponse(res, true, 200, true, 'Status Updated Successfully', 'Status Updated Successfully', data);        
      });
  } catch (error) {
     //console.log('Status error', error)
    res.json({
      type: "error",
      status: 400,
      msg: error,
      error,
    });
  }
};

const softDelete =  async (req, res) => {
  let { id, status, table } = req.body;
  if (id && table) {
    const modelData = await getModelName(req, id, status, table);
    var tableID = modelData.tableID;
    var tableSoftdelete = modelData.tableSoftdelete;
    var tableName = modelData.tableName;
  }

  try {
    whereQeury = {
      [tableID]: id,
    };
    status = status==true ? false : true;
   
    // first check if this record is exists
    await tableName.findByIdAndUpdate(id, {
        [tableSoftdelete]: status
      }, { new: true })
      .then((data) => {
        return makeResponse(res, true, 200, true, 'Content Deleted Successfully', 'Content Deleted Successfully', data);
            });
        
      
  } catch (error) {
    res.json({
      type: "error",
      status: 400,
      msg: error,
      error,
    });
  }
};
const uploadImageToAWS =  async (req, res) => {
  const imageB64 = req.body.b64;
  if (!imageB64) {
    return res.status(401).json({
      type: "error",
      msg: "Base 64 not provided",
    });
  }
  try {
    // //console.log(imageB64);
    const imageName = await common.uploadImgOnAWS(imageB64);
    return res.json({
      type: "data",
      image: imageName,
    });
  } catch (error) {
    // //console.log('er ', error)
    return res.status(500).json({
      type: "error",
      msg: "Error uploading file...!!!",
      error,
    });
  }
};
module.exports = {
  softDelete,
  changeStatus,
  uploadImageToAWS
}
