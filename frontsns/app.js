
// app. configuration
var conf = require('./app.conf');

// DotCloud configuration
var fs  = require('fs');
var env = JSON.parse(fs.readFileSync('/home/dotcloud/environment.json', 'utf-8'));
conf.redis.host = env['DOTCLOUD_DATA_REDIS_HOST'];
conf.redis.port = env['DOTCLOUD_DATA_REDIS_PORT'];
conf.redis.pass = env['DOTCLOUD_DATA_REDIS_PASSWORD'];

// boot app.
var app = require('./app.express')(conf);
require('./app.socketio')(app);
app.listen(8080);

console.log("Express server listening on port %d in %s mode"
          , app.address().port
          , app.settings.env);

// cleanup
process.on('SIGTERM', function() {
  // TODO cleanup
  process.exit(0);
});
