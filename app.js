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
    users = [ ],
    memRepo = new Palaver.MemoryChatRepository([], users);

// Configuration
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    //    app.use(express.logger());
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

app.get('/logout', utils.ensureAuthenticated, function(req, res){
    req.logout();
    res.redirect('/');
});

app.get('/register', routes.register );
app.post('/register', function (req,res) {
    routes.doRegister(req, res, function (username) {
        return _.find(users, function (user) { return user.username === username });
    }, function (username, password) {
        var deferred = Q.defer();
        var salt = crypto.randomBytes(8).toString('hex');
        crypto.pbkdf2(password, salt, 1000, 20, deferred.makeNodeResolver());
        
        return deferred.promise.then( function(derivedKey) {
            var user = { username: username, salt: salt, password: derivedKey }
            users.push(user);
            return user;
        });
    });
});

app.get('/login', routes.login );
app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: true  }));

Palaver(io, {
    chatRepository: memRepo,
    sessionStore: sessionStore,
    sessionKey: sessionKey,
    sessionSecret: sessionSecret
});

authSetup(passport, memRepo, io, {
    sessionKey: sessionKey,
    sessionStore: sessionStore,
    sessionSecret: sessionSecret
});

server.listen(process.env.PORT || 3000, process.env.IP || "127.0.0.1")

//console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env)
console.log("Express is listening");
