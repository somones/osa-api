const express = require('express');
const path = require('path');
const bodyparser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const mongoose = require('mongoose');
const config = require('./config/config');
const db = require('./config/database');
const flash = require('connect-flash');
const swaggerUi = require('swagger-ui-express'), swaggerDocument = require('./config/swagger');
const https = require('https');
const fs = require('fs');
var compression = require('compression')
const fileUpload = require('express-fileupload');
const httpLogger  = require("./middlewares/httpLogger");
const redis = require("redis");
const helmet = require("helmet");
const nocache = require("nocache");
const redisPort = 6379
// const client = redis.createClient(redisPort);
//Database Connect
mongoose.connect(db.database);

// client.on("error", (err) => {
//   console.log(err);
// });

mongoose.connection.on('connected', () => {
  console.log('connected to database' + db.database);
});

mongoose.connection.on('error', (err) => {
  console.log('Database Error' + err);
});

const app = express();
//security headers
//app.use(helmet());
//security headers
app.use(nocache());
app.use(fileUpload());
app.disable("x-powered-by");

app.use(cors());

app.use(httpLogger);

// COOKIE CONFIGS
var COOKIE_CONFIG = {
  setHeaders: function (res, path, stat) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
    res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
    res.setHeader("Expires", "0"); // Proxies.
    res.set(
      "Set-Cookie",
      cookie.serialize("scorecart", "node", {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 60, // 1 week, 2 months now
      })
    );
  },
};

app.use(compression())

//Port Number
const port = 3000;

app.use(function(req, res, next){
  req.setTimeout(0) // no timeout for all requests, your server will be DoS'd
  next()
})

//Connect Flash Middleware
app.use(flash());

//set static folder
app.use(express.static(path.join(__dirname, 'public')));

//Body Parser Middleware
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(bodyParser.json({limit: '100mb'}));

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.use('/pg-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

require('./config/passport')(passport);


//users route for cloud sourcing app
require('./routes/routes')(app, COOKIE_CONFIG);




//express will have knowledge that it's sitting behind a proxy and that the X-Forwarded-*
//header fields may be trusted,
//which otherwise may be easily spoofed.
app.set("trust proxy", 1);



//Index Route
app.get('/', (req, res) =>{
  console.log("Welcome to scorecarts");
});

// Start Server
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('death', function(worker) {
    console.log('worker ' + worker.pid + ' died');
  });
} else {
  console.log(`Worker ${process.pid} started`);
  // Worker processes have a http server.
  app.listen(port, ()=>{
    console.log('Server started on port ' + port);
  });
}



//for AWS Lambda
module.exports = app;
