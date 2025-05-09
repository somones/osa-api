const express = require('express');
const router = express.Router();
const usersDao = require('../dao/users.dao');
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
router.post('/authenticate', usersDao.authenticate);
router.post('/register', usersDao.register);
router.post('/verify-account', usersDao.verifyaccount)
router.post('/registationemail', usersDao.registationEmail)

router.post('/forgetpassword', usersDao.forgetPassword);
router.post('/reset', usersDao.resetPassword)
router.post('/addprofiledetails', usersDao.addProfile);
router.post('/getusers', usersDao.getUsers);
router.post('/createusers', usersDao.createUsers);
router.post('/updateusers', usersDao.updateUsers);
router.post('/getprofiledetails',usersDao.getProfile);

router.post('/updateprofiledetails', usersDao.updateProfile);
router.post('/updateprofilepicture', usersDao.updateProfilePicture)
router.post('/deviceregistration',usersDao.deviceRegistration);
// router.post('/sendnotification', usersDao.sendNotification)
module.exports = router;