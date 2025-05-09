const express = require('express');
const router = express.Router();
const surveyDao = require('../dao/survey.dao');
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

 router.post('/getsurveyschedules', surveyDao.getSurveySchedules);
 router.post('/getsurveys', surveyDao.getSurvey);
//  router.post('/getsurveysallusers', surveyDao.getSurveyAllUsers);
//  router.post('/getsurveysbyuser', surveyDao.getSurveyByUser);
 router.post('/surveysubmission', surveyDao.surveySubmission);
 router.post('/surveyhistory', surveyDao.surveyHistory);
 router.post('/termsandcondtions', surveyDao.termsAndCondtions);
 router.post('/connect', surveyDao.connect);
 router.post('/createsegment', surveyDao.createsegments);

 router.post('/aboutus', surveyDao.aboutUs);
 router.post('/logout', surveyDao.logout);
 /*------------------------------------------------------------ */
 
 router.post('/managesurvey', surveyDao.manageSurvey);
 router.post('/addnewsurvey', surveyDao.addNewSurveySchedule);
 router.post('/updatesurvey', surveyDao.updateSurvey);
 router.post('/addnewquestions', surveyDao.addNewQuestion);
 router.post('/viewsurvey', surveyDao.viewSurvey);
 router.post('/viewapprovedsurvey', surveyDao.viewApprovedSurvey);
 router.post('/pendingsurvey', surveyDao.pendingSurvey); 
 router.post('/approvesurvey', surveyDao.approveSurvey);
 router.post('/viewsupports', surveyDao.connectDetails);
 router.post('/surveydetails', surveyDao.surveyDetails)
 router.post('/getallagents', surveyDao.getAllAgents)


module.exports = router;