
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
  , date = require('date-utils')
  , nconf = require('nconf').file(process.env.NODE_ENV+'_settings.json')
  , nano = require('nano')(nconf.get('couchdb'))
  , db = nano.use('thmcards')
  , _ = require('underscore')
  , passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy
  , GoogleStrategy = require('passport-google').Strategy
  , app = express()
  ;


var secret = 'some secret';
var sessionKey = 'express.sid';
var cookieParser = express.cookieParser(secret);
var sessionStore = new express.session.MemoryStore()

var srv = http.createServer(app);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon(__dirname + '/public/img/favicon.ico'));
  app.use(cookieParser);
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ store: sessionStore, key: sessionKey, cookie: { httpOnly: true, secure: true } }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

var io = require('socket.io').listen(srv);

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

  socket.on('disconnect', function() {
    console.log("DISCONNECT: ", socket);
  });
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

var calcInterval = function(current_interval, last_rated, callback) {
  var interval;
  if(last_rated < 3) {
    interval = 1;
  }
  else {
    interval = parseInt(current_interval) + 1;
  }
  console.log("Interval(number): " + interval);

  if(_.isUndefined(callback)) return interval;
  callback(interval);
}

var calcEF = function(ef_old, last_rated, callback) {
  var ef;

  ef= parseFloat(ef_old)+(0.1-(5-parseInt(last_rated))*(0.08+(5-parseInt(last_rated))*0.02));
  if(ef<1.3) {
    ef = 1.3;
  }

  console.log("EF: " + ef);

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

  console.log("Interval in days before: " + interval_days_before)
  console.log("Interval in days after: " + interval_days)
  return interval_days;
}

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
        "username": user.username,
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
      if(_.size(body.rows) > 0) {
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
    redeemLoginXPoints(_.first(res.req.user).username);
    checkBadgeStammgast(_.first(res.req.user).username, res.sessionID);
    res.redirect('/');
  }
);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email, user_about_me'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    redeemLoginXPoints(_.first(res.req.user).username);
    checkBadgeStammgast(_.first(res.req.user).username, res.sessionID);
    res.redirect('/');
  }
);

app.get('/auth/google', passport.authenticate('google'));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    redeemLoginXPoints(_.first(res.req.user).username);
    checkBadgeStammgast(_.first(res.req.user).username, res.sessionID);
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

app.get('/set/category', function(req, res){
  db.view('misc', 'all_set_categories', { group: true }, function(err, body) {
    
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return {name: _.first(doc.key), count: doc.value }});
      res.json(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
    }
  });
});

app.get('/typeahead/set/category', function(req, res){
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

app.get('/typeahead/set/visibility', function(req, res){
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

app.get('/set/category/:category', function(req, res){
  var category = req.params.category;

  db.view('sets', 'by_category', { startkey: new Array(category), endkey: new Array(category, {}) }, function(err, body) {
    
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return doc.value });
      res.json(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
    }
  });
});

app.get('/set/:id/personalcard', function(req, res){
  var username = req.session["passport"]["user"][0].username;
  console.log("personalcard api");

  db.view('cards', 'personal_card', { startkey: new Array(username), endkey: new Array(username, {}) }, function(err, body) {

    var cards = _.filter(body.rows, function(row){ return ((row.key[2] == 0) && row.value.setId == req.params.id); })
    _.each(cards, function(card){      
      var persCard = _.filter(body.rows, function(row){ return ((row.key[2] == 1) && (row.value.cardId == card.value._id)); });
      card.value.persCard = persCard;
    }, this);
    cards = _.pluck(cards, "value");

    res.json(_.sortBy(cards, function(card){ return card.created }));
  });
});

app.get('/set/learned', ensureAuthenticated, function(req, res){
  var username = req.session["passport"]["user"][0].username;

  db.view('cards', 'personal_card', { startkey: new Array(username), endkey: new Array(username, {}) }, function(err, body) {
    var cards = _.filter(body.rows, function(row){ return row.key[2] == 0; });
    var setIds = new Array();
    _.each(cards, function(card){      
      var persCard = _.filter(body.rows, function(row){ return ((row.key[2] == 1) && (row.value.cardId == card.value._id)); });

      if(!_.isUndefined(persCard) && !_.isEmpty(persCard)) {
        setIds.push(card.value.setId);
      }
    }, this);
    setIds = _.uniq(setIds);

    db.get("_all_docs", { keys: setIds, include_docs: true } , function(err, body) {
      if(!err) {
        var docs = _.pluck(body.rows, "doc");
        _.each(docs, function(doc){
          doc.cardCnt = "-";

          if(!_.has(doc, "category") && _.isUndefined(doc.category)) doc.category = "";
        })
        res.json(docs);
      }
    });
  });
});

app.get('/set/:id/card', function(req, res){
  console.log("using normal api!");
  console.log(req.params);
  db.view('cards', 'by_set', { key: new Array(req.params.id) }, function(err, body) {
    
    if (!err) {
      var docs = _.map(body.rows, function(doc) { return doc.value});
      res.json(docs);
    } else {
      console.log("[db.cards/by_set]", err.message);
    }
  });
});

app.get('/set/:id/memo/card', function(req, res){
  console.log("using memo api!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  var username = req.session["passport"]["user"][0].username;

  db.view('cards', 'personal_card', { startkey: new Array(username), endkey: new Array(username, {}) }, function(err, body) {

    var cards = _.filter(body.rows, function(row){ return ((row.key[2] == 0) && row.value.setId == req.params.id); })
    _.each(cards, function(card){      
      var persCard = _.filter(body.rows, function(row){ return ((row.key[2] == 1) && (row.value.cardId == card.value._id)); });
      card.value.persCard = persCard;
    }, this);
    cards = _.pluck(cards, "value");

    //var cardsFiltered = _.filter(cards, function(card){console.log(JSON.stringify(card.persCard[0].value.sm_ef));})
    console.log("....................");

    res.json(_.sortBy(cards, function(card){ return card.created }));
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

app.get('/user/:username', ensureAuthenticated, function(req, res){
  db.view('users', 'by_username', { key: req.params.username }, function(err, body) {
    if(!_.isUndefined(body.rows) && _.size(body.rows) > 0) {

      var userInfo = _.first(body.rows).value;
      res.json(userInfo);
    } else {
      console.log("user/username", body);
    }
    
  });
});

app.put('/user/:username', ensureAuthenticated, function(req, res){
  if(req.params.username === req.session["passport"]["user"][0].username) {
      db.view('users', 'by_username', { key: new Array(req.params.username) }, function(err, body) {
        var user = body.rows[0].value;
        var name = req.body.name;

        user.name = name;  

        db.insert(user, body.rows[0].id, function(err, body){
          if(!err) {
            res.json(body); 
          } else {
            console.log("[db.users/by_username]", err.message);
          }
          
        });
      });
  }
});

app.get('/set', ensureAuthenticated, function(req, res){
  setTimeout(function(){

    checkBadgeKritikerLiebling(req.session["passport"]["user"][0].username, req.sessionID);

  }, 5000);
    
  db.view('sets', 'by_id_with_cards', function(err, body) {
    var sets = _.filter(body.rows, function(row){ return ((row.key[1] == 0) && ( row.value.owner == req.session["passport"]["user"][0].username )); })

    _.each(sets, function(set){      
      var cardCnt = _.filter(body.rows, function(row){ return ((row.key[1] == 1) && (row.value.setId == set.value._id)); });
      set.value.cardCnt = cardCnt.length;

      if(!_.has(set.value, "category") && _.isUndefined(set.value.category)) set.value.category = "";
    }, this);
    sets = _.pluck(sets, "value");

    res.json(_.sortBy(sets, function(set){ return set.name }));
  });
});

app.post('/set', ensureAuthenticated, function(req, res){
  var time = new Date().getTime();

  var data = req.body;
  data.owner = req.session["passport"]["user"][0].username;
  data.type = "set";
  data.created = time;
  data.rating = (req.body.rating === 'true');

  db.insert(
    data, 
    function(err, body, header){
      if(err) {
        console.log('[db.insert] ', err.message);
        return;
      }
      redeemXPoints("create_set", 2, req.session["passport"]["user"][0].username);
      db.get(body.id, { revs_info: false }, function(err, body) {
        if (!err)
          res.json(body);
      });
  });  
});

app.put('/set/:setid', ensureAuthenticated, function(req, res){
  db.view('sets', 'by_id', { key: new Array(req.body._id)}, function(err, body) {
    if (!err) {
      doc = _.map(body.rows, function(doc) { return doc.value});

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
    }
   });

});

app.delete('/set/:setid', ensureAuthenticated, function(req, res){
  checkOwner(req.params.setid, req.session["passport"]["user"][0].username, function(){
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

app.get('/card/:id', ensureAuthenticated, function(req, res){
  db.view('cards', 'by_id', { key: new Array(req.params.id) }, function(err, body) {
    if (!_.isUndefined(body.rows) && !err && body.rows.length > 0) {
      var card = body.rows[0].value;
      res.json(card);
    } else {
      console.log("[db.cards/by_id]", err.message);
      res.json(404);
    }
   });
});

app.put('/card/:id', ensureAuthenticated, function(req, res){
  checkOwner(req.body._id, req.session["passport"]["user"][0].username, function(){
    db.view('cards', 'by_id', { key: new Array(req.params.id) }, function(err, body) {
      var card = body.rows[0].value;
      var front = req.body.front;
      var back = req.body.back;

      card.front = front;
      card.back = back;  

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

app.delete('/card/:id', ensureAuthenticated, function(req, res) {
  checkOwner(req.params.id, req.session["passport"]["user"][0].username, function(){
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
                  console.log("personalcard" + err);
                  console.log("personalcard" + body);
                });               
                console.log("card deleted");
                res.json(body);   
              }    
            });
          } else {
                console.log('[db.delete] ', err.message);            
          }
        });
      }
    });
  }, function(){
    res.send(403);
  });
});

app.post('/card', ensureAuthenticated, function(req, res){
  var owner = req.session["passport"]["user"][0].username;
  checkOwner(req.body.setId, owner, function(){
    var time = new Date().getTime();

    db.insert(
      { 
        "created": time,
        "owner": owner,
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

app.post('/personalcard/:cardid', ensureAuthenticated, function(req, res){
  var time = new Date().getTime();
  var username = req.session["passport"]["user"][0].username;
  console.log("creating new personalcard");

  //unterscheidung sm und leitner für smtimeslearned 0 oder 1
    db.insert(
      { 
        "created": time,
        "owner": req.session["passport"]["user"][0].username,
        "cardId": req.body._id,
        "box": req.body.persCard.value.box || "1",
        "type": "personal_card",
        "times_learned": "1",
        "sm_times_learned": "0",
        "sm_interval": "0",
        "sm_ef": "2.5",
        "sm_instant_repeat": "0",
        "sm_interval_days": "0",
        "sm_last_learned": "0"
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
          }
        });
    });
  });


app.put('/personalcard/:cardid', ensureAuthenticated, function(req, res){
  var time = new Date().getTime();
  var today = Date.today();
  var username = req.session["passport"]["user"][0].username;
  console.log(req.body.persCard.value);
  console.log("heute: " + today);

  db.view('cards', 'personal_card_by_cardId', { key: new Array(req.body._id)}, function(err, body) {
    if (!err){  
      var docs = _.filter(body.rows, function(row){ return (row.value.owner == username ); })  
      docs = _.map(docs, function(doc) { 
        return doc.value
      });
      if (body.rows.length){
        console.log("sm_times_learned: " + docs[0].sm_times_learned);
        console.log(today);
        console.log(req.body.persCard.value);

        if (_.has(req.body.persCard.value, "last_rated")){
          console.log("personalcard --> supermemo");
          calcInterval(_.first(docs).sm_interval, req.body.persCard.value.last_rated, function(interval){
            calcEF(_.first(docs).sm_ef, req.body.persCard.value.last_rated, function(ef){
              var interval_days = calcIntervalDays(interval, parseInt(docs[0].sm_interval_days), ef);    

              var instant_repeat = "0";
              if (parseInt(req.body.persCard.value.last_rated) < 4) {
                instant_repeat = "1"
              }

              db.insert(
              { 
                "_rev": docs[0]._rev,
                "created": docs[0].created,
                "owner": docs[0].owner,
                "cardId": docs[0].cardId,
                "type": docs[0].type,
                "box": docs[0].box,
                "times_learned": parseInt(docs[0].times_learned) + 1,
                "sm_times_learned": parseInt(docs[0].sm_times_learned) + 1,
                "sm_interval": interval,
                "sm_ef": ef,
                "sm_interval_days": interval_days,
                "sm_instant_repeat": instant_repeat,
                "sm_last_learned": today
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
          console.log("personalcard --> leitner");
              db.insert(
              { 
                "_rev": docs[0]._rev,
                "created": docs[0].created,
                "owner": docs[0].owner,
                "cardId": docs[0].cardId,
                "type": docs[0].type,
                "box": req.body.persCard.value.box  || docs[0].box,
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
    }
  });
});

app.get('/score/:username', ensureAuthenticated, function(req, res){
  var game = "meteor";
  var user = req.session["passport"]["user"][0].username;

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
              owner: req.session["passport"]["user"][0].username,
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
        owner: req.session["passport"]["user"][0].username,
        game: "meteor",
        score: 0,
        gameCnt: 0,
        games: {}
      });
    }
  });
});

app.get('/score/:username/:set', function(req, res){
  var game = "meteor";
  var user = req.session["passport"]["user"][0].username;
  var setId = req.params.set;

  var result = { score: 0, badges: 0, badgesTotal: 0 };

  db.view('score', 'score_by_game_user_set', { key: new Array(game, user, setId) }, function(err, body) {
    if(!_.isUndefined(body.rows) && !err && body.rows.length > 0) {
      var score = _.first(body.rows);
      result.score = score.value;
      res.json(result);
    } else {
      res.json(result);
    }
  });
});


app.post('/score/:username', ensureAuthenticated, function(req, res){
    var game = 'meteor';
    var owner = req.body.owner;
    var setId = req.body.setId;
    var points = req.body.points;

    if(points > 0) {
      db.insert({
        type: "score",
        game: game,
        owner: owner,
        setId: setId,
        owner: owner
      },    
      function(err, body) {
              
      });  
    }

    db.view('score', 'score_by_game_set', { key: new Array(game, setId) }, function(err, body) {
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
          });

});

app.get('/xp/:username', ensureAuthenticated, function(req, res){
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

      
    } else {

    }
    res.json(result);
    
  });
});

app.get('/rating/avg/:setId', ensureAuthenticated, function(req, res){
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

app.get('/rating/permission/:setId', ensureAuthenticated, function(req, res){
  var setId = req.params.setId;
  var owner = req.session["passport"]["user"][0].username;

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
    }
  });  
  

});

app.get('/set/rating/:setId', ensureAuthenticated, function(req, res){
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

app.post('/set/rating/:setId', ensureAuthenticated, function(req, res){
  var value = parseInt(req.body.value);
  var comment = req.body.comment;
  var setId = req.params.setId;
  var owner = req.session["passport"]["user"][0].username;

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
      checkBadgeKritiker(req.session["passport"]["user"][0].username, req.sessionID);
      res.json(body);
    } else {
      res.send(404);
    }
  });


});

app.get('/badge/:username', ensureAuthenticated, function(req, res){
  var user = req.session["passport"]["user"][0].username;

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
            //7res.json(_.flatten(idxBadges));
          }/* else {
            res.json(_.flatten(idxBadges));      
          }*/
          var results = _.flatten(idxBadges);
          console.log("------");
          console.log(results);
          console.log("------");

          db.view('badgeProgress', 'by_owner', { keys: new Array(user) }, function(err, body) {
            console.log("body", body);
            if(!err && !_.isEmpty(body.rows)) {
              var badgeProgress = _.pluck(body.rows, "value");
              console.log("progresssadasd", badgeProgress);
              var badges = new Array();
              
              
                _.each(badgeProgress, function(progress){
                  _.each(results, function(badge){
                  console.log(badge._id, progress.badge)
                  if(badge._id == progress.badge && _.has(badge, "user")) {
                    badge.user.progress = progress.score;
                    badge.user.nextRank = progress.nextRank;
                    console.log(badge._id, badge.user.issuedOn);
                  } else {
                    if(!_.has(badge, "user")) {
                      badge.user = {};
                      badge.user.progress = 0;
                      badge.user.issuedOn = 0;
                      badge.user.rank = 3;
                      badge.user.nextRank = badge.rank[2];  
                    }
                    
                  }
                });
              });
              res.json(results);
            }

          });
        });
    } else {

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
      return new Array(d.getFullYear(),(d.getMonth()+1),d.getDate());
    })
    var next = 0;

    var sequentialDays = 0;
    var daysInARow = false;
    for(var i=0; i < dates.length; i++) {
      
      if(i < dates.length-1) {
        next = i+1;
      } else {
        next = i;
      }
      try {
        if(dates[i][0] == dates[next][0] && dates[i][1] == dates[next][1] && (dates[i][2]-1) == dates[next][2]) {
          sequentialDays++;
          if(sequentialDays >= daysInRow) daysInARow = true;
        } else {
          sequentialDays = 0;
        }
      } catch (e) {
        break;
      }
    }
    callback(daysInARow);
  });
}

var sendMessageToUser = function(sessionID, messageType, messageObject) {
  console.log(sessionID, messageType, messageObject);
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

  db.view('badgeProgress', 'by_owner_badge', { startkey: new Array(owner, badge), endkey: new Array(owner, badge) }, function(err, body) {
    if(!err) {
      console.log("badge progress", badge, owner, score, nextRank);
      

      if(_.isEmpty(body.rows)) {
        var badgeProgress = {};
        badgeProgress.badge = badge;
        badgeProgress.owner = owner;
        badgeProgress.score = score;
        badgeProgress.nextRank = nextRank;
        badgeProgress.type = "badgeProgress";

        db.insert(badgeProgress,
        function(err, body){
          if(!err && body.ok) {
            console.log("new score update");
          } else {
            console.log("new score fail");
          }
        });

      } else {
        var badgeProgress = _.first(body.rows).value;
        console.log(badgeProgress);
        badgeProgress.score = score;
        badgeProgress.nextRank = nextRank;

        db.insert(badgeProgress,    
        function(err, body) {
          if(!err && body.ok) {
            console.log("score update");
          } else {
            console.log("score error");
          }
        });          
      }

      
    }
  });
}


var checkBadgeStammgast = function(owner, sessionID) {
  var badge = 'badge/stammgast';
  db.get(badge, function(err, body) {
  if (!err) {
    _.each(body.rank, function(days) {
      
      checkDaysInRow(days, owner, function(result){
        var rank = _.indexOf(_.values(body.rank), days)+1;
        
        if(result) {
          issueBadge(badge, owner, sessionID, rank, result);
        }
      })
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
        var nextRank = rank[2];
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
            console.log(setIds);
            setIds = _.map(setIds, function(set) { return new Array(set)});

            db.view('rating', 'by_set', { keys: setIds }, function(err, body) {
              if(!err && _.size(body.rows) > 0) {
                var ratings = _.groupBy(_.pluck(body.rows, "value"), "setId");
                console.log(ratings);

                var cntRatedSets = 0;
                _.each(ratings, function(rating) {
                  if(rating.length >= 5) {
                    var values = _.pluck(rating, "value");
                    var avg = average(values);
                    console.log(avg);
                    if(avg >= 4.5) cntRatedSets++;
                  }
                });

                var rankValue = rank[2];
                var nextRank = 0;
                _.each(rank, function(r){
                  if(cntRatedSets >= r) {
                    if(rank[_.indexOf(_.values(rank), r)] > nextRank) nextRank = rank[_.indexOf(_.values(rank), r)];
                    rankValue = _.indexOf(_.values(rank), r)+1;
                    issueBadge(badge, owner, sessionID, rankValue, cntRatedSets);
                  }
                });
                setBadgeProgress(badge, owner, cntRatedSets, nextRank);
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
          return set.comment.length >= 60;
        });

        var nextRank = rank[2];
        var rankValue = 3;
        _.each(rank, function(r){
          if(sets.length >= r) {
            if(rank[_.indexOf(_.values(rank), r)] > nextRank) nextRank = rank[_.indexOf(_.values(rank), r)];
            console.log("next", nextRank, rank[_.indexOf(_.values(rank), r)], _.values(rank));
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
  //res.json({ everything: "cool json" });
  var badge = "badge/"+req.params.badge;
  var rank = req.params.rank;
  var badgeUrl = nconf.get("badge_url");
  console.log(badge);
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
    }
  });

});
app.get('/badges/badge/:badge:rank.html', function(req, res) {
  res.json({ everything: "cool html" });
});

app.get('/syncbadges', function(req, res) {
  var owner = "dan.knapp@web.de";
  var badgesToIssue = new Array();
  var badgeUrl = nconf.get("badge_url");
db.view("issuedBadge", "by_owner", { keys: new Array(owner) }, function(err, body) {
          if(!_.isUndefined(body.rows) && !err && _.size(body.rows) > 0) {
            var issuedBadges = _.sortBy(_.pluck(body.rows, "value"), function(badge) {
              return badge.rank;
            });

            //res.json(issuedBadges);
            
            db.view("users", "by_username", { keys: new Array(owner) }, function(err, body) {
              if(!err && _.size(body.rows) > 0) {
                var user = _.first(body.rows).value;
                


                _.each(issuedBadges, function(badge){
                  var data = {};

                  data.uid = badge._id;
                  data.recipient = { type: "email", hashed: false, identity: user.username };
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

          }
        });




/*
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
    "url": "http://thmcards.jit.su/badges/public.pem"
  }
};

  var signature = jws.sign({
    header: { alg: 'rs256'},
    payload: data,
    secret: fs.readFileSync('private.pem')
  });
  
  res.set('Content-Type', 'text/plain');
  res.send(signature);*/
});

app.get('/progress', function(req, res) {

var badge = "badge/kritiker";
var owner = "dan.knapp@web.de";
var score = 10;
var rank = 3;

setBadgeProgress(badge, owner, score, rank);

});



srv.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

