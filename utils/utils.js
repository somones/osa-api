/**
 * Logs Function and response Function
 * @author Gagandeep Lamba
 * @version 1.0.0, 11/09/2020
 */
const path = require("path");
const fs = require("fs");
const moment = require("moment");
const Corporation = require('../models/corporation');
const Users = require('../models/user');
const Surveyschedules = require('../models/surveyschedules')
const makeResponse = (
  res,
  apiStatus,
  resStatus,
  success,
  title,
  message,
  result = [],

) => {
  if (success == false) {
    let errorMessage = message;

    res
      .status(resStatus)
      .json({
        // status: apiStatus,
        code: 200,
        success: success,
        // title: title || "",
        // message: message || "",
        errorMessage
      })
      .end();
  } else {
    res
      .status(resStatus)
      .json({
        // status: apiStatus,
        code: resStatus || 200,
        success: success || "success",
        data:{
          title: title || "",
          message: message || "",
          result,
        }
      })
      .end();
  }
};
const getModelName = async (req, id, status, table) =>{

  switch (table) {
    case "corporation":
      tableID = "_id";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = Corporation;
      break;
    case "users":
      tableID = "_id";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = Users;
      break; 
    case "areas":
      tableID = "areaId";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = Area;
      break;
    case "retailerlists":
      tableID = "retailerId";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = RetailerList;
      break;
    case "stores":
      tableID = "storeId";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = Store;
      break;
    case "retailertypes":
      tableID = "storeSizeId";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = RetailerType;
      break;
    case "brands":
      tableID = "brandId";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = Brands;
      break;
    case "categories":
      tableID = "categoryId";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = Categories;
      break;
    case "subcategories":
      tableID = "subCategoryId";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = Subcategories;
      break;
    case "subsubcategories":
      tableID = "subSubCategoryId";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = Subsubcategories;
      break;
    case "surveyschedules":
      tableID = "_id";
      tableStatus = "active";
      tableSoftdelete = "isDeleted"
      tableName = Surveyschedules;
      break;
  }
  return obj = {
      tableID,
      tableStatus,
      tableSoftdelete,
      tableName
  }

}
module.exports = {
  makeResponse,
  getModelName
};
