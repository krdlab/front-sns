module.exports = function(conf) {
  var crypto = require('crypto');

  var functions = {};

  functions.cipher_token = function(token) {
    var cipher = crypto.createCipher(conf.token.cipher_algorithm,
                                     conf.token.cipher_password);
    var cip = cipher.update(token, 'utf8', 'hex');
    cip += cipher.final('hex');
    return cip;
  };

  functions.decipher_token = function(token) {
    var decipher = crypto.createDecipher(conf.token.cipher_algorithm,
                                         conf.token.cipher_password);
    var dec = decipher.update(token, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  };

  return functions;
};
