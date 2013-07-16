
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , fs = require('fs')
  , nano = require('nano')('http://localhost:5984')
  , db = nano.use('thmcards')
  , _ = require('underscore')
  , passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy
  , GoogleStrategy = require('passport-google').Strategy;
  ;

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon(__dirname + '/public/img/favicon.ico'));
  //app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'thissecretrocks' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.set("GOOGLE_AUTH_RETURNURL", "http://localhost:" + (process.env.PORT || 3000) + "/auth/google/callback");
  app.set("GOOGLE_AUTH_REALM", "http://localhost:" + (process.env.PORT || 3000) + "/");
  app.use(express.errorHandler());
});

app.configure('production', function() {
  app.set("GOOGLE_AUTH_RETURNURL", "http://thmcards.nodejitsu.com/auth/google/callback");
  app.set("GOOGLE_AUTH_REALM", "http://thmcards.nodejitsu.com/");


  var GOOGLE_AUTH_REALM = "http://thmcards.nodejitsu.com";
  /*app.use(function(req, res, next) {
      if(!req.secure && process.env.NODE_ENV == 'production') {
        return res.redirect('https://' + req.get('Host') + req.url);
      }
      next();
    });*/
})

//------------------------------------------------------------------------------------
//-----------------------       LOGIN & AUTH       -----------------------------------
//------------------------------------------------------------------------------------
passport.serializeUser(function(user, done) {
  console.log("user", user);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, user);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { 
    return next(null); 
  }

  if(req.url != '/') {
    res.send(401);
  } else {
    res.redirect('/login');
  }
}

var User = {};
User.findOrCreate = function(profile, done) {
  console.log("PROFILE", profile);
  db.view('users', 'by_provider_and_username', { key: new Array(profile.provider, profile.username) }, function(err, body) {
      
      if(body.rows.length > 0) {
        var user = _.map(body.rows, function(doc) { return doc.value});
        return done(err, user);
      } else {
        db.insert(
          { 
            "provider": profile.provider,
            "username": profile.username || null,
            "name": profile.displayName || null,
            "email": profile.emails[0].value || null,
            "type": "user"
          }, 
          function(err, body, header){
            if(err) {
              console.log('[db.insert] ', err.message);
              return;
            }
            db.get(body.id, { revs_info: false }, function(err, body) {
              if(err) {
                console.log('[db.get] ', err.message);
                return;
              }
              var user = body;
              return done(err, user);
            });
        }); 
      }
  });
};

passport.use(new FacebookStrategy({
    clientID: "479179358837571",
    clientSecret: "9af20c0ab66f8c5ba6f8d714b339be23",
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    return User.findOrCreate(profile, done);
  }
));

passport.use(new TwitterStrategy({
  consumerKey: "1Icj0eY0NYmUoMSiGA",
  consumerSecret: "wsgFgVlT2p1R41rr1EYeUm6PqBwfqA3DIgtgC0h6c",
  callbackURL: "http://localhost:3000/auth/twitter/callback"
},
function(token, tokenSecret, profile, done) {
  return User.findOrCreate(profile, done);
}));

passport.use(new GoogleStrategy({
    returnURL: app.get("GOOGLE_AUTH_RETURNURL"),
    realm: app.get("GOOGLE_AUTH_REALM")
  },
  function(identifier, profile, done) {
    profile.openID = identifier;
    profile.provider = "google";
    profile.username = profile.emails[0].value;
    return User.findOrCreate(profile, done);
  }
));

app.get('/login', function(req, res) {
  if(req.isAuthenticated()) res.redirect('/');

  fs.readFile(__dirname + '/views/welcome.html', 'utf8', function(err, text){
    res.send(text);
  });
});

app.get('/auth/twitter',
  passport.authenticate('twitter'));

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email, user_about_me'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/auth/google', passport.authenticate('google'));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/whoami', ensureAuthenticated, function(req, res) {
  var user = {
    "username": req.session["passport"]["user"][0].username,
    "email":  req.session["passport"]["user"][0].email,
    "name": req.session["passport"]["user"][0].name
  }
  res.set('Content-Type', 'text/json');
  res.send(JSON.stringify(user));
});

//------------------------------------------------------------------------------------

app.get('/', ensureAuthenticated, function(req, res){
  fs.readFile(__dirname + '/views/index.html', 'utf8', function(err, text){
        res.send(text);
    });
});

app.get('/set/:id/card', function(req, res){
  db.view('cards', 'by_set', { key: new Array(req.params.id) }, function(err, body) {
    
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return doc.value});
      res.send(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
    }
  });
});

app.get('/set/:id', function(req, res){
  db.view('sets', 'by_id', { key: new Array(req.params.id) }, function(err, body) {
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return doc.value});
      console.log(docs);
      res.send(docs[0]);
    } else {
      console.log("[db.sets/by_id]", err.message);
    }
  });
});

app.get('/set', ensureAuthenticated, function(req, res){

  console.log("twitter", req.session["twitter"]);
  console.log("passport", req.session["passport"]["user"]);
  console.log("session", req.session);


  db.view('sets', 'by_name', function(err, body) {
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return doc.value});
      console.log(docs);
      res.send(docs);
    } else {
      console.log("[db.sets/by_name]", err.message);
    }
  });

});

app.post('/set/', ensureAuthenticated, function(req, res){
  var time = new Date().getTime();

  db.insert(
    { 
      "created": time,
      "owner": req.session["passport"]["user"][0].username,
      "name": req.body.name,
      "description": req.body.description,
      "visibility": req.body.visibility,
      "type": "set"
    }, 
    function(err, body, header){
      if(err) {
        console.log('[db.insert] ', err.message);
        return;
      }
      db.get(body.id, { revs_info: false }, function(err, body) {
        if (!err)
          //console.log(body);
          res.send(body);
      });
  });  
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
