
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

var RedisStore = require('connect-redis');

var redis = require('redis');
var redisClient = redis.createClient();

redisClient.on('error', function(err) {
  console.log("DB error " + err);
});

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyDecoder());
  app.use(express.methodOverride());
  app.use(express.cookieDecoder());
  app.use(express.session({ store: new RedisStore, secret: 'iabxlp,bx' }));
  app.use(express.compiler({ src: __dirname + '/public', enable: ['sass'] }));
  app.use(app.router);
  app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    locals: {
      title: 'organizer app'
    }
  });
});

var ideas = [{name: 'organizer', desc: 'an app for brainstorming and group forming', votes: 0, id: 'a'}, {name: 'aoeui', desc: 'lorem ipsum', votes: 0, id: 'b'}];

function format_time(d) {
  var h = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();
  var str = '';
  if (h < 10) {
    str += '0' + h;
  } else {
    str += h;
  }
  str += ':';
  if (m < 10) {
    str += '0' + m;
  } else {
    str += m;
  }
  str += ':';
  if (s < 10) {
    str += '0' + s;
  } else {
    str += s;
  }
  return str;
}

var idea_id = 0;

function nextEventID() {
  return idea_id++;
}

var io = require('socket.io');
var socket = io.listen(app);
socket.on('connection', function(client) {
  client.name = 'anonymous';
  client.send(JSON.stringify({type: 'chat', time: format_time(new Date()), sender: 'server', text: 'hello'}));
  for (var i = 0; i < ideas.length; i++) {
    client.send(JSON.stringify({type: 'setIdea', name: ideas[i].name, desc: ideas[i].desc, votes: ideas[i].votes, id: ideas[i].id}));
  }
  client.on('message', function(data) {
    try {
      ev = JSON.parse(data);
      if (ev.type == 'chat') {
        socket.broadcast(JSON.stringify({type: 'chat', time: format_time(new Date()), sender: client.name, text: ev.text}));
      } else if (ev.type == 'vote') {
        if (client.vote != ev.id) {
          if (client.vote) {
            for (var i = 0; i < ideas.length; i++) {
              if (ideas[i].id == client.vote) {
                ideas[i].votes--;
                socket.broadcast(JSON.stringify({type: 'setVotes', id: ideas[i].id, votes: ideas[i].votes}));
                break;
              }
            }
          }
          client.vote = '';
          for (var i = 0; i < ideas.length; i++) {
            if (ideas[i].id == ev.id) {
              ideas[i].votes++;
              socket.broadcast(JSON.stringify({type: 'setVotes', id: ev.id, votes: ideas[i].votes}));
              client.vote = ev.id;
              break;
            }
          }
        }
      } else if (ev.type == 'name') {
        client.name = ev.name;
      } else if (ev.type == 'idea') {
        idea = {id: nextEventID(), name: ev.name, desc: ev.desc, votes: 0};
        ideas.push(idea);
        socket.broadcast(JSON.stringify({type: 'setIdea', id: idea.id, name: idea.name, desc: idea.desc, votes: idea.votes}));
      }
    } catch (e) {
      console.log(JSON.stringify(e));
    }
  });
  client.on('disconnect', function() {
    if (client.vote) {
      for (var i = 0; i < ideas.length; i++) {
        if (ideas[i].id == client.vote) {
          ideas[i].votes--;
          socket.broadcast(JSON.stringify({type: 'setVotes', id: ideas[i].id, votes: ideas[i].votes}));
          break;
        }
      }
    }
  });
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port)
}
