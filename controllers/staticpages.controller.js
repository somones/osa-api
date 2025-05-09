const express = require('express');
const router = express.Router();
const staticPagesDao = require('../dao/staticpages.dao');
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

router.post('/getstaticpages', staticPagesDao.getStaticPages);
router.post('/updatestaticpages', staticPagesDao.updateStaticPages);
router.post('/createstaticpages', staticPagesDao.createStaticPages);




module.exports = router;