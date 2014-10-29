/**
 * Module dependencies.
 */
if(!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

var express = require('express')
  , crypto = require('crypto')
  , jws = require('jws')
  , http = require('http')
  , https = require('https')
  , path = require('path')
  , fs = require('fs')
  , Converter=require("csvtojson").core.Converter
  , parserMgr=require("csvtojson").core.parserMgr
  , date = require('date-utils')
  , helmet = require('helmet')
  , nconf = require('nconf').file(process.env.NODE_ENV+'_settings.json')
  , _ = require('underscore')
  , sanitizer = require('sanitizer')
  , passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy
  , GoogleStrategy = require('mybeat-passport-google-oauth').OAuth2Strategy
  , app = express()
  ;

//Wenn auf CloudControl
if(process.env.COUCH_URL){
    nconf.set('couchdb', process.env.COUCH_URL);
    nconf.set('cas_callback', process.env.CAS_CALLBACK_URL);
}
var nano = require('nano')(nconf.get('couchdb'));
db = nano.use('thmcards');

var secret = 'some secret';
var sessionKey = 'express.sid';
var cookieParser = express.cookieParser(secret);
var sessionStore = new express.session.MemoryStore();
var https_server, http_server, io;

if(process.env.NODE_ENV === 'production') {
  var options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
  };
  https_server = https.createServer(options, app);
  http_server = http.createServer(app);

  io = require('socket.io').listen(https_server, {secure: true});
} else {
  http_server = http.createServer(app);
  io = require('socket.io').listen(http_server);
}

function forceSSL(req, res, next) {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  return next(null);
}


app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon(__dirname + '/public/img/favicon.ico'));
  app.use(helmet.xframe());
  app.use(helmet.xssFilter());
  app.use(helmet.nosniff());
  app.use(helmet.hsts({ maxAge: 7776000000 }));
  app.use(helmet.hidePoweredBy());
  app.use(cookieParser);
  app.use(express.json());
  app.use(express.methodOverride());
  app.use(express.session({ store: sessionStore, key: sessionKey, cookie: { httpOnly: true } }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use((function(options) {
    var csrf = express.csrf(options);
    return function(req, res, next) {
      function onCsrfCalled() {
        var token = req.csrfToken();
        var cookie = req.cookies['csrf.token'];

        if(token && cookie !== token) {
          res.cookie('csrf.token', token);
        }
        res.header('Vary', 'Cookie');

        next();
      }
      csrf(req, res, onCsrfCalled);
    }
  })());
  app.use(app.router);
  app.use(express.compress());
  app.use(express.staticCache());
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: 86400000 }));
});

io.set('authorization', function(handshake, cb) {

  if(handshake.headers.cookie)
  {
    cookieParser(handshake, null, function(err) {
      
    if(handshake.signedCookies[sessionKey])
    {
      handshake.sessionID = handshake.signedCookies[sessionKey];
      handshake.sessionStore = sessionStore; //Session contstructor needs an Object with sessionStore set
      sessionStore.get(handshake.sessionID, function(err, session) {
        if(err)
        cb(err.message, false);
        else
        {
          var s = handshake.session = new express.session.Session(handshake, session);
          cb(null, true);
        }
      });
    }
    else cb('Session cookie could not be found', false);


    });
  }
  else cb('Session cookie could not be found', false);
});

io.sockets.on('connection', function(socket) {
  console.log('Socket connected with SID: ' + socket.handshake.sessionID, socket.store.id);
  socket.set('sessionID', socket.handshake.sessionID);
});

function getSocketBySessionID(sessionID) {
  var skt = null;
  
  _.each(io.sockets.clients(), function(socket) {
    if(sessionID == socket.store.data.sessionID) skt = socket;
  })
  return skt;
}

function checkOwner(doc_id, owner, success_callback, error_callback) {
  db.get(doc_id, function(err, body){
    if(_.has(body, "owner") && body.owner === owner) {
      success_callback();
    } else {
      error_callback();
    }
  });
}

var redeemXPoints = function(name, value, username) {
  var now = new Date().getTime();
  db.insert({
          type: "xp",
          name: name,
          value: value,
          gained: now,
          owner: username
        },    
        function(err, body) {
          if(!err && body.ok) {
            console.log("XP '"+name+" ("+value+")' redemmed for user '"+username+"'");
          } else {
            console.log("Wasn't able to redeem XP for user '"+username+"'");
          }
        });  
  }

var redeemLoginXPoints = function(username){
  var msPerDay = 86400 * 1000;
  var now = new Date().getTime();

  var todayStart = now - (now % msPerDay);
      todayStart += ((new Date).getTimezoneOffset() * 60 * 1000)
  var todayEnd = todayStart + (msPerDay-1000);

  db.view("xp", "by_owner_name_gained", { startkey: new Array(username, "daily_login", todayStart ), endkey: new Array(username, "daily_login", todayEnd)}, function(err, body){
    if(!err) {
      if(!_.isUndefined(body.rows) && body.rows.length > 0) {
        console.log("Daily Login XP ALREADY redemmed for user '"+username+"'");
      } else {
        db.insert({
          type: "xp",
          name: "daily_login",
          value: 2,
          gained: now,
          owner: username
        }, function(err, body) {
          if(!err && body.ok) {
            console.log("Daily Login XP redemmed for user '"+username+"'");
          } else {
            console.log("Wasn't able to redeem Daily Login XP for user '"+username+"'");
          }
        })
      }
    }
  })
}

var xpForLevel = function(level) {
  var points = 0;
  output = 0;

  for (lvl = 1; lvl < level; lvl++)
  {
    points += Math.floor(lvl + 30 * Math.pow(2, lvl / 10.));
    output = Math.floor(points / 4);
  } 
  return output;
}

var levelForXp = function(pts) {
  var points = 0;
  var output = 0;
  var lvl = 1;

  while(pts > output) {
    points += Math.floor(lvl + 30 * Math.pow(2, lvl / 10.));
      output = Math.floor(points / 4);
      if(pts >= output) lvl++;
    }
    return lvl;
}

var calcInterval = function(current_interval, last_rated, repeat, callback) {
  var interval;
  if((last_rated < 3) || (repeat == 1)) {
    interval = 1;
  }
  else {
    interval = parseInt(current_interval) + 1;
  }

  if(_.isUndefined(callback)) return interval;
  callback(interval);
}

var calcEF = function(ef_old, last_rated, callback) {
  var ef;

  ef= parseFloat(ef_old)+(0.1-(5-parseInt(last_rated))*(0.08+(5-parseInt(last_rated))*0.02));
  if(ef<1.3) {
    ef = 1.3;
  }

  if(_.isUndefined(callback)) return ef;
  callback(ef);
}

var calcIntervalDays = function(interval, interval_days_before, ef) {
  var interval_days;

  if(interval == 1) {
    interval_days = 1;
  }

  if(interval == 2) {
    interval_days = 6;
  }

  if(interval > 2) {

    interval_days = Math.ceil(parseInt(interval_days_before) * parseFloat(ef));
  }
  return interval_days;
}

//------------------------------------------------------------------------------------
//-----------------------       LOGIN & AUTH       -----------------------------------
//------------------------------------------------------------------------------------
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    var user = req.session.passport.user;
    if(_.isArray(user)) user = _.first(req.session.passport.user);
    var cookie = req.cookies.usr;
    if (cookie === undefined || req.cookies.usr.username !== user)
    {
      var usr = JSON.stringify({
        //"id": user._id,
        "username": user.username,
        //"provider": user.provider
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
      if(_.size(body.rows) > 0) {
        var user = _.map(body.rows, function(doc) { return doc.value});
        return done(err, user);
      } else {
        var email = null;
        if(_.isArray(profile.emails)) {
          email = _.first(profile.emails);
          if(_.has(email, "value")) email = email.value;
        }

        db.insert(
          { 
            "provider": profile.provider,
            "username": profile.username || null,
            "email": email,
            "profile": "public",
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
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK
  },
  function(token, tokenSecret, profile, done) {
      profile.openID = profile.id;
      profile.provider = "google";
      profile.username = profile.emails[0].value;
      return User.findOrCreate(profile, done);
  }
));

passport.use(new (require('passport-cas').Strategy)({
    ssoBaseURL: 'https://cas.thm.de/cas',
    serverBaseURL: nconf.get('cas_callback'),
    serviceURL: '/auth/cas'
}, function(login, done) {
    var profile = {provider:"cas", username:login};
    return User.findOrCreate(profile, done);
}));


app.get('/login', forceSSL, function(req, res) {
  if(req.isAuthenticated()) res.redirect('/'); 

  fs.readFile(__dirname + '/views/welcome.html', 'utf8', function(err, text){
    res.send(text);
  });
});

app.get('/impressum', forceSSL, function(req, res) {
  fs.readFile(__dirname + '/views/impressum.html', 'utf8', function(err, text){
    res.send(text);
  });
});

app.get('/auth/twitter',
  passport.authenticate('twitter'));

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    if(_.has(res.req, "user")) {
      var user = res.req.user;
      if(_.isArray(user)) user = _.first(user);
      redeemLoginXPoints(user.username);
      checkBadgeStammgast(user.username, res.sessionID);
    }
    res.redirect('/');
  }
);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email, user_about_me'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    if(_.has(res.req, "user")) {
      var user = res.req.user;
      if(_.isArray(user)) user = _.first(user);
      redeemLoginXPoints(user.username);
      checkBadgeStammgast(user.username, res.sessionID);
    }
    res.redirect('/');
  }
);

app.get('/auth/google', passport.authenticate('google',  { scope: 'email' }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    if(_.has(res.req, "user")) {
      var user = res.req.user;
      if(_.isArray(user)) user = _.first(user);
      redeemLoginXPoints(user.username);
      checkBadgeStammgast(user.username, res.sessionID);  
    }
    res.redirect('/');
  }
);

app.get('/auth/cas',
    function(req, res, next) {
        passport.authenticate('cas', function (err, user, info) {
            if (err) {
                return next(err);
            }

            if (!user) {
                req.session.messages = info.message;
                return res.redirect('/login');
            }

            req.logIn(user, function (err) {
                if (err) {
                    return next(err);
                }

                req.session.messages = '';
                if(_.has(res.req, "user")) {
                    var user = res.req.user;
                    if(_.isArray(user)) user = _.first(user);
                    redeemLoginXPoints(user.username);
                    checkBadgeStammgast(user.username, res.sessionID);
                }
                return res.redirect('/');
            });
        })(req, res, next);
    }
);

app.get('/logout', forceSSL, function(req, res){
  req.logout();
  res.clearCookie('usr');
  res.clearCookie('csrf.token');
  res.redirect('/');
});

app.get('/whoami', ensureAuthenticated, function(req, res) {
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(user);
  res.json(_.pick(user, 'username', 'name', 'email'));
});

//------------------------------------------------------------------------------------

app.get('/', forceSSL, ensureAuthenticated, function(req, res){
  fs.readFile(__dirname + '/views/index.html', 'utf8', function(err, text){
        res.send(text);
    });
});

app.get('/set/category', forceSSL, ensureAuthenticated, function(req, res){
  db.view('misc', 'all_set_categories', { group: true }, function(err, body) {
    
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return {name: _.first(doc.key), count: doc.value }});
      res.json(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
      res.send(404);
    }
  });
});

app.get('/typeahead/set/category', forceSSL, function(req, res){
  var query = '';
  if(!_.isUndefined(req.query.q)) query = req.query.q;

  db.view('misc', 'all_set_categories', { group: true, startkey: new Array(query) }, function(err, body) {
    
    if (!err) {
      
      var docs = _.filter(body.rows, function(doc){ 
        return _.first(doc.key).toLowerCase().indexOf(query.toLowerCase()) > -1;
      });
      docs = _.map(docs, function(doc) { return {value: _.first(doc.key), tokens: doc.key, count: doc.value }});
      
      res.json(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
    }
  });
});

app.get('/typeahead/set/visibility', forceSSL, function(req, res){
  var query = '';
  if(!_.isUndefined(req.query.q)) query = req.query.q;

  db.view('sets', 'by_visibility', { startkey: new Array(query) }, function(err, body) {
    if (!err) {
      var docs = _.filter(body.rows, function(doc){ 
        return doc.value.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
      });

      var docs = _.map(docs, function(doc) { return {value: doc.value.name, tokens: _.uniq(_.compact(_.union(doc.value.description, doc.value.name))), description: doc.value.description, id: doc.value._id }});
      res.json(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
    }
  });
});

app.get('/set/category/:category', forceSSL, function(req, res){
  var category = sanitizer.sanitize(req.params.category);

  db.view('sets', 'by_category', { startkey: new Array(category), endkey: new Array(category, {}) }, function(err, body) {
    
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return doc.value });
      res.json(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
      res.json({});
    }
  });
});

app.get('/set/:id/personalcard', forceSSL, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  var username = user.username;

  db.view('cards', 'personal_card', { startkey: new Array(req.params.id), endkey: new Array(req.params.id, {}) }, function(err, body) {

    var cards = _.filter(body.rows, function(row){ return (row.key[2] == 0); })
    _.each(cards, function(card){      
      var persCard = _.filter(body.rows, function(row){ return ((row.key[2] == 1) && (row.value.cardId == card.value._id) && (row.value.owner == username)); });
      card.value.persCard = persCard;
    }, this);
    cards = _.pluck(cards, "value");

    res.json(_.sortBy(cards, function(card){ return card.created }));
  });
});

app.get('/set/learned', forceSSL, ensureAuthenticated, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  var username = user.username;

  db.view('cards', 'personal_card_by_owner', { startkey: new Array(username), endkey: new Array(username, {}) }, function(err, body) {
    if(!err && !_.isEmpty(body.rows)) {
      var cards = _.filter(body.rows, function(row){ return row.key[2] == 0; });
      var setIds = new Array();
      _.each(cards, function(card){      
        var persCard = _.filter(body.rows, function(row){ return ((row.key[2] == 1) && (row.value.cardId == card.value._id)); });

        if(!_.isUndefined(persCard) && !_.isEmpty(persCard)) {
          setIds.push(card.value.setId);
        }
      }, this);
      setIds = _.uniq(setIds);

      var setIdKeys = new Array();

      _.each(setIds, function(setId) {
      var s = new Array(setId, 0);
      setIdKeys.push(s);
      });

      db.view('sets', 'by_id_with_cards', function(err, body) {
        var sets = _.filter(body.rows, function(row){ return ((row.key[1] == 0) && ( _.contains(setIds,row.value._id)) )});

        _.each(sets, function(set){      
          var cardCnt = _.filter(body.rows, function(row){ return ((row.key[1] == 1) && (row.value.setId == set.value._id)); });
          set.value.cardCnt = cardCnt.length;

          if(!_.has(set.value, "category") && _.isUndefined(set.value.category)) set.value.category = "";
        }, this);
        sets = _.pluck(sets, "value");

        sets = _.filter(sets, function(set){
          return set.visibility == 'public' && set.cardCnt > 0;
        });

        sets = _.map(sets, function(set){
          set._id = sanitizer.sanitize(set._id);
          set._rev = sanitizer.sanitize(set._rev);
          set.owner =  sanitizer.sanitize(set.owner);
          set.name =  sanitizer.sanitize(set.name);;
          set.description =  sanitizer.sanitize(set.description);;
          set.visibility =  sanitizer.sanitize(set.visibility);;
          set.category =  sanitizer.sanitize(set.category);;
          set.rating = (set.rating) ? set.rating : false;
          set.type = "set";
          return set;
        });
        res.json(_.sortBy(sets, function(set){ return set.name }));
      });
    } else {
      console.log(err);
      res.json([]);
    } 
  });
});

app.get('/set/:id/card', forceSSL, function(req, res){
  db.view('cards', 'by_set', { key: new Array(req.params.id) }, function(err, body) {
    
    if (!err) {
      var docs = _.map(body.rows, function(doc) { 
        doc.value._id = sanitizer.sanitize(doc.value._id);
        doc.value._rev = sanitizer.sanitize(doc.value._rev);
        doc.value.created = sanitizer.sanitize(doc.value.created);
        doc.value.owner = sanitizer.sanitize(doc.value.owner);
        doc.value.setId = sanitizer.sanitize(doc.value.setId);
        doc.value.front.text = sanitizer.sanitize(doc.value.front.text);
        doc.value.front.text_plain = sanitizer.sanitize(doc.value.front.text_plain);
        doc.value.front.picture = (doc.value.front.picture) ? sanitizer.sanitize(doc.value.front.picture) : '';
        doc.value.front.video = sanitizer.sanitize(doc.value.front.video);
        doc.value.back.text = sanitizer.sanitize(doc.value.back.text);
        doc.value.back.text_plain = sanitizer.sanitize(doc.value.back.text_plain);
        doc.value.back.picture = (doc.value.back.picture) ? sanitizer.sanitize(doc.value.back.picture) : '';
        doc.value.back.video = sanitizer.sanitize(doc.value.back.video);
        doc.value.type = "card";
        return doc.value;
      });
      res.json(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
      res.send(404);
    }
  });
});

app.get('/set/:id/memo/card', forceSSL, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  var username = user.username;

  var today = new Date.today();
  db.view('cards', 'personal_card', { startkey: new Array(req.params.id), endkey: new Array(req.params.id, {}) }, function(err, body) {

    var cards = _.filter(body.rows, function(row){ return (row.key[2] == 0); })
    _.each(cards, function(card){      
      var persCard = _.filter(body.rows, function(row){ return ((row.key[2] == 1) && (row.value.cardId == card.value._id) && (row.value.owner == username)); });
      card.value.persCard = persCard;
    }, this);
    cards = _.pluck(cards, "value");
    
    var cardsFiltered = _.filter(cards, function(card){
      if(_.isEmpty(card.persCard)){ return card};

      if(!_.isEmpty(card.persCard)){
        var lastLearned = new Date(card.persCard[0].value.sm_last_learned);
        var nextDate = new Date(card.persCard[0].value.sm_next_date);
        
        if(Date.compare(today, nextDate) >= 0){ return card};

        if(parseInt(card.persCard[0].value.sm_instant_repeat) == 1) { return card};
      };        
    })
    res.json(_.sortBy(cardsFiltered, function(card){ return card.created }));
  });
});

app.get('/set/:id', forceSSL, function(req, res){
  db.view('sets', 'by_id', { key: new Array(req.params.id) }, function(err, body) {
    if (!err) {
      var docs = _.map(body.rows, function(doc) { 
        doc.value._id = sanitizer.sanitize(doc.value._id);
        doc.value._rev = sanitizer.sanitize(doc.value._rev);
        doc.value.name = sanitizer.sanitize(doc.value.name);
        doc.value.description = sanitizer.sanitize(doc.value.description);
        doc.value.visibility =  sanitizer.sanitize(doc.value.visibility);
        doc.value.category = sanitizer.sanitize(doc.value.category);
        doc.value.owner =  sanitizer.sanitize(doc.value.owner);
        doc.value.type = 'set';
        return doc.value;
      });
      res.json(docs[0]);
    } else {
      console.log("[db.sets/by_id]", err.message);
      res.send(404);
    }
  });
});

app.get('/export/:setId', ensureAuthenticated, function(req, res){
    var result = {};
    var setId = req.params.setId;

    db.view('sets', 'by_id', { key: new Array(setId) }, function(err, body) {
        if (!err) {
            var docs = _.map(body.rows, function(doc) {
                doc.value._id = sanitizer.sanitize(doc.value._id);
                doc.value._rev = sanitizer.sanitize(doc.value._rev);
                doc.value.name = sanitizer.sanitize(doc.value.name);
                doc.value.description = sanitizer.sanitize(doc.value.description);
                doc.value.visibility =  sanitizer.sanitize(doc.value.visibility);
                doc.value.category = sanitizer.sanitize(doc.value.category);
                doc.value.owner =  sanitizer.sanitize(doc.value.owner);
                doc.value.type = 'set';
                return doc.value;
            });
            result.info = docs[0];

            db.view('cards', 'by_set', { key: new Array(setId) }, function(err, body) {
                if (!err) {
                    var docs = _.map(body.rows, function(doc) {
                        doc.value._id = sanitizer.sanitize(doc.value._id);
                        doc.value._rev = sanitizer.sanitize(doc.value._rev);
                        doc.value.created = sanitizer.sanitize(doc.value.created);
                        doc.value.owner = sanitizer.sanitize(doc.value.owner);
                        doc.value.setId = sanitizer.sanitize(doc.value.setId);
                        doc.value.front.text = sanitizer.sanitize(doc.value.front.text);
                        doc.value.front.text_plain = sanitizer.sanitize(doc.value.front.text_plain);
                        doc.value.front.picture = (doc.value.front.picture) ? sanitizer.sanitize(doc.value.front.picture) : '';
                        doc.value.front.video = sanitizer.sanitize(doc.value.front.video);
                        doc.value.back.text = sanitizer.sanitize(doc.value.back.text);
                        doc.value.back.text_plain = sanitizer.sanitize(doc.value.back.text_plain);
                        doc.value.back.picture = (doc.value.back.picture) ? sanitizer.sanitize(doc.value.back.picture) : '';
                        doc.value.back.video = sanitizer.sanitize(doc.value.back.video);
                        doc.value.type = "card";
                        return doc.value;
                    });
                    result.cards = docs;

                    res.json(result);
                } else {
                    console.log("[db.cards/by_set]", err.message);
                    res.send(404);
                }
            });

        } else {
            console.log("[db.sets/by_id]", err.message);
            res.send(404);
        }
    });
});

app.post('/import', forceSSL, ensureAuthenticated, function(req, res){
    var body = '';
    var header = '';
    var content_type = req.headers['content-type'];
    var boundary = content_type.split('; ')[1].split('=')[1];
    var content_length = parseInt(req.headers['content-length']);
    var headerFlag = true;
    var filename = 'dummy.bin';
    var filenameRegexp = /filename="(.*)"/m;
    console.log('content-type: ' + content_type);
    console.log('boundary: ' + boundary);
    console.log('content-length: ' + content_length);

    req.on('data', function(raw) {
        console.log('received data length: ' + raw.length);
        var i = 0;
        while (i < raw.length)
            if (headerFlag) {
                var chars = raw.slice(i, i+4).toString();
                if (chars === '\r\n\r\n') {
                    headerFlag = false;
                    header = raw.slice(0, i+4).toString();
                    console.log('header length: ' + header.length);
                    console.log('header: ');
                    console.log(header);
                    i = i + 4;
                    // get the filename
                    var result = filenameRegexp.exec(header);
                    if (result[1]) {
                        filename = result[1];
                    }
                    console.log('filename: ' + filename);
                    console.log('header done');
                }
                else {
                    i += 1;
                }
            }
            else {
                // parsing body including footer
                body += raw.toString('binary', i, raw.length);
                i = raw.length;
                console.log('actual file size: ' + body.length);
            }
    });

    req.on('end', function() {
        // removing footer '\r\n'--boundary--\r\n' = (boundary.length + 8)
        body = body.slice(0, body.length - (boundary.length + 8));
        console.log('final file size: ' + body.length);

        var fileNameParts = filename.split('.');
        var fileNameSuffix = fileNameParts[fileNameParts.length-1];
        console.log('fileNameSuffix: ' + fileNameSuffix);

        var user = req.session.passport.user;
        if(_.isArray(user)) user = _.first(req.session.passport.user);

        switch (fileNameSuffix) {
            case 'csv':
                var csvConverter=new Converter();

                csvConverter.fromString(body,function(err,resultJson){
                    if (err){
                        //err handle
                        console.log('csvConverter error: ' + err);
                        res.redirect('/');
                    }

                    console.log('csvConverter finished: ');
                    console.log(resultJson);

                    if(resultJson[0].info && resultJson[0].cards){
                        var importJson = {};

                        importJson.info = {};
                        importJson.info.name = resultJson[0].info.name;
                        importJson.info.description = resultJson[0].info.description;
                        importJson.info.visibility = resultJson[0].info.visibility;
                        importJson.info.category = resultJson[0].info.category;
                        importJson.info.cardCnt = resultJson[0].info.cardCnt;
                        importJson.info.rating = resultJson[0].info.rating;

                        importJson.cards = [];
                        for(var i=0; i<resultJson.length; i++){
                            var newCard = {};
                            newCard.front = {};
                            newCard.front.text = resultJson[i].cards.front.text;
                            newCard.front.text_plain = resultJson[i].cards.front.text_plain;
                            newCard.front.picture = resultJson[i].cards.front.picture;
                            newCard.front.video = resultJson[i].cards.front.video;
                            newCard.back = {};
                            newCard.back.text = resultJson[i].cards.back.text;
                            newCard.back.text_plain = resultJson[i].cards.back.text_plain;
                            newCard.back.picture = resultJson[i].cards.back.picture;
                            newCard.back.video = resultJson[i].cards.back.video;
                            importJson.cards.push(newCard);
                        }

                        addSetToDatabase(user, importJson, function(err, setId){
                            if(!err){
                                res.redirect('/#set/details/'+setId);
                            }
                        });
                    }else{
                        console.log('csvConverter error: wrong filestructure');
                        res.redirect('/');
                    }
                });
                break;

            case 'json':
                var importJson = JSON.parse(body);
                console.log('parsed Json: ' + importJson);

                addSetToDatabase(user, importJson, function(err, setId){
                    if(!err){
                        res.redirect('/#set/details/'+setId);
                    }
                });

                break;

            default:
                console.log('wrong filetype: ' + fileNameSuffix );
                res.redirect('/');
                return;
        }
    })
});

var addSetToDatabase = function(user, importJson, callback){
    var time = new Date().getTime();
    var data = {};
    data.owner = user.username;
    data.type = "set";
    data.created = sanitizer.sanitize(time);
    data.name = sanitizer.sanitize(importJson.info.name);
    data.description = sanitizer.sanitize(importJson.info.description);
    data.visibility = sanitizer.sanitize(importJson.info.visibility);
    data.category = sanitizer.sanitize(importJson.info.category);
    data.cardCnt = parseInt(sanitizer.sanitize(importJson.info.cardCnt));
    data.rating = (importJson.info.rating === 'true');

    db.insert(
        data,
        function(err, body, header){
            if(err) {
                console.log('[db.insert] ', err.message);
                return;
            }
            db.get(body.id, { revs_info: false }, function(err, body) {
                if (!err){
                    var setId = body._id;

                    //Add Cards to set
                    var owner = user.username;
                    for(var i = 0; i < importJson.cards.length; i++){

                        var card = importJson.cards[i];
                        if(!(card.front.text && card.back.text)) res.send(400);

                        var newCard = {};
                        newCard.created = time;
                        newCard.owner = owner;
                        newCard.setId = setId;
                        newCard.front = {};
                        newCard.front.text = sanitizer.sanitize(card.front.text);
                        newCard.front.text_plain = sanitizer.sanitize(card.front.text_plain);
                        newCard.front.picture = (card.front.picture) ? sanitizer.sanitize(card.front.picture) : '';
                        newCard.front.video = sanitizer.sanitize(card.front.video);
                        newCard.back = {};
                        newCard.back.text = sanitizer.sanitize(card.back.text);
                        newCard.back.text_plain = sanitizer.sanitize(card.back.text_plain);
                        newCard.back.picture = (card.back.picture) ? sanitizer.sanitize(card.back.picture) : '';
                        newCard.back.video = sanitizer.sanitize(card.back.video);
                        newCard.type = "card";
                        console.log(newCard);
                        db.insert(
                            newCard,
                            function(err, body, header){
                                if(err) {
                                    console.log('[db.insert] ', err.message);
                                    return;
                                }
                                db.get(body.id, { revs_info: false }, function(err, body) {
                                    if (!err) {

                                    }
                                });
                            }
                        );
                    }
                    callback(null, setId);
                }
            });
        }
    );
};

app.get('/user/:username', forceSSL, ensureAuthenticated, function(req, res){
  db.view('users', 'by_username', { key: req.params.username }, function(err, body) {
    if(!_.isUndefined(body.rows) && _.size(body.rows) > 0) {

      var userInfo = _.first(body.rows).value;

      userInfo._id = sanitizer.sanitize(userInfo._id);
      userInfo._rev = sanitizer.sanitize(userInfo._rev);
      userInfo.provider = sanitizer.sanitize(userInfo.provider);
      userInfo.username = sanitizer.sanitize(userInfo.username);
      userInfo.name = sanitizer.sanitize(userInfo.name);
      userInfo.email = (userInfo.email) ? sanitizer.sanitize(userInfo.email) : '';
      userInfo.profile = sanitizer.sanitize(userInfo.profile);
      userInfo.type = 'user';

      res.json(userInfo);
    } else {
      res.send(404);
    }
    
  });
});

app.put('/user/:username', forceSSL, ensureAuthenticated, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  if(req.params.username === user.username) {
      db.view('users', 'by_username', { key: user.username }, function(err, body) {
        if(!err) {
          var user = body.rows[0].value;

          user.name = req.body.name;
          user.email = req.body.email;
          user.profile = req.body.profile;

          db.insert(user, body.rows[0].id, function(err, body){
            if(!err) {
              res.json(body); 
            } else {
              console.log("[db.users/by_username]", err.message);
              res.send(404);
            }
            
          });
        } else {
          console.log(err);
        }

      });
  }
});

app.get('/set/user/:username', forceSSL, ensureAuthenticated, function(req, res) {
  var username = req.params.username;
  if(!_.isUndefined(username)) {
    db.view('sets', 'by_id_with_cards', function(err, body) {
      var sets = _.filter(body.rows, function(row){ return ((row.key[1] == 0) && ( row.value.owner == username )); })

      _.each(sets, function(set){      
        var cardCnt = _.filter(body.rows, function(row){ return ((row.key[1] == 1) && (row.value.setId == set.value._id)); });
        set.value.cardCnt = cardCnt.length;

        if(!_.has(set.value, "category") && _.isUndefined(set.value.category)) set.value.category = "";
      }, this);
      sets = _.pluck(sets, "value");

      sets = _.filter(sets, function(set){
        return set.visibility == 'public' && set.cardCnt > 0;
      });

      sets = _.map(sets, function(set){
        set._id = sanitizer.sanitize(set._id);
        set._rev = sanitizer.sanitize(set._rev);
        set.owner =  sanitizer.sanitize(set.owner);
        set.name =  sanitizer.sanitize(set.name);;
        set.description =  sanitizer.sanitize(set.description);;
        set.visibility =  sanitizer.sanitize(set.visibility);;
        set.category =  sanitizer.sanitize(set.category);;
        set.rating = (set.rating) ? set.rating : false;
        set.type = "set";
        return set;
      });
      res.json(_.sortBy(sets, function(set){ return set.name }));
    });
  } else {
    res.send(404);  
  }
});

app.get('/set', forceSSL, ensureAuthenticated, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  setTimeout(function(){
    checkBadgeKritikerLiebling(user.username, req.sessionID);
    checkBadgeStreber(user.username, req.sessionID);
    checkBadgeMeteor(user.username, req.sessionID);
    checkBadgeKritiker(user.username, req.sessionID);
    checkBadgeAutor(user.username, req.sessionID);
  }, 1000);
    
  db.view('sets', 'by_id_with_cards', function(err, body) {
    var sets = _.filter(body.rows, function(row){ return ((row.key[1] == 0) && ( row.value.owner == user.username )); })

    _.each(sets, function(set){      
      var cardCnt = _.filter(body.rows, function(row){ return ((row.key[1] == 1) && (row.value.setId == set.value._id)); });
      set.value.cardCnt = cardCnt.length;

      if(!_.has(set.value, "category") && _.isUndefined(set.value.category)) set.value.category = "";
    }, this);
    sets = _.pluck(sets, "value");

    sets = _.map(sets, function(set){
      set._id = sanitizer.sanitize(set._id);
      set._rev = sanitizer.sanitize(set._rev);
      set.owner =  sanitizer.sanitize(set.owner);
      set.name =  sanitizer.sanitize(set.name);;
      set.description =  sanitizer.sanitize(set.description);;
      set.visibility =  sanitizer.sanitize(set.visibility);;
      set.category =  sanitizer.sanitize(set.category);;
      set.rating = (set.rating) ? set.rating : false;
      set.type = "set";
      return set;
    });

    res.json(_.sortBy(sets, function(set){ return set.name })); 
  });
});

app.post('/set', forceSSL, ensureAuthenticated, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);

  var time = new Date().getTime();

  var data = {};
  data.owner = user.username;
  data.name = sanitizer.sanitize(req.body.name),
  data.description = sanitizer.sanitize(req.body.description),
  data.visibility = sanitizer.sanitize(req.body.visibility),
  data.category = sanitizer.sanitize(req.body.category),
  data.cardCnt = parseInt(sanitizer.sanitize(req.body.cardCnt)),
  data.rating = (req.body.rating === 'true')
  data.type = "set";
  data.created = sanitizer.sanitize(time);

  db.insert(
    data, 
    function(err, body, header){
      if(err) {
        console.log('[db.insert] ', err.message);
        return;
      }
      redeemXPoints("create_set", 2, user.username);
      db.get(body.id, { revs_info: false }, function(err, body) {
        if (!err)
          res.json(body);
      });
  });  
});

app.put('/set/:setid', forceSSL, ensureAuthenticated, function(req, res){
  db.view('sets', 'by_id', { key: new Array(req.body._id)}, function(err, body) {
    if (!err) {
      doc = _.map(body.rows, function(doc) { return doc.value});

      var data = {};
      data._id = sanitizer.sanitize(req.body._id);
      data._rev = sanitizer.sanitize(req.body._rev);
      data.cardCnt = parseInt(sanitizer.sanitize(req.body.cardCnt));
      data.created = sanitizer.sanitize(req.body.created);
      data.type = "set";
      data.name = sanitizer.sanitize(req.body.name);
      data.description = sanitizer.sanitize(req.body.description);
      data.visibility = sanitizer.sanitize(req.body.visibility);
      data.category = sanitizer.sanitize(req.body.category);
      data.rating = (req.body.rating === 'true');      

      db.insert(req.body, doc[0]._id, function(err, body, header){
          if(err) {
            console.log('[db.insert] ', err.message);
            return;
          }
          db.get(body.id, { revs_info: false }, function(err, body) {
            if (!err)
              res.json(body);
          });
      });
    } else {
      console.log("[db.sets/by_id]", err.message);
      res.send(404);
    }
   });

});

app.delete('/set/:setid', forceSSL, ensureAuthenticated, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);

  checkOwner(req.params.setid, user.username, function(){
    db.view('cards', 'by_set', { key: new Array(req.params.setid)}, function(err, body) {
    if (!err) {
        var docs = _.map(body.rows, function(doc) { return doc.value});
        var cardIds = _.pluck(docs, "_id");

        _.each(cardIds, function(cardId){
          db.view('cards', 'personal_card_by_cardId', { key: new Array(cardId)}, function(err, body) {
            if (!err) {
              var docs = _.map(body.rows, function(doc) { return doc.value});
              var personal = new Array();

              _.each(docs, function(doc){
                 var doc = {
                 _id: doc._id, _rev: doc._rev, _deleted: true
                 }
                 personal.push(doc)
              }, this);

              db.bulk({"docs": personal}, function(err, body) {
                
                var normalCard = new Array();
                _.each(docs, function(doc){
                   var doc = {
                   _id: doc._id, _rev: doc._rev, _deleted: true
                   }
                   normalCard.push(doc)
                }, this);

                db.bulk({"docs": normalCard}, function(err, body) {
                  
                  db.get(req.params.setid, function(err, body){
                    if(!err) {
                      var doc = {
                      _id: body._id,
                      _rev: body._rev,
                      _deleted: true
                      };
                      db.bulk({"docs": new Array(doc)}, function(err, body){
                        console.log(err);
                      });
                    }
                  });
                });
              });
            } else {
              console.log("[db.sets/by_id]", err.message);
            }
          });
        }, this);
        db.get(req.params.setid, function(err, body){
          if(!err) {
            var doc = {
            _id: body._id,
            _rev: body._rev,
            _deleted: true
            };
            db.bulk({"docs": new Array(doc)}, function(err, body){
              console.log(err);
            });
          }
        });
        res.json(body);
      } else {
        console.log("[db.sets/by_id]", err.message);
      }
    });
  }, function(){
    res.send(403);
  });
});

app.get('/card/:id', forceSSL, ensureAuthenticated, function(req, res){
  db.view('cards', 'by_id', { key: new Array(req.params.id) }, function(err, body) {
    if (!_.isUndefined(body.rows) && !err && body.rows.length > 0) {

      var card = _.first(body.rows).value;

      if(!(card.front.text && card.back.text)) res.send(400);

      card._id = sanitizer.sanitize(card._id);
      card._rev = sanitizer.sanitize(card._rev);
      card.created = sanitizer.sanitize(card.created);
      card.owner = sanitizer.sanitize(card.owner);
      card.setId = sanitizer.sanitize(card.setId);
      card.front.text = sanitizer.sanitize(card.front.text);
      card.front.text_plain = sanitizer.sanitize(card.front.text_plain);
      card.front.picture = (card.front.picture) ? sanitizer.sanitize(card.front.picture) : '';
      card.front.video = sanitizer.sanitize(card.front.video);
      card.back.text = sanitizer.sanitize(card.back.text);
      card.back.text_plain = sanitizer.sanitize(card.back.text_plain);
      card.back.picture = (card.back.picture) ? sanitizer.sanitize(card.back.picture) : '';
      card.back.video = sanitizer.sanitize(card.back.video);
      card.type = "card";

      res.json(card);
    } else {
      console.log("[db.cards/by_id]", err.message);
      res.json(404);
    }
   });
});

app.put('/card/:id', forceSSL, ensureAuthenticated, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);

  checkOwner(req.body._id, user.username, function(){
    db.view('cards', 'by_id', { key: new Array(req.params.id) }, function(err, body) {
      var card = req.body;

      if(!(card.front.text && card.back.text)) res.send(400);

      card._id = sanitizer.sanitize(card._id);
      card._rev = sanitizer.sanitize(card._rev);
      card.created = sanitizer.sanitize(card.created);
      card.owner = sanitizer.sanitize(card.owner);
      card.setId = sanitizer.sanitize(card.setId);
      card.front.text = sanitizer.sanitize(card.front.text);
      card.front.text_plain = sanitizer.sanitize(card.front.text_plain);
      card.front.picture = (card.front.picture) ? sanitizer.sanitize(card.front.picture) : '';
      card.front.video = sanitizer.sanitize(card.front.video);
      card.back.text = sanitizer.sanitize(card.back.text);
      card.back.text_plain = sanitizer.sanitize(card.back.text_plain);
      card.back.picture = (card.back.picture) ? sanitizer.sanitize(card.back.picture) : '';
      card.back.video = sanitizer.sanitize(card.back.video);
      card.type = "card";

      db.insert(card, req.params.id, function(err, body){
        if(!err) {
          res.json(body); 
        } else {
          console.log("[db.users/by_username]", err.message);
        }
      });
    });
  }, function(){
    res.send(403);
  });
});

app.delete('/card/:id', forceSSL, ensureAuthenticated, function(req, res) {
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);

  checkOwner(req.params.id, user.username, function(){
    db.get(req.params.id, function(err, body){
      if(!err) {
        var doc = {
        _id: body._id,
        _rev: body._rev,
        _deleted: true
        };
        db.bulk({"docs": new Array(doc)}, function(err, body){
          if (!err) {
            db.view('cards', 'personal_card_by_cardId', { key: new Array(req.params.id)}, function(err, body) {
              if (!err) {
                var docs = _.map(body.rows, function(doc) { return doc.value});
                var personal = new Array();
                _.each(docs, function(doc){
                   var doc = {
                   _id: doc._id, _rev: doc._rev, _deleted: true
                   }
                   personal.push(doc)
                }, this);
                db.bulk({"docs": personal}, function(err, body) {    
                });               
                res.json(body);   
              }    
            });
          } else {
            console.log('[db.delete] ', err.message);
            res.send(404);            
          }
        });
      }
    });
  }, function(){
    res.send(403);
  });
});

app.post('/card', forceSSL, ensureAuthenticated, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);

  var owner = user.username;
  checkOwner(req.body.setId, owner, function(){
    var time = new Date().getTime();

    var card = req.body;

    if(!(card.front.text && card.back.text)) res.send(400);

    card.created = time;
    card.owner = owner;
    card.setId = sanitizer.sanitize(card.setId);
    card.front.text = sanitizer.sanitize(card.front.text);
    card.front.text_plain = sanitizer.sanitize(card.front.text_plain);
    card.front.picture = (card.front.picture) ? sanitizer.sanitize(card.front.picture) : '';
    card.front.video = sanitizer.sanitize(card.front.video);
    card.back.text = sanitizer.sanitize(card.back.text);
    card.back.text_plain = sanitizer.sanitize(card.back.text_plain);
    card.back.picture = (card.back.picture) ? sanitizer.sanitize(card.back.picture) : '';
    card.back.video = sanitizer.sanitize(card.back.video);
    card.type = "card";

    db.insert(
      card, 
      function(err, body, header){
        if(err) {
          console.log('[db.insert] ', err.message);
          return;
        }
        redeemXPoints("create_card", 2, owner);
        checkBadgeAutor(owner, req.sessionID);
        db.get(body.id, { revs_info: false }, function(err, body) {
          if (!err)
            res.json(body);
        });
    });  
  }, function(){
    res.send(403);
  });
});

app.post('/personalcard/:cardid', forceSSL, ensureAuthenticated, function(req, res){
    var user = req.session.passport.user;
    if(_.isArray(user)) user = _.first(req.session.passport.user);

    var time = new Date().getTime();
    var username = user.username;
    var smTimesLearned;
    var smLastLearned;
    var smIntervalDays;
    var currentDate = Date.today();;
    var nextDate;
    var instantRepeat = "0";

    if (_.has(req.body.persCard.value, "last_rated")){
      smTimesLearned = 1;
      smLastLearned = Date.today();
      smIntervalDays = 1;
      smInterval = 1;
      nextDate = currentDate.addDays(1);
      if (parseInt(req.body.persCard.value.last_rated) < 4) {
        instantRepeat = "1"
      }
    } else {
      smTimesLearned = 0;
      smLastLearned = 0;
      smIntervalDays = 0;
      smInterval = 0;
      nextDate = 0;
    }

    db.insert(
      { 
        "created": time,
        "owner": user.username,
        "cardId": _.escape(req.body._id),
        "setId": _.escape(req.body.setId),
        "box": _.escape(req.body.persCard.value.box) || "1",
        "type": "personal_card",
        "times_learned": "1",
        "sm_times_learned": smTimesLearned,
        "sm_interval": smInterval,
        "sm_ef": "2.5",
        "sm_instant_repeat": instantRepeat,
        "sm_interval_days": smIntervalDays,
        "sm_last_learned": smLastLearned,
        "sm_next_date": nextDate
      }, 
      function(err, body, header){
        if(err) {
          console.log('[db.insert] ', err.message);
          return;
        }
        db.get(body.id, { revs_info: false }, function(err, body) {
          if (!err){
            var persCard = {};
            persCard.value = body;
            db.get(req.body._id, { revs_info: false }, function(err, body) {
              if (!err)
                body.persCard = persCard;
                res.json(body);
            });
          } else {
            res.send(404);
          }
        });
    });
  });


app.put('/personalcard/:cardid', forceSSL, ensureAuthenticated, function(req, res){
  var time = new Date().getTime();
  var today = Date.today();
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  var username = user.username;

  db.view('cards', 'personal_card_by_cardId', { key: new Array(req.body._id)}, function(err, body) {
    if (!err){  
      var docs = _.filter(body.rows, function(row){ return (row.value.owner == username ); })  
      docs = _.map(docs, function(doc) { 
        return doc.value
      });
      if (body.rows.length){

        if (_.has(req.body.persCard.value, "last_rated")){
          var instantRepeat = "0";
          if (parseInt(req.body.persCard.value.last_rated) < 4) {
            instantRepeat = "1"
          }
          calcInterval(_.first(docs).sm_interval, _.escape(req.body.persCard.value.last_rated), parseInt(docs[0].sm_instant_repeat), function(interval){
            calcEF(_.first(docs).sm_ef, _.escape(req.body.persCard.value.last_rated), function(ef){
              var intervalDays = calcIntervalDays(interval, parseInt(docs[0].sm_interval_days), ef);
              var currentDate = today.clone();
              var nextDate = currentDate.addDays(parseInt(intervalDays));

              db.insert(
              { 
                "_rev": docs[0]._rev,
                "created": docs[0].created,
                "owner": docs[0].owner,
                "cardId": docs[0].cardId,
                "setId": docs[0].setId,
                "type": docs[0].type,
                "box": docs[0].box,
                "times_learned": parseInt(docs[0].times_learned) + 1,
                "sm_times_learned": parseInt(docs[0].sm_times_learned) + 1,
                "sm_interval": interval,
                "sm_ef": ef,
                "sm_interval_days": intervalDays,
                "sm_instant_repeat": instantRepeat,
                "sm_last_learned": today,
                "sm_next_date": nextDate
              },
              docs[0]._id,
              function(err, body, header){
                if(err) {
                  console.log('[db.insert] ', err.message);
                  return;
                }
                db.get(body.id, { revs_info: false }, function(err, body) {
                  if (!err){
                    var persCard = {};
                    persCard.value = body;
                    db.get(docs[0].cardId, { revs_info: false }, function(err, body) {
                      if (!err)
                        body.persCard = persCard;
                        res.json(body);
                    });
                  }
                });
              });
            });
          });
        }

        if (!_.has(req.body.persCard.value, "last_rated")){
              db.insert(
              { 
                "_rev": docs[0]._rev,
                "created": docs[0].created,
                "owner": docs[0].owner,
                "cardId": docs[0].cardId,
                "setId": docs[0].setId,
                "type": docs[0].type,
                "box": _.escape(req.body.persCard.value.box)  || docs[0].box,
                "times_learned": parseInt(docs[0].times_learned) + 1,
                "sm_times_learned": docs[0].sm_times_learned,
                "sm_interval": docs[0].sm_interval,
                "sm_ef": docs[0].sm_ef,
                "sm_interval_days": docs[0].sm_interval_days,
                "sm_instant_repeat": docs[0].sm_instant_repeat,
                "sm_last_learned": docs[0].sm_last_learned
              },
              docs[0]._id,
              function(err, body, header){
                if(err) {
                  console.log('[db.insert] ', err.message);
                  return;
                }
                db.get(body.id, { revs_info: false }, function(err, body) {
                  if (!err){
                    var persCard = {};
                    persCard.value = body;
                    db.get(docs[0].cardId, { revs_info: false }, function(err, body) {
                      if (!err)
                        body.persCard = persCard;
                        res.json(body);
                    });
                  }
                });
              });
        }

      }
    } else {
      console.log("[db.personalcard/by_cardId]", err.message);
      res.send(404);
    }
  });
});

app.get('/score/:username', forceSSL, ensureAuthenticated, function(req, res){
  var game = "meteor";
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  user = user.username;

  db.view('score', 'highscore_by_game_user', { startkey: new Array(game, user), endkey: new Array(game, user), group: true }, function(err, body) {
    if(!_.isUndefined(body.rows) && !err && body.rows.length > 0) {

      var gameHighscore = _.first(body.rows).value;

      db.view('score', 'score_by_game_user_set', { startkey: new Array(game, user), endkey: new Array(game, user, {}) }, function(err, body) {
        var scores = new Array();
        _.each(body.rows, function(score){
          scores.push({
            setId: score.key[2],
            points: score.value
          });
        });

        scores = _.sortBy(scores, "points");
        var groupedScores = _.groupBy(scores, function(score){ return score.setId });
        
        var games = new Array();
        var keys = new Array();
        _.each(groupedScores, function(score){
          var highscore = _.last(score);
      
          keys.push(new Array(game, highscore.setId));

          games.push({
            setId: highscore.setId,
            setName: "unknown",
            personalHighscore: highscore.points,
            position: 0,
            overallHighscore: 0
          });
        });

        var setIds = _.pluck(games, "setId");
        setIds = _.map(setIds, function(set) { return new Array(set)});

        db.view('sets', 'by_id', { keys: setIds }, function(err, body) {
          var sets = _.pluck(body.rows, "value");

          _.each(sets, function(set) {
            var game = _.findWhere(games, { setId: set._id });

            game.setName = set.name;
            game.setId = set._id;
          });

          db.view('score', 'score_by_game_set', { keys: keys }, function(err, body) {
            var setScores = _.pluck(body.rows, "value");
            setScores = _.sortBy(setScores, "points");
            groupedSetScores = _.groupBy(setScores, function(score){ return score.setId });
            
            _.each(groupedSetScores, function(score){
              var setHighscore = _.last(score);

              var game = _.findWhere(games, {setId: setHighscore.setId})
              game.overallHighscore = setHighscore.points;

              var points = _.pluck(score, "points");
              var pos = _.sortedIndex(points, game.personalHighscore);
              game.position = points.length-pos;
            });

            res.json({
              owner: user,
              game: "meteor",
              score: gameHighscore,
              gameCnt: scores.length || 0,
              games: games
            });
          });
        });
      });
    } else {
      res.json({
        owner: user,
        game: "meteor",
        score: 0,
        gameCnt: 0,
        games: {}
      });
    }
  });
});

app.get('/score/:username/:set', forceSSL, function(req, res){
  var game = "meteor";

  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);

  user = user.username;
  var setId = req.params.set;

  var result = { score: 0, badges: 0, badgesTotal: 0 };

  db.view('score', 'score_by_game_user_set', { key: new Array(game, user, setId) }, function(err, body) {
    if(!err) {
      if(!_.isUndefined(body.rows) && _.has(body, "rows") && !_.isEmpty(body.rows)) {
        var scores = _.sortBy(body.rows, function(score){ return -score.value });
        var score = _.first(scores);
        result.score = score.value;
        res.json(result);
      } else {
        res.json({ score: 0 });
      }
    }
  });
});


app.post('/score/:username', forceSSL, ensureAuthenticated, function(req, res){
    var game = 'meteor';
    var owner = sanitizer.sanitize(req.body.owner);
    var setId = sanitizer.sanitize(req.body.setId);
    var points = parseInt(req.body.points);
    var level = parseInt(sanitizer.sanitize(req.body.level));

    var user = req.session.passport.user;
    if(_.isArray(user)) user = _.first(req.session.passport.user);

    if(points > 0) {
      db.insert({
        type: "score",
        game: game,
        level: level,
        owner: owner,
        setId: setId,
        points: points
      },    
      function(err, body) {
        if(!err) {
          checkBadgeMeteor(user.username, req.sessionID);  
        }
      });  
    }

    db.view('score', 'score_by_game_set', { key: new Array(game, setId) }, function(err, body) {
      if(!err && !_.isUndefined(body) && _.has(body, "rows")) {
      var scores = new Array();

      _.each(body.rows, function(score){
        var player = false;
        if(score.value.owner == owner) { player = true; }
        scores.push({
          setId: score.value.setId,
          points: score.value.points,
          owner: score.value.owner,
          isPlayer: player
        });
      });

      scores = _.sortBy(scores, "points").reverse();

      var highscores = {};
      _.each(scores, function(score){
        if(_.has(highscores, score.owner)) {
          if(highscores[score.owner].points < score.points) 
            highscores[score.owner] = score;
        } else {
          highscores[score.owner] = score;
        }
        
      });

      highscores = _.flatten(highscores);
      var ownerScore = _.findWhere(highscores, {owner: owner})
      highscores = _.toArray(highscores);
      var idx = _.indexOf(highscores, ownerScore);

      var x = new Array();

      if(highscores.length == idx+1) {
        x.push(highscores[idx-2]);
        x.push(highscores[idx-1]);
        x.push(highscores[idx]);
      } else if(0 == idx) {
        x.push(highscores[idx]);
        x.push(highscores[idx+1]);
        x.push(highscores[idx+2]);
      } else {
        x.push(highscores[idx-1]);
        x.push(highscores[idx]);
        x.push(highscores[idx+1]);
      }

      x = _.compact(x);

      res.json(x);
      }
    });
});

app.get('/xp/:username', forceSSL, ensureAuthenticated, function(req, res){
  var msPerDay = 86400 * 1000;
  var now = new Date().getTime();

  var todayStart = now - (now % msPerDay);
      todayStart += ((new Date).getTimezoneOffset() * 60 * 1000)
  var todayEnd = todayStart + (msPerDay-1000);

  var yesterdayStart = todayStart - msPerDay;
  var yesterdayEnd = todayEnd - msPerDay;

  var lastSevenDaysStart = todayStart - (msPerDay*7);
  var lastSevenDaysEnd = todayEnd - (msPerDay*7);

  var pointsPerLevel = 10;

  var result = {
      totalXPoints: 0,
      todayXPoints: 0,
      yesterdayXPoints: 0,
      lastSevenDaysXPoints: 0,
      currentLevel: 1,
      pointsRemaining: pointsPerLevel,
      pointsLevel: pointsPerLevel
  }

  db.view('xp', 'by_owner', { key: new Array(req.params.username) }, function(err, body) {
    if(!_.isUndefined(body.rows) && !err && body.rows.length > 0) {
      var xpoints = _.pluck(body.rows, "value");

      var groupedXPoints = _.groupBy(xpoints, "name");

      var todayXPoints = _.reduce(_.pluck(_(xpoints).filter(function(point){
        if(point.gained >= todayStart && point.gained <= todayEnd) return point;
      }), "value"), function(memo, num){ return memo + num; }, 0);

      var yesterdayXPoints = _.reduce(_.pluck(_(xpoints).filter(function(point){
        if(point.gained >= yesterdayStart && point.gained <= yesterdayEnd) return point;
      }), "value"), function(memo, num){ return memo + num; }, 0);

      var lastSevenDaysXPoints = _.reduce(_.pluck(_(xpoints).filter(function(point){
        if(point.gained >= lastSevenDaysStart && point.gained <= todayEnd) return point;
      }), "value"), function(memo, num){ return memo + num; }, 0);

      var totalXPpoints = 0
      _.each(xpoints, function(point) {
        totalXPpoints += point.value;
      });

      var lastRedeem = _.first(_.sortBy(xpoints, "gained").reverse());

      var lastRedeemName = '';
      if(lastRedeem.name == 'create_set') lastRedeemName = 'Kartensatz angelegt';
      if(lastRedeem.name == 'create_card') lastRedeemName = 'Karte angelegt';
      if(lastRedeem.name == 'daily_login') lastRedeemName = 'Login';
      if(lastRedeem.name == 'rating') lastRedeemName = 'Kartensatz bewertet';

      var currentLevel = levelForXp(totalXPpoints);
      var pointsRemaining = xpForLevel(currentLevel+1)-totalXPpoints;

      result = {
        totalXPoints: totalXPpoints,
        todayXPoints: todayXPoints,
        yesterdayXPoints: yesterdayXPoints,
        lastSevenDaysXPoints: lastSevenDaysXPoints,
        lastRedeem: {
          name: lastRedeemName,
          value: lastRedeem.value
        },
        currentLevel: currentLevel,
        pointsRemaining: pointsRemaining,
        pointsLevel: pointsPerLevel
      }

      
    }
    res.json(result);
    
  });
});

app.get('/rating/avg/:setId', forceSSL, ensureAuthenticated, function(req, res){
  var result = {
    totalValutations: 0,
    avgValutation: 0,
    setId: req.params.setId
  }

  db.view("rating", "by_set", { key: new Array(req.params.setId)}, function(err, body) {
    if(!_.isUndefined(body.rows) && !err && body.rows.length > 0) {
      var ratings = _.pluck(body.rows, "value");

      var avgValutation = (_.reduce(_.pluck(ratings, "value"), function(memo, num){ return memo + num; }, 0))/ratings.length;
      
      result.avgValutation = avgValutation;
      result.totalValutations = ratings.length;

      res.json(result);
    } else {
      console.log("[rating/by_set]", err);
      res.json(result);
    }
  });
});

app.get('/rating/permission/:setId', forceSSL, ensureAuthenticated, function(req, res){
  var setId = req.params.setId;
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  var owner = user.username;

  var ownerPermission = false;
  db.get(setId, function(err, body) {
    if (!err) {
      if(body.owner == owner) {
        res.json({"permission":false, "owner":false});
      }
    }
  });

  db.view("rating", "by_set_owner", { key: new Array(setId, owner)}, function(err, body) {
    if(!_.isUndefined(body.rows) && !err) {
      if(_.size(body.rows) == 0) {
        res.json({"permission": true});
      } else {
        res.json({"permission": false});
      }
    } else {
      console.log("[rating/by_set_owner]", err);
      res.send(404);
    }
  });  
});

app.get('/set/rating/:setId', forceSSL, ensureAuthenticated, function(req, res){
  db.view("rating", "by_set", { key: new Array(req.params.setId)}, function(err, body) {
    if(!_.isUndefined(body.rows) && !err && body.rows.length > 0) {
      var ratings = _.pluck(body.rows, "value");

      res.json(ratings);
    } else {
      console.log("[rating/by_set]", err);
      res.json([]);
    }
  });
});

app.post('/set/rating/:setId', forceSSL, ensureAuthenticated, function(req, res){
  var value = parseInt(sanitizer.sanitize(req.body.value));
  var comment = sanitizer.sanitize(req.body.comment);
  var setId = sanitizer.sanitize(req.params.setId);
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  var owner = sanitizer.sanitize(user.username);

  if(!comment && !value) res.send(400);

  if(comment.length >= 60) {
    db.insert({
        type: "rating",
        value: value,
        comment: comment,
        setId: setId,
        owner: owner
      },    
      function(err, body) {
        if(!err && body.ok) {
          redeemXPoints('rating', 1, owner);
          checkBadgeKritiker(user.username, req.sessionID);
          res.json(body);
        } else {
          res.send(404);
        }
      });
  } else {
    res.send(400);
  }   
});

app.get('/badge/:username', forceSSL, ensureAuthenticated, function(req, res){
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);
  user = user.username;

  db.view("badge", "by_name", function(err, body) {
    if(!_.isUndefined(body.rows) && !err && body.rows.length > 0) {
      var badges = _.pluck(body.rows, "value");
      var idxBadges = _.indexBy(badges, "_id");
      
        db.view("issuedBadge", "by_owner", { keys: new Array(user) }, function(err, body) {
          if(!_.isUndefined(body.rows) && !err && body.rows.length > 0) {
            var issuedBadges = _.sortBy(_.pluck(body.rows, "value"), function(badge) {
              return badge.rank;
            });

            _.each(issuedBadges, function(badge){
              var badgeType = badge.badge;

              var usrBadge = _.pick(badge, 'issuedOn', 'rank', 'score');
              if(_.has(idxBadges[badgeType], "user")) {
                if(idxBadges[badgeType].user.rank > usrBadge.rank) idxBadges[badgeType].user = usrBadge;
              } else {
                idxBadges[badgeType].user = usrBadge;
              }
            });
          }
          var results = _.flatten(idxBadges);

          db.view('badgeProgress', 'by_owner', { keys: new Array(user) }, function(err, body) {
            if(!err && _.size(body.rows) > 0) {
              var badgeProcess = _.pluck(body.rows, "value");

              _.each(badgeProcess, function(process){
                var b = _.findWhere(results, { _id: process.badge});
                
                if(_.has(b, "user")) {
                  b.user.progress = process.score;
                  b.user.nextRank = process.nextRank;
                } else {
                  b.user = {};
                  b.user.progress = process.score;
                  b.user.nextRank = process.nextRank;
                  b.user.rank = 3;
                }
              });
              res.json(results);
            } else {
              res.json(results);
            }
          });
        });
    } else {
      res.send(404);
    }
  });
});

var checkDaysInRow = function(daysInRow, username, callback) {
  db.view("xp", "by_owner_name_gained", { startkey: new Array(username, "daily_login" ), endkey: new Array(username, "daily_login", {})}, function(err, body){
    var keys = _.pluck(body.rows, "value");
    keys = _.sortBy(keys, function(key) { return -key.gained});

    var dates = _.pluck(keys, "gained");
    dates =  _.map(dates, function(date) {
      var d = new Date(date);
      return d;
    });

    var row = 1;
    for(var i = 0; i < _.size(dates); i++) {
      if(i == 0) continue;
      var current = dates[i];
      var prev = dates[i-1];

      if(current.isBefore(prev)) {
        var daysBetween = current.getDaysBetween(prev);
        if(daysBetween == 1) { 
          row++;
        } else if(daysBetween > 1) {
          break;
        }
      }
    }

    if(row >= daysInRow) {
      callback(true, row)
    } else {
      callback(false, row);
    }
  });
}

var sendMessageToUser = function(sessionID, messageType, messageObject) {
  setTimeout(function(){
    var socket = getSocketBySessionID(sessionID);
    if(socket != null) {
      socket.emit(messageType, messageObject);
    }
  }, 500);
}

var issueBadge = function(badge, owner, sessionID, rank, score, callback) {
  db.view("issuedBadge", "by_badge_owner_rank", { startkey: new Array(badge, owner, rank), endkey: new Array(badge, owner, rank)}, function(err, body){
    if(!_.isUndefined(body.rows) && !err && _.size(body.rows) > 0) {
            console.log("Badge '"+badge+"' ("+rank+") ALREADY issued for user '"+owner+"'");
    } else {
      db.insert({
          type: "issuedBadge",
          badge: badge,
          rank: rank,
          score: score,
          issuedOn: Math.round((new Date()).getTime() / 1000),
          owner: owner
        },    
        function(err, body) {
          if(!err && body.ok) {
            console.log("Badge '"+badge+"' ("+rank+") issued for user '"+owner+"'");

            db.get(badge, function(err, badge){
              console.log(badge);
              sendMessageToUser(sessionID, "badge", { badge: badge._id, rank: rank, title: badge.name});
            })
            
          } else {
            console.log("No Badge for '"+username+"'");
          }
        });
    }
    if(callback) callback();
  });
}

var setBadgeProgress = function(badge, owner, score, nextRank) {
  var badgeShort = badge.split("/")[1];

  var keys = new Array(owner, badge);

  db.get(owner+'/'+badge, function(err, body){
    if(err) {
      var badgeProgress = {};
      badgeProgress._id = owner+'/'+badge;
      badgeProgress.badge = badge;
      badgeProgress.owner = owner;
      badgeProgress.score = score;
      badgeProgress.nextRank = nextRank;
      badgeProgress.type = "badgeProgress";

      db.insert(badgeProgress,
      function(err, body){
        if(!err && body.ok) {
          
        } else {
          
        }
      }); 
    } else {
      var badgeProgress = body;
      badgeProgress.score = score;
      badgeProgress.nextRank = nextRank;

      db.insert(badgeProgress,    
      function(err, body) {
        if(!err && body.ok) {
          
        } else {
          
        }
      });  
    }
  });
}


var checkBadgeStammgast = function(owner, sessionID) {
  var badge = 'badge/stammgast';
  db.get(badge, function(err, body) {
  if (!err) {
    _.each(body.rank, function(days) {
      
      checkDaysInRow(days, owner, function(result, days){
        var rank = _.indexOf(_.values(body.rank), days)+1;
        var nextRank = _.indexOf(_.values(body.rank), days);
        if(nextRank > 3 || nextRank < 1) nextRank = 3;


        if(result) {
          issueBadge(badge, owner, sessionID, rank, days);
        }
        setBadgeProgress(badge, owner, days, body.rank[nextRank]);
      })
    });
  }
});
}

var checkBadgeMeteor = function(owner, sessionID) {
  var badge = "badge/meteor";
  db.get(badge, function(err, body) {
    if (!err) {
      var rank = body.rank;
      db.view('score', 'game_by_game_user', { keys: new Array(new Array("meteor", owner)) }, function(err, body) {
        if(!_.isUndefined(body) && _.has(body, "rows")) {
          var scores = _.pluck(body.rows, "value");

          var level = _.filter(scores, function(score) { return score.level >= 10 });

          var levels = _.groupBy(level, "setId");

          var maxLevels = new Array();
          _.each(levels, function(level) {
            maxLevels.push(_.max(level, function(lvl){ return lvl.level }));
          });

          maxLevels = _.groupBy(maxLevels, "setId");

          var xo = _.groupBy(_.flatten(maxLevels), function(lvl){
                      if(lvl.level >= 30) return "thirty";
                      if(lvl.level >= 20 && lvl.level < 30) return "twenty";
                      if(lvl.level < 20) return "ten";
                    })
          var rankValue = rank[2];
          var nextRank = rank[3];

          if(_.has(xo, "ten")){
            if(xo.ten.length >= 2) {
              issueBadge(badge, owner, sessionID, 3, xo.ten.length);
            } else  {
              setBadgeProgress(badge, owner, 5-xo.ten.length, 10);
            }
          }
          if(_.has(xo, "twenty")){
            if(xo.twenty.length >= 2) {
              issueBadge(badge, owner, sessionID, 3, xo.twenty.length);
            } else  {
              setBadgeProgress(badge, owner, 5-xo.twenty.length, 20);
            }
          }
          if(_.has(xo, "thirty")){
            if(xo.thirty.length >= 2) {
              issueBadge(badge, owner, sessionID, 3, xo.thirty.length);
            } else  {
              setBadgeProgress(badge, owner, 5-xo.thirty.length, 30);
            }
          }
          if(!_.has(xo, "ten") && !_.has(xo, "twenty") && !_.has(xo, "thirty")) {
            setBadgeProgress(badge, owner, 0, 10);
          }
        }
      });
    }
  });
}

var checkBadgeAutor = function(owner, sessionID) {
    var badge = "badge/autor";
    db.get(badge, function(err, body) {
      if (!err) {
        var rank = body.rank;
        db.view('sets', 'by_id_with_cards', function(err, body) {
        var sets = _.filter(body.rows, function(row){ return ((row.key[1] == 0) && ( row.value.owner == owner )); })

        _.each(sets, function(set){      
          var cardCnt = _.filter(body.rows, function(row){ return ((row.key[1] == 1) && (row.value.setId == set.value._id)); });
          set.value.cardCnt = cardCnt.length;

          if(!_.has(set.value, "category") && _.isUndefined(set.value.category)) set.value.category = "";
        }, this);

        sets = _.pluck(sets, "value");

        sets = _.filter(sets, function(set){ return set.cardCnt >= 5 && set.visibility == 'public' });

        var rankValue = 3;
        var nextRank = rank[3];
        _.each(rank, function(r){
          if(sets.length >= r) {
            if(rank[_.indexOf(_.values(rank), r)] > nextRank) nextRank = rank[_.indexOf(_.values(rank), r)];
            rankValue = _.indexOf(_.values(rank), r)+1;
            issueBadge(badge, owner, sessionID, rankValue, sets.length);
          }
        });
        setBadgeProgress(badge, owner, sets.length, nextRank);
      });
    }
  });
}

function average (arr)
{
  return _.reduce(arr, function(memo, num)
  {
    return memo + num;
  }, 0) / arr.length;
}

var checkBadgeKritikerLiebling = function(owner, sessionID) {
    var badge = "badge/krone";
    db.get(badge, function(err, body) {
      if (!err) {
        var rank = body.rank;

        db.view('sets', 'by_owner', { startkey: new Array(owner), endkey: new Array(owner) }, function(err, body) {
          if(!err && _.size(body.rows) > 0) {
            var setIds = _.pluck(body.rows, "id");
            setIds = _.map(setIds, function(set) { return new Array(set)});

            db.view('rating', 'by_set', { keys: setIds }, function(err, body) {
              if(!err && _.size(body.rows) > 0) {
                var ratings = _.groupBy(_.pluck(body.rows, "value"), "setId");

                var cntRatedSets = 0;
                _.each(ratings, function(rating) {
                  if(rating.length >= 5) {
                    var values = _.pluck(rating, "value");
                    var avg = average(values);
                    if(avg >= 4.5) cntRatedSets++;
                  }
                });

                var rankValue = rank[2];
                var nextRank = rank[3];
                _.each(rank, function(r){
                  if(cntRatedSets >= r) {
                    if(rank[_.indexOf(_.values(rank), r)] > nextRank) nextRank = rank[_.indexOf(_.values(rank), r)];
                    rankValue = _.indexOf(_.values(rank), r)+1;
                    issueBadge(badge, owner, sessionID, rankValue, cntRatedSets);
                  }
                });
                setBadgeProgress(badge, owner, cntRatedSets, nextRank);
              } else {
                setBadgeProgress(badge, owner, 0, rank[3]);
              }
              
            });
          }
        });
    }
  });
}

var checkBadgeStreber = function(owner, sessionID) {
  var badge = "badge/streber";
  var username = owner;

  db.get(badge, function(err, body) {
    if (!err) {
      var rank = body.rank;

      db.view('cards', 'personal_card_by_owner', { startkey: new Array(username), endkey: new Array(username, {}) }, function(err, body) {
        if(!err && !_.isUndefined(body.rows) && _.size(body.rows) > 0) {
          var cards = _.filter(body.rows, function(row){ return row.key[2] == 0; });
          var setIds = new Array();
          _.each(cards, function(card){      
            var persCard = _.filter(body.rows, function(row){ return ((row.key[2] == 1) && (row.value.cardId == card.value._id)); });

            if(!_.isUndefined(persCard) && !_.isEmpty(persCard)) {
              setIds.push(card.value.setId);
            }
          }, this);
          setIds = _.uniq(setIds);

          var setKeys = new Array();
          _.each(setIds, function(id){
            setKeys.push(new Array(id));
          })

          db.view('cards', 'by_set', { keys: setKeys }, function(err, body) {
            if (!err) {
              var docs = _.map(body.rows, function(doc) { return doc.value});

              var cards = _.groupBy(docs, "setId");
              var cardIds = _.pluck(docs, "_id");

              var learnedCards = 0;
              var keys = new Array();

              _.each(cardIds, function(id){
                keys.push(new Array(id));
              });

              db.view('cards', 'personal_card_by_cardId', { keys: keys}, function(err, body) {
                if (!err) {
                  var docs = _.map(body.rows, function(doc) { return doc.value});
                  
                  var learnedCards = new Array();
                  _.each(docs, function(doc){
                    if(doc.times_learned >= 1) learnedCards.push(doc);
                  });

                  var sets = _.groupBy(learnedCards, "setId");

                  if(_.has(sets, "undefined")) delete sets.undefined;

                  var completeLearnedSets = 0;
                  _.each(_.keys(sets), function(set){
                    if(_.size(sets[set]) == _.size(cards[set])) completeLearnedSets++;
                  });
                  var rankValue = rank[2];
                  var nextRank = rank[3];
                  _.each(rank, function(r){
                    if(completeLearnedSets >= r) {
                      if(rank[_.indexOf(_.values(rank), r)] > nextRank) nextRank = rank[_.indexOf(_.values(rank), r)];
                      rankValue = _.indexOf(_.values(rank), r)+1;
                      issueBadge(badge, owner, sessionID, rankValue, completeLearnedSets);
                    }
                  });
                  setBadgeProgress(badge, owner, completeLearnedSets, nextRank);
                }
              });
            }
          });
        } 
      }); 
    }
  }); 
}

var checkBadgeKritiker = function(owner, sessionID) {
    var badge = "badge/kritiker";
    db.get(badge, function(err, body) {
      if (!err) {
        var rank = body.rank;
        db.view('rating', 'by_owner', { startkey: new Array(owner), endkey: new Array(owner) }, function(err, body) {
        var sets = _.pluck(body.rows, "value");
        sets = _.filter(sets, function(set){ 
          if(_.has(set, "comment")) {
            return set.comment.length >= 60;
          } else {
            return false;  
          }
          
        });

        var nextRank = rank[2];
        var nextRank = rank[3];
        _.each(rank, function(r){
          if(sets.length >= r) {
            if(rank[_.indexOf(_.values(rank), r)] > nextRank) nextRank = rank[_.indexOf(_.values(rank), r)];
            rankValue = _.indexOf(_.values(rank), r)+1;
            issueBadge(badge, owner, sessionID, rankValue, sets.length);
          }
          setBadgeProgress(badge, owner, sets.length, nextRank);
        });
        
      });
    }
  });
}

app.get('/badges/issuer', function(req, res) {
  res.json({
    name : "THM - Technische Hochschule Mittelhessen",
    url : "http://www.thm.de/"
  });
});

app.get('/badges/badge/:badge/:rank.json', function(req, res) {
  var badge = "badge/"+req.params.badge;
  var rank = req.params.rank;
  var badgeUrl = nconf.get("badge_url");
  db.get(badge, function(err, badge){
    if(!err) {

      var badgeClass = {};

      var rankStr = "Gold";
      if(rank == 3) rankStr = "Bronze";
      if(rank == 2) rankStr = "Silber";
      badgeClass.name = badge.name + " (" + rankStr + ")";
      badgeClass.description = badge.description;
      badgeClass.image = badgeUrl + "/" + badge._id + "_" + rank + ".png";
      badgeClass.criteria = badgeUrl + "/" + badge._id + ".html";
      badgeClass.issuer = badgeUrl + "issuer";

      res.json(badgeClass);
    } else {
      console.log(err);
      res.send(404);
    }
  });

});
app.get('/badges/badge/:badge:rank.html', function(req, res) {
  res.json({ everything: "cool html" });
});

app.get('/syncbadges', ensureAuthenticated, function(req, res) {
  var user = req.session.passport.user;
  if(_.isArray(user)) user = _.first(req.session.passport.user);

  var badgesToIssue = new Array();
  var badgeUrl = nconf.get("badge_url");

  db.view("issuedBadge", "by_owner", { keys: new Array(user.username) }, function(err, body) {
    if(!_.isUndefined(body.rows) && !err && _.size(body.rows) > 0 && user.email != null) {
      var issuedBadges = _.sortBy(_.pluck(body.rows, "value"), function(badge) {
        return badge.rank;
      });
      
      db.view("users", "by_username", { keys: new Array(user.username) }, function(err, body) {
        if(!err && _.size(body.rows) > 0) {
          var user = _.first(body.rows).value;

          _.each(issuedBadges, function(badge){
            var data = {};

            data.uid = badge._id;
            data.recipient = { type: "email", hashed: false, identity: user.email };
            data.image = badgeUrl + badge.badge + "_" + badge.rank + ".png";
            data.evidence = badgeUrl + badge.badge + ".html";
            data.issuedOn = badge.issuedOn;
            data.badge = badgeUrl + badge.badge + "/" + badge.rank + ".json";
            data.verify = { type: "signed", url: badgeUrl + "public.pem" };

            var signature = jws.sign({
              header: { alg: 'rs256'},
              payload: data,
              secret: fs.readFileSync('private.pem')
            });

            badgesToIssue.push(signature);
          });
          res.json(badgesToIssue);
        }
      });
    } else {
      res.send(404);
    }
  });
});

if(process.env.NODE_ENV === 'production') {
  process.on('uncaughtException', function (err) {
    console.log(err);
    process.exit(1); 
  });

  https_server.listen(443, function(){
    console.log("https_server listening on port " + 443);
  });
}


http_server.listen(app.get("port"), function(){
  console.log("http_server listening on port " + app.get("port"));
});
