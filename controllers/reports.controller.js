const express = require('express');
const router = express.Router();
const reportsDao = require('../dao/reports.dao');
const passport = require ('passport');

/**
 * @swagger
 * /users/authenticate:
 *   post:
 *    tags:
 *      - authenticate
 *    summary: authenticate for clould services
 *    description: authenticate for user
 *    consumes:
 *       - application/json
 *    produces:
 *      - application/json
 *    parameters:
 *      - in: body
 *        name: body
 *     description: Provide username and password to get access token and consume rest of the API's
 *        required: true
 *        schema:
 *          properties:
 *            username:
 *              type: string
 *            password:
 *              type: string
 *            rememberMe:
 *              type: boolean
 *              default: false
 *    responses:
 *      200:
 *        description: Return object
 *      400:
 *       description: Bad Request
 *      401:
 *        description: Not Authrized
 *      403:
 *        description: You do not have necessary permissions for the resource or JWT Expired
 *      500:
 *         description: Something went wrong
 */
router.post('/viewreports', reportsDao.viewReports)
router.post('/viewcategoryreport', reportsDao.viewCategoryReport)
router.post('/viewbrandreport', reportsDao.viewBrandReport)
router.post('/viewchannelreport', reportsDao.viewChannelReport)
router.post('/viewskureport', reportsDao.viewSkuReport)
router.post('/viewregionreport', reportsDao.viewRegionReport)
router.post('/viewsegmentreport', reportsDao.viewSegmentReport)
router.post('/viewsourcereport', reportsDao.viewSourceReport)
router.post('/viewcategorypictures', reportsDao.viewCategoryPictures)
router.post('/viewcityreport',reportsDao.viewCityReport)
router.post('/viewbranchreport',reportsDao.viewBranchReport)
router.post('/viewretailerreport',reportsDao.viewRetailerReport)
router.post('/updatesurvey', reportsDao.updatesurvey)
router.post('/getrawdata', reportsDao.getRawDataforGraph)
router.post('/getcategoryrawdata', reportsDao.getCategoryRawDataDump)
router.post('/getdumdata',reportsDao.getRawDataDump)
router.post('/deletesurvey',reportsDao.deletesurvey)
router.post('/updatetable', reportsDao.updatetable)
router.post('/updatesku', reportsDao.updatesku)
router.post('/updateretailer', reportsDao.updateretailer)
router.post('/updatebr', reportsDao.updatebr)
router.post('/updateregion', reportsDao.updateregion)
router.post('/updatecity', reportsDao.updatecity)
router.post('/updatesegment', reportsDao.updatesegment)
router.post('/updatebrand', reportsDao.updatebrand)
router.post('/updatesource', reportsDao.updatesource)
router.post('/updatecategory', reportsDao.updatecategory)

module.exports = router;