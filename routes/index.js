var Q = require('q');

exports.index = function(req, res) {
  res.render('index', { title: "palaver" });
};

exports.login = function(req, res) {
	res.render('login', { title: "palaver > login", message: req.flash('error') });
};

exports.register = function(req, res) {
	res.render('register', { title: "palaver > register", message: req.flash('error') });
};

exports.doRegister = function(req, res, userLookUp, userCreate) {
  if(!req.body.username || !req.body.password || !req.body.confirmPassword) {
	    res.render('register', 
              { title: "palaver > register", message: "Please fill out all three fields in order to register" });
      return;
  }

  Q.when(userLookUp(req.body.username), function (user) {
      if(user) {
	        res.render('register', 
              { title: "palaver > register", message: "Username already taken" });
      }
      else if(req.body.password === req.body.confirmPassword) {
          Q.when(userCreate(req.body.username, req.body.password), function (user){
              req.login(user, function(err) { 
                  return res.redirect('/'); 
              });
              return;
          });
      }
      else {
	        res.render('register', 
              { title: "palaver > register", message: "Passwords must match" });
      }

      return;
  }).fail(function (err) {
          console.log('Error while registering: ', err);
	        res.render('register', 
              { title: "palaver > register", message: "Error while registering, please try again." });
  });
};
