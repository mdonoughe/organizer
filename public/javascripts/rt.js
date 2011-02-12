socket = new io.Socket(document.location.hostname);
socket.connect();
socket.on('connect', function() {
  if (uname == null) {
    document.body.appendChild(nameScreen);
  } else {
    socket.send(JSON.stringify({type: 'name', name: uname}));
  }
  addChatLine('', 'app', 'connected');
  document.body.removeChild(connectScreen);
  $('.ideaBox', ideaWindow).remove();
  ideas = [];
});
socket.on('message', function(data) {
  var ev = JSON.parse(data);
  if (ev.type == 'chat') {
    addChatLine(ev.time, ev.sender, ev.text);
  } else if (ev.type == 'setVotes') {
    setVotes(ev.id, ev.votes);
  } else if (ev.type == 'setIdea') {
    updateIdea(ev.name, ev.desc, ev.votes, ev.id);
  }
});
socket.on('disconnect', function() {
  addChatLine('', 'app', 'disconnected');
  document.body.appendChild(connectScreen);
  var reconnect = function() {
    if (!socket.connected) {
      setTimeout(reconnect, 1000);
      if (!socket.connecting) {
        socket.connect();
      }
    }
  };
  reconnect();
});

var ideas = [];

ideaWindow = document.createElement('div');
ideaWindow.setAttribute('class', 'ideaWindow');
document.body.appendChild(ideaWindow);

var bottomFloat = document.createElement('div');
bottomFloat.setAttribute('class', 'bottomFloat');

chatWindow = document.createElement('div');
chatWindow.setAttribute('class', 'chatWindow');

chatText = document.createElement('div');
chatText.setAttribute('class', 'chatText');
chatWindow.appendChild(chatText);

chatInputBar = document.createElement('form');
chatInputBar.setAttribute('class', 'chatInputBar');

chatInput = document.createElement('input');
chatInput.setAttribute('class', 'chatInput');
chatInputBar.appendChild(chatInput);

sendButton = document.createElement('input');
sendButton.setAttribute('class', 'sendButton');
sendButton.type = 'submit';
sendButton.value = 'send';
chatInputBar.appendChild(sendButton);
sendButton.onclick = function() {
  sendChat(chatInput.value);
  chatInput.value = '';
  return false;
}
chatWindow.appendChild(chatInputBar);
bottomFloat.appendChild(chatWindow);

var createBox = document.createElement('form');
createBox.setAttribute('class', 'ideaBox');
var nameNode = document.createElement('input');
nameNode.setAttribute('class', 'ideaName');
nameNode.value = "<name>";
createBox.appendChild(nameNode);
var descNode = document.createElement('textarea');
descNode.setAttribute('class', 'ideaDesc');
descNode.value = "<description>";
createBox.appendChild(descNode);
var createButton = document.createElement('input');
createButton.setAttribute('class', 'createIdea');
createButton.type = 'submit';
createButton.value = 'Pitch';
createButton.onclick = function() {
  socket.send(JSON.stringify({type: 'idea', name: nameNode.value, desc: descNode.value}));
  nameNode.value = '<name>';
  descNode.value = '<description>';
  return false;
}
createBox.appendChild(createButton);
bottomFloat.appendChild(createBox);
document.body.appendChild(bottomFloat);

// name select screen
var nameScreen = document.createElement('form');
nameScreen.setAttribute('class', 'screen');
nameScreen.appendChild(document.createTextNode('What is your name?'));

var nameInput = document.createElement('input');
nameInput.setAttribute('class', 'nameInput');
nameInput.value = 'anonymous';
nameScreen.appendChild(nameInput);

var nameButton = document.createElement('input');
nameButton.type = 'submit';
nameButton.value = 'OK';
nameButton.onclick = function() {
  uname = nameInput.value;
  socket.send(JSON.stringify({type: 'name', name: uname}));
  document.body.removeChild(nameScreen);
  return false;
};
nameScreen.appendChild(nameButton);

var uname = null;

// connecting screen
var connectScreen = document.createElement('div');
connectScreen.setAttribute('class', 'screen');
connectScreen.appendChild(document.createTextNode('Connecting'));
document.body.appendChild(connectScreen);

function addChatLine(time, sender, text) {
  var line = document.createElement('div');
  line.setAttribute('class', 'chatLine');
  var timeNode = document.createElement('span');
  timeNode.setAttribute('class', 'chatTime');
  timeNode.appendChild(document.createTextNode(time));
  line.appendChild(timeNode);
  var senderNode = document.createElement('span');
  senderNode.setAttribute('class', 'chatSender');
  senderNode.appendChild(document.createTextNode(sender));
  line.appendChild(senderNode);
  line.appendChild(document.createTextNode(':'));
  var textNode = document.createElement('span');
  textNode.setAttribute('class', 'chatMessage');
  textNode.appendChild(document.createTextNode(text));
  line.appendChild(textNode);

  var atBottom = chatText.scrollHeight - chatText.scrollTop - chatText.offsetHeight < 5;
  chatText.appendChild(line);
  if (atBottom) {
    chatText.scrollTop = chatText.scrollHeight;
  }
}

function setVotes(id, votes) {
  for (var i = 0; i < ideas.length; i++) {
    if (ideas[i].id == id) {
      ideas[i].votes = votes;
      $('.ideaVotes', ideas[i].node)[0].firstChild.data = votes;
      return;
    }
  }
}

function updateIdea(name, desc, votes, id) {
  for (var i = 0; i < ideas.length; i++) {
    if (ideas[i].id == id) {
      ideas[i].name = name;
      $('.ideaName', ideas[i].box)[0].firstChild.data = name;
      ideas[i].desc = desc;
      $('.ideaDesc', ideas[i].box)[0].firstChild.data = desc;
      return;
    }
  }
  addIdea(name, desc, votes, id);
}

function addIdea(name, desc, votes, id) {
  var box = document.createElement('div');
  var x = ideas.length % 4;
  var y = Math.floor(ideas.length / 4);
  if (x == 0) {
    // new row!
    ideaWindow.style.height = 210 * (y + 1) + 'px';
  }
  box.setAttribute('class', 'ideaBox');
  box.setAttribute('style', 'position: absolute; top: ' + (y * 210) + 'px; left: ' + (x * 210) + 'px;');
  var nameNode = document.createElement('div');
  nameNode.setAttribute('class', 'ideaName');
  nameNode.appendChild(document.createTextNode(name));
  box.appendChild(nameNode);
  var descNode = document.createElement('div');
  descNode.setAttribute('class', 'ideaDesc');
  descNode.appendChild(document.createTextNode(desc));
  box.appendChild(descNode);
  var votesNode = document.createElement('div');
  votesNode.setAttribute('class', 'ideaVotes');
  votesNode.appendChild(document.createTextNode(votes));
  box.appendChild(votesNode);
  ideaWindow.appendChild(box);
  var idea = {name: name, desc: desc, votes: votes, node: box, id: id};
  ideas.push(idea);
  box.onclick = function() {
    socket.send(JSON.stringify({type: 'vote', id: id}));
    return false;
  }
}

function sendChat(text) {
  socket.send(JSON.stringify({type: 'chat', text: text}));
}
