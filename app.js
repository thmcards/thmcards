
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
  app.use(express.session({ store: sessionStore, key: sessionKey }));
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
  console.log('Socket connected with SID: ' + socket.handshake.sessionID);
  socket.set('sessionID', socket.handshake.sessionID);

  socket.on('disconnect', function() {
    console.log("DISCONNECT");
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
    checkBadgeStammgast(_.first(res.req.user).username);
    res.redirect('/');
  }
);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email, user_about_me'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    redeemLoginXPoints(_.first(res.req.user).username);
    checkBadgeStammgast(_.first(res.req.user).username);
    res.redirect('/');
  }
);

app.get('/auth/google', passport.authenticate('google'));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    redeemLoginXPoints(_.first(res.req.user).username);
    checkBadgeStammgast(_.first(res.req.user).username);
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
  //check for supermemo values and filter...

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

app.get('/user/:username', ensureAuthenticated, function(req, res){
  db.view('users', 'by_username', { key: new Array(req.params.username) }, function(err, body) {
    if(!_.isUndefined(body.rows) && _.isArray(body.rows)) {
      var userInfo = body.rows[0].value;
      res.json(userInfo);
    } else {
      console.log("user/username", body);
    }
    
  });
});

app.put('/user/:username', ensureAuthenticated, function(req, res){

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

});

app.get('/set', ensureAuthenticated, function(req, res){
  console.log("session", req.sessionID);

  setTimeout(function(){
  var socket = getSocketBySessionID(req.sessionID);
  if(socket != null) {
    socket.emit("badge", { badge: "badge/stammgast", rank: 3, title: "Stammgast (YOLO STYLE)"});
  }
  
  }, 2000);
  


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
  checkOwner(req.body.setId, req.session["passport"]["user"][0].username, function(){
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
        redeemXPoints("create_card", 2, req.session["passport"]["user"][0].username);
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
    db.insert(
      { 
        "created": time,
        "owner": req.session["passport"]["user"][0].username,
        "cardId": req.body._id,
        "box": req.body.persCard.value.box || "1",
        "type": "personal_card"
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
  var username = req.session["passport"]["user"][0].username;
  db.view('cards', 'personal_card_by_cardId', { key: new Array(req.body._id)}, function(err, body) {
    if (!err){  
      var docs = _.filter(body.rows, function(row){ return (row.value.owner == username ); })  
      docs = _.map(docs, function(doc) { 
        return doc.value
      });
      if (body.rows.length){
        db.insert(
        { 
          "_rev": docs[0]._rev,
          "created": docs[0].created,
          "owner": docs[0].owner,
          "cardId": docs[0].cardId,
          "box": req.body.persCard.value.box  || docs[0].box,
          "type": docs[0].type
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
              console.log('type', idxBadges[badgeType]);

              var usrBadge = _.pick(badge, 'issuedOn', 'rank', 'score');
              if(_.has(idxBadges[badgeType], "user")) {
                if(idxBadges[badgeType].user.rank > usrBadge.rank) idxBadges[badgeType].user = usrBadge;
              } else {
                idxBadges[badgeType].user = usrBadge;
              }
            });
            res.json(_.flatten(idxBadges));
          } else {
            res.json(_.flatten(idxBadges));      
          }
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


var issueBadge = function(badge, owner, rank, score, callback) {
  db.view("issuedBadge", "by_badge_owner_rank", { startkey: new Array(badge, owner, rank), endkey: new Array(badge, owner, rank)}, function(err, body){
    if(!_.isUndefined(body.rows) && !err && body.rows.length > 0) {
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
          } else {
            console.log("No Badge for '"+username+"'");
          }
        });
    }
    if(callback) callback();
  });
}


var checkBadgeStammgast = function(owner) {
  var badge = 'badge/stammgast';
  db.get(badge, function(err, body) {
  if (!err) {
    _.each(body.rank, function(days) {
      
      checkDaysInRow(days, owner, function(result){
        var rank = _.indexOf(_.values(body.rank), days)+1;
        
        if(result) {
          issueBadge(badge, owner, rank, 0);
        }
      })
    });
  }
});
}

var checkBadgeAutor = function(owner) {
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


        _.each(rank, function(r){
          if(sets.length >= r) {
            var rankValue = _.indexOf(_.values(rank), r)+1;
            issueBadge(badge, owner, rankValue, sets.length);
          }
        });
      });
    }
  });
}

var checkBadgeKritiker = function(owner) {
    var badge = "badge/kritiker";
    db.get(badge, function(err, body) {
      if (!err) {
        var rank = body.rank;
        db.view('rating', 'by_owner', { startkey: new Array(owner), endkey: new Array(owner) }, function(err, body) {
        var sets = _.pluck(body.rows, "value");
        


        sets = _.filter(sets, function(set){ 
          return set.comment.length >= 80;
        });


        _.each(rank, function(r){
          if(sets.length >= r) {
            var rankValue = _.indexOf(_.values(rank), r)+1;
            issueBadge(badge, owner, rankValue, sets.length);
          }
        });
      });
    }
  });
}

app.get('/xxp', function(req, res){
  var username = "dan.knapp@web.de";
  /*checkDaysInRow(3, username, function(row) {
    if(row) {
      issueBadge("badge/stammgast", "dan.knapp@web.de", 2, 0);
    } else {
      res.json({ "result": "false"});  
    }
  });*/
checkBadgeKritiker(username);
});

/*app.get('/badge', function(req, res) {
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
  res.send(signature);
});*/

srv.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

