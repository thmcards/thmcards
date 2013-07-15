
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
  , _ = require('underscore');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', function(req, res){
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
  fs.readFile(__dirname + '/public/testdata/sets.json', 'utf8', function(err, text){
        var array = JSON.parse(text);

        console.log(req.params.id, array[req.params.id-1]);

        res.header("Content-Type", "text/json");
        res.send(array[req.params.id-1]);
        

    });   
});

app.get('/couchdb', function(req, res){
  

});

app.get('/set', function(req, res){
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

app.post('/set/', function(req, res){
  var time = new Date().getTime();

  db.insert(
    { 
      "created": time,
      "owner": req.body.owner || "asd",
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
          console.log(body);
          res.send(body);
      });
  });  
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
