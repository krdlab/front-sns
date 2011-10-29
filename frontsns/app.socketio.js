// usage:
//   require('./server.socket')(app); <- 'app' is instance of express.

module.exports = function(app) {
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

};
