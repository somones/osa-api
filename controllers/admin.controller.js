const express = require('express');
const router = express.Router();
const adminDao = require('../dao/admin.dao');
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

 router.post('/authenticate', adminDao.authenticate);
 router.post('/dashboard', adminDao.dashboard);

 router.post('/addnewsurvey', adminDao.addNewSurveySchedule);
 router.post('/updatesurvey', adminDao.updateSurvey);
 router.post('/manageschedules', adminDao.manageSchedules)
 router.post('/viewcorporations', adminDao.viewCorporations);
 router.post('/createcorporations', adminDao.createCorporations);
 router.post('/updatecorporations', adminDao.updateCorporations);
 router.post('/getretailers', adminDao.viewRetailers);
 router.post('/getbranchretailers', adminDao.viewBranchRetailers);

 router.get('/getusers', adminDao.viewUsers);
 router.get('/getcities', adminDao.getCityList);
 router.get('/getmyskulist', adminDao.getSkuList)
 router.get('/getcountrylist', adminDao.getCountryList)

 router.post('/approvedsurvey', adminDao.viewApprovedSurvey);
 router.post('/pendingsurvey', adminDao.pendingSurvey); 
 router.post('/pendingauditsurvey', adminDao.pendingAuditSurvey); 
 router.post('/archivedSurvey', adminDao.archivedSurvey)
 router.post('/approvesurvey', adminDao.approveSurvey);
 router.post('/discardsurvey', adminDao.discardSurvey);
 router.post('/updatetruesurveyactivity', adminDao.updateTrueSurveyActivity)
 router.post('/updatefalsesurveyactivity', adminDao.updateFalseSurveyActivity)
 router.post('/connectdetails', adminDao.connectDetails);
 router.post('/surveydetails', adminDao.surveyDetails);
 router.post('/updatependingsurvey',adminDao.updatependingSurvey)
router.post('/managecategorypictures', adminDao.manageCategoryPictures)
router.post('/deletepicture', adminDao.deletePictures)
router.post('/managepictures', adminDao.managePictures)


module.exports = router;