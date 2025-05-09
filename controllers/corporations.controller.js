const express = require('express');
const router = express.Router();
const corporationsDao = require('../dao/corporations.dao');
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

 router.post('/authenticate', corporationsDao.authenticate);
 router.post('/dashboard', corporationsDao.dashboard);

 router.post('/addnewsurvey', corporationsDao.addNewSurveySchedule);
 router.post('/updatesurvey', corporationsDao.updateSurvey);
 router.post('/viewsurvey', corporationsDao.viewSurvey);
 router.post('/viewcorporations', corporationsDao.viewCorporations);
 router.get('/getusers', corporationsDao.viewUsers);
//  router.post('/getretailers', corporationsDao.viewRetailers);
 router.get('/getcities', corporationsDao.getCityList);
 router.post('/getbranchretailers', corporationsDao.viewBranchRetailers);

 router.post('/approvedsurvey', corporationsDao.viewApprovedSurvey);
 router.post('/pendingsurvey', corporationsDao.pendingSurvey); 
 router.post('/archivedSurvey', corporationsDao.archivedSurvey)
 router.post('/approvesurvey', corporationsDao.approveSurvey);
 router.post('/discardsurvey', corporationsDao.discardSurvey);
 
 router.post('/connectdetails', corporationsDao.connectDetails);
 router.post('/surveydetails', corporationsDao.surveyDetails)
 router.post('/getregions', corporationsDao.viewRegions);
 router.post('/getcities', corporationsDao.viewCities);
 router.post('/getchannels', corporationsDao.viewChannels);
 router.post('/getretailers', corporationsDao.viewRetailerFilter);
 router.post('/getbranchretailer', corporationsDao.viewBranchRetailerFilter);
 router.post('/getcategories', corporationsDao.viewCategoryFilter);
 router.post('/getbrands', corporationsDao.viewBrandFilter);
 router.post('/getskus', corporationsDao.viewSkuFilter);
 router.post('/getsegments', corporationsDao.viewSegmentFilter);
 router.post('/getsources', corporationsDao.viewSourceFilter);

 router.post('/submitsupportrequest', corporationsDao.support)



module.exports = router;