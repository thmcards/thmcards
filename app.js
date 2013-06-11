
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , fs = require('fs');

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
  fs.readFile(__dirname + '/public/testdata/set.json', 'utf8', function(err, text){
        res.header("Content-Type", "text/json");
        res.send(text);
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

app.get('/set', function(req, res){
  fs.readFile(__dirname + '/public/testdata/sets.json', 'utf8', function(err, text){
        res.header("Content-Type", "text/json");
        res.send(text);
    });   
});


app.post('/set', function(req, res){
  req.body.id = Math.round(Math.random()*50000);
  req.body.created = new Date().getTime();
  req.body.count = Math.round(Math.random()*50);
  res.send(req.body);   
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
