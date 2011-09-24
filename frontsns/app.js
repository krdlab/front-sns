var express = require('express');
var Redis   = require('connect-redis')(express);
var fs      = require('fs');
var crypto  = require('crypto');
var oauth   = require('oauth');
var conf    = require('./app.conf');

var env = JSON.parse(fs.readFileSync('/home/dotcloud/environment.json', 'utf-8'));

var cipher_token = function(token) {
  var cipher = crypto.createCipher(conf.token.cipher_algorithm,
                                   conf.token.cipher_password);
  var cip = cipher.update(token, 'utf8', 'hex');
  cip += cipher.final('hex');
  return cip;
};

var decipher_token = function(token) {
  var decipher = crypto.createDecipher(conf.token.cipher_algorithm,
                                       conf.token.cipher_password);
  var dec = decipher.update(token, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
};

var app   = module.exports = express.createServer();
var redis = new Redis({
  host: env['DOTCLOUD_DATA_REDIS_HOST'],
  port: env['DOTCLOUD_DATA_REDIS_PORT'],
  pass: env['DOTCLOUD_DATA_REDIS_PASSWORD']
});

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view options', { layout: false });
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: 'frontsns dummy secret',  // TODO
    store:  redis
  }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function() {
  app.use(express.errorHandler()); 
});

app.dynamicHelpers({
  session: function(req, res) {
    return req.session;
  }
});

app.get('/', function(req, res) {
  res.render('home');
});

var Twitter = require('twitter');
var newTwit = function(conf, session) {
  return new Twitter({
    consumer_key:        conf.twitter.consumer_key,
    consumer_secret:     conf.twitter.consumer_secret,
    access_token_key:    decipher_token(session.twitter.access_token),
    access_token_secret: decipher_token(session.twitter.access_token_secret)
  });
};

app.post('/post_message', function(req, res) {
  res.contentType('application/json');
  var session  = req.session;
  var services = req.param('services') || [];
  var message  = req.param('user_message');
  if (services.length < 1) {
    res.send({ error: 'no service' });
  } else if (!message) {
    res.send({ error: 'no message' });
  } else {
    services.forEach(function(service) {
      if (service === 'twitter') {
        if (session.twitter && session.twitter.access_token) {
          newTwit(conf, session).updateStatus(message, function(data) {
            res.send({ result: data });
          });
        } else {
          res.send({ error: 'no access token' });
        }
      } else if (service === 'facebook') {
        // TODO
      }
    });
  }
});

app.get('/home_timeline', function(req, res) {
  var service = req.param('service');
  var session = req.session;
  if (service === 'twitter') {
    if (session.twitter && session.twitter.access_token) {
      var twit = newTwit(conf, session);
      var num = Number(req.param('num'));
      twit.get('/statuses/home_timeline.json', { count: num }, function(data) {
        res.contentType('application/json');
        res.send(data);
      });
    } else {
      res.send({ error: 'no access token' });
    }
  } else if (service === 'facebook') {
    // TODO
  }
});

app.post('/signout', function(req, res) {
  var service = req.param('service');
  delete req.session[service];
  res.contentType('application/json');
  res.send({ result: 'deleted' });
});

var url = require('url');

app.get('/auth/twitter', function(req, res) {
  var base_url = conf.base_url;
  var home_url = base_url;

  var twitter = new oauth.OAuth('https://api.twitter.com/oauth/request_token',
                        'https://api.twitter.com/oauth/access_token',
                        conf.twitter.consumer_key, conf.twitter.consumer_secret,
                        '1.0',
                        base_url + url.parse(req.url).pathname,
                        'HMAC-SHA1');

  if (req.session.twitter && req.query.oauth_token && req.query.oauth_verifier) {
    delete req.session.twitter;
    twitter.getOAuthAccessToken(
      req.query.oauth_token,
      req.query.oauth_verifier,
      function(err, access_token, access_token_secret, results) {
        if (err) {
          console.log(require('util').inspect(err));
          throw err; // TODO
        }
        req.session.twitter = {
          access_token: cipher_token(access_token),
          access_token_secret: cipher_token(access_token_secret),
          info: {
            user_id: results.user_id,
            screen_name: results.screen_name
          }
        };
        // TODO 成功時の処理
        // 処理が終わったらホームへリダイレクト
        res.redirect(home_url);
      }
    );
  } else {
    twitter.getOAuthRequestToken(function(err, oauth_token, oauth_token_secret, results) {
      if (err) {
        console.log(require('util').inspect(err));
        throw err; // TODO
      }
      req.session.twitter = {
        request_token:         oauth_token,
        request_token_secret:  oauth_token_secret,
        request_token_results: results
      };
      res.redirect(twitter.signUrl(
          'https://api.twitter.com/oauth/authorize',
          oauth_token, oauth_token_secret));
    });
  }
});

app.listen(8080);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

var io = require('socket.io').listen(app);
io.on('connection', function(socket) {
  var pusher = setInterval(function() {
    var tweet = { text: 'テスト' };
    socket.send(tweet);
  }, 1000);

  socket.on('disconnect', function() {
    clearInterval(pusher);
    console.log('clearInterval');
  });
});

process.on('SIGTERM', function() {
  // TODO cleanup
  process.exit(0);
});

