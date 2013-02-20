var express = require('express'),
    routes = require('./routes'),
    _ = require('underscore'),
    Q = require('q'),
    http = require('http'),
    app = express(),
    crypto = require('crypto'),
    sessionSecret = "palaver-chat is the best",
    sessionKey = "chat.palaver.io.sid",
    cookieParser = express.cookieParser(sessionSecret),
    mongoUrl = process.env.MONGOURL || 'mongodb://localhost:27017/palaver',
    MongoStore = require('connect-mongo')(express),
    sessionStore = new MongoStore({
      url: mongoUrl
    }),
    server = http.createServer(app),
    io = require('socket.io').listen(server),
    passport = require('passport'),
    flash = require('connect-flash'),
    utils = require('./lib/utils'),
    PalaverMongoChatRepository = require('palaver.io-mongorepo')(mongoUrl)
    authSetup = require('./lib/authSetup'),
    Palaver = require('palaver.io'),
    users = require('mongojs')(mongoUrl).collection('users'),
    chatRepo = new PalaverMongoChatRepository();// Palaver.MemoryChatRepository([], users);

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(cookieParser);
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ store: sessionStore, key: sessionKey }));
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.get('/', utils.ensureAuthenticated, routes.index);
function lookUpUser(username) {
  var deferred = Q.defer();
  users.findOne({ username: username }, utils.makeMongodbResolver(deferred));
  return deferred.promise;
};

function createUser(username, password) {
  var deferred = Q.defer();
  var salt = crypto.randomBytes(8).toString('hex');
  crypto.pbkdf2(password, salt, 1000, 20, deferred.makeNodeResolver());

  return deferred.promise.then( function(derivedKey) {
    var user = { username: username, salt: salt, password: derivedKey }
    var deferredInsert = Q.defer();

    users.insert(user, utils.makeMongodbResolver(deferredInsert));
    return deferredInsert.promise.then( function() { return user; });
  });
};

app.get('/register', routes.register );
app.post('/register', function (req,res) {
  routes.doRegister(req, res, lookUpUser, createUser);
});

app.get('/login', routes.login );
app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: true  }));

app.get('/logout', utils.ensureAuthenticated, function(req, res){
  req.logout();
  res.redirect('/');
});

Palaver(io, {
  chatRepository: chatRepo,
  sessionStore: sessionStore,
  sessionKey: sessionKey,
  sessionSecret: sessionSecret
});

authSetup(passport, chatRepo, io, {
  sessionKey: sessionKey,
  sessionStore: sessionStore,
  sessionSecret: sessionSecret
});

server.listen(process.env.PORT || 3000, process.env.IP || "127.0.0.1")

console.log("Express is listening");
