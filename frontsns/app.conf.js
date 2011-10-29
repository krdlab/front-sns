module.exports = {
  base_url: '***',
  session_secret: '***',

  redis: {  // read DotCloud configuration
    host: '***',
    port: '***',
    pass: '***'
  },
  token: {
    cipher_algorithm: 'aes-256-cbc',
    cipher_password:  '***' // crypto 用
  },
  twitter: {
    consumer_key:    '***',
    consumer_secret: '***'
  },
  facebook: {
    consumer_key:    '***',
    consumer_secret: '***'
  }
};
