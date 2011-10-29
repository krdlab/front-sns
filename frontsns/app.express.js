module.exports = function(conf) {
  var express = require('express');
  var Redis   = require('connect-redis')(express);

  var app   = express.createServer();
  var redis = new Redis({ host: conf.redis.host
                        , port: conf.redis.port
                        , pass: conf.redis.pass });

  app.configure(function() {
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({ secret: conf.session_secret
                            , store:  redis }));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
  });

  app.configure('development', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  });

  app.configure('production', function() {
    app.use(express.errorHandler()); 
  });

  // routing

  var handlers = require('./lib/handlers')(conf);

  // authentication and authorization
  app.get('/auth/twitter',  handlers.auth_twitter);
  app.get('/auth/facebook', handlers.auth_facebook);

  // GET
  app.get('/user_info',     handlers.user_info);
  app.get('/home_timeline', handlers.home_timeline);

  // POST
  app.post('/post_message', handlers.post_message);
  app.post('/signout',      handlers.signout);

  return app;
};
