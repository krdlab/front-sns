module.exports = function(conf) {
  var crypto = require('./crypto.js')(conf);
  var oauth  = require('oauth');

  var handlers = {};

  handlers.user_info = function(req, res) {
    res.contentType('application/json');
    res.send({ id: '***', name: 'TODO' });
  };

  var Twitter = require('twitter');
  var newTwit = function(conf, session) {
    return new Twitter({
      consumer_key:        conf.twitter.consumer_key,
      consumer_secret:     conf.twitter.consumer_secret,
      access_token_key:    crypto.decipher_token(session.twitter.access_token),
      access_token_secret: crypto.decipher_token(session.twitter.access_token_secret)
    });
  };

  handlers.post_message = function(req, res) {
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
  };

  handlers.home_timeline = function(req, res) {
    res.contentType('application/json');
    var service = req.param('service');
    var session = req.session;
    if (service === 'twitter') {
      if (session.twitter && session.twitter.access_token) {
        var twit = newTwit(conf, session);
        var num = Number(req.param('num'));
        twit.get('/statuses/home_timeline.json', { count: num }, function(data) {
          res.send(data);
        });
      } else {
        res.send({ error: 'no access token' });
      }
    } else if (service === 'facebook') {
      if (session.facebook && session.facebook.access_token) {
        var facebook = new oauth.OAuth2(conf.facebook.consumer_key,
                                        conf.facebook.consumer_secret,
                                        'https://graph.facebook.com');
        facebook.get('https://graph.facebook.com/me/home'
                   , session.facebook.access_token
                   , function(err, data, response) {
          if (err) {
            console.warn(util.inspect(err));
            res.send({ error: err });
            return;
          }
          var json = JSON.parse(data);
          var result = [];
          json.data.forEach(function(one) {
            result.push({ screen_name: one.from.name, message: one.message });
          });
          res.send(result);
        });
      } else {
        res.send({ error: 'no access token' });
      }
    }
  };

  handlers.signout = function(req, res) {
    var service = req.param('service');
    delete req.session[service];
    res.contentType('application/json');
    res.send({ result: 'deleted' });
  };

  var url  = require('url');
  var util = require('util');

  handlers.auth_twitter = function(req, res) {
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
            console.warn(util.inspect(err));
            res.send(401);
            return;
          }
          req.session.twitter = {
            access_token:        crypto.cipher_token(access_token),
            access_token_secret: crypto.cipher_token(access_token_secret),
            info: {
              user_id:     results.user_id,
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
          console.warn(util.inspect(err));
          res.send(401);
          return;
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
  };

  handlers.auth_facebook = function(req, res) {
    var facebook = new oauth.OAuth2(conf.facebook.consumer_key,
                                    conf.facebook.consumer_secret,
                                    'https://graph.facebook.com');
    var redirect_uri = conf.base_url + url.parse(req.url).pathname;
    var home_url = conf.base_url;

    // TODO var async = require('async');
    var code = req.param('code');
    if (req.session.facebook && code) {
      delete req.session.facebook;
      facebook.getOAuthAccessToken(code,
                                   { redirect_uri: redirect_uri },
                                   function(err, access_token, refresh_token) {
        if (err) {
          console.warn(util.inspect(err));
          res.send(401);
          return;
        }
        facebook.get('https://graph.facebook.com/me', access_token, function(err, data, response) {
          if (err) {
            console.warn(util.inspect(err));
            res.send(401);
            return;
          }
          // 取得したユーザデータをセッションに積んで元のページに戻る
          var json = JSON.parse(data);
          req.session.facebook = {
            access_token: crypto.cipher_token(access_token),
            info: { user_id:     json.id
                  , screen_name: json.name }
          };
          res.redirect(home_url);
        });
      });
    } else {
      req.session.facebook = true;  // ここを経由したよ，という印
      res.redirect(facebook.getAuthorizeUrl({ redirect_uri: redirect_uri }));
    }
  };

  return handlers;
};
