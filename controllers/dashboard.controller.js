const express = require('express');
const router = express.Router();
const dashboardDao = require('../dao/dashboard.dao');
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
router.post('/dashboard', dashboardDao.dashboard);

module.exports = router;