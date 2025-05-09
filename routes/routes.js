module.exports = function (app, base) {

    app.use('/users',require("../controllers/users.controller"));
    app.use('/sp',require("../controllers/staticpages.controller"));
    app.use('/',require("../controllers/dashboard.controller"));
    app.use('/api',require("../controllers/survey.controller"));
    app.use('/admin',require("../controllers/admin.controller"));
    app.use('/reports',require("../controllers/reports.controller"));
    app.use('/corporations',require("../controllers/corporations.controller"));
    app.use('/common',require("../controllers/common.controller"));

}