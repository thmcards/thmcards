
/**
 * Module dependencies.
 */
if(!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

var express = require('express')
  , crypto = require('crypto')
  , jws = require('jws')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , fs = require('fs')
  , nconf = require('nconf').file(process.env.NODE_ENV+'_settings.json')
  , nano = require('nano')(nconf.get('couchdb'))
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
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: "averysecretsecret", maxAge: Date.now() + (30 * 86400 * 1000) }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.configure('production', function() {
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
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, user);
});

function ensureAuthenticated(req, res, next) {
  
  if (req.isAuthenticated()) {
    var user = _.first(req.session.passport.user);

    var cookie = req.cookies.usr;
    if (cookie === undefined)
    {
      var usr = JSON.stringify({
        "id": user._id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "provider": user.provider
      });
      res.cookie('usr', usr, { httpOnly: false });
    }

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
            "email": _.first(profile.emails) || null,
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
    clientID: nconf.get("facebook_clientid"),
    clientSecret: nconf.get("facebook_clientsecret"),
    callbackURL: nconf.get('facebook_callback')
  },
  function(accessToken, refreshToken, profile, done) {
    return User.findOrCreate(profile, done);
  }
));

passport.use(new TwitterStrategy({
  consumerKey: nconf.get("twitter_key"),
  consumerSecret: nconf.get("twitter_secret"),
  callbackURL: nconf.get('twitter_callback')
},
function(token, tokenSecret, profile, done) {
  return User.findOrCreate(profile, done);
}));

passport.use(new GoogleStrategy({
    returnURL: nconf.get("google_callback"),
    realm: nconf.get("google_realm")
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
  res.clearCookie('usr');
  res.redirect('/');
});

app.get('/whoami', ensureAuthenticated, function(req, res) {
  var user = {
    "username": req.session.passport.user.username,
    "email":  req.session.passport.user.email,
    "name": req.session.passport.user.username
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

app.get('/test', function(req, res){
  db.view('cards', 'personal_card', function(err, body) {
    var sets = _.filter(body.rows, function(row){ return ((row.key[1] == 0) && ( row.value.owner == req.session["passport"]["user"][0].username )); })

    _.each(sets, function(set){      
      var cardCnt = _.filter(body.rows, function(row){ return ((row.key[1] == 1) && (row.value.cardId == set.value._id)); });
      set.value.cardCnt = cardCnt;
    }, this);
    sets = _.pluck(sets, "value");

    console.log(sets);

    res.json(_.sortBy(sets, function(set){ return set.name }));
  });
});


app.get('/set/:id/card', function(req, res){
  db.view('cards', 'by_set', { key: new Array(req.params.id) }, function(err, body) {
    
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return doc.value});
      res.json(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
    }
  });
});

app.get('/set/:id', function(req, res){
  db.view('sets', 'by_id', { key: new Array(req.params.id) }, function(err, body) {
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return doc.value});
      res.json(docs[0]);
    } else {
      console.log("[db.sets/by_id]", err.message);
    }
  });
});

app.get('/set', ensureAuthenticated, function(req, res){
  db.view('sets', 'by_id_with_cards', function(err, body) {
    var sets = _.filter(body.rows, function(row){ return ((row.key[1] == 0) && ( row.value.owner == req.session["passport"]["user"][0].username )); })

    _.each(sets, function(set){      
      var cardCnt = _.filter(body.rows, function(row){ return ((row.key[1] == 1) && (row.value.setId == set.value._id)); });
      set.value.cardCnt = cardCnt.length;
    }, this);
    sets = _.pluck(sets, "value");

    res.json(_.sortBy(sets, function(set){ return set.name }));
  });
});

app.get('/user/:id', ensureAuthenticated, function(req, res){
  db.view('users', 'by_id', { key: new Array(req.params.id) }, function(err, body) {
    var userInfo = body.rows[0].value;

    var emailHash = crypto.createHash('md5').update(userInfo.email.value.toLowerCase()).digest("hex")
    
    var gravatarUrl = "http://www.gravatar.com/avatar/" + emailHash + "?s=40";
    userInfo.gravatarUrl = gravatarUrl;

    res.json(userInfo);
  });
});

app.post('/set', ensureAuthenticated, function(req, res){
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
          res.json(body);
      });
  });  
});

app.post('/card', ensureAuthenticated, function(req, res){
  var time = new Date().getTime();

  db.insert(
    { 
      "created": time,
      "owner": req.session["passport"]["user"][0].username,
      "setId": req.body.setId,
      "front": req.body.front,
      "back": req.body.back,
      "type": "card"
    }, 
    function(err, body, header){
      if(err) {
        console.log('[db.insert] ', err.message);
        return;
      }
      db.get(body.id, { revs_info: false }, function(err, body) {
        if (!err)
          res.json(body);
      });
  });  
});

app.get('/badge', function(req, res) {
  var data = { 
  "uid": "f2c20",
  "recipient": {
    "type": "email",
    "hashed": false,
    "identity": "dan.knapp@web.de"
  },
  "image": "http://thmcards.jit.su/badges/test-badge.png",
  "evidence": "http://thmcards.jit.su/badges/beths-robot-work.html",
  "issuedOn": 1359217910,
  "badge": "http://thmcards.jit.su/badges/test-badge.json",
  "verify": {
    "type": "signed",
    "url": "http://thmcards.jit.su/public.pem"
  }
};

  var signature = jws.sign({
    header: { alg: 'hs256'},
    payload: data,
    secret: fs.readFileSync('private.pem')
  });

  console.log(signature);

});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
