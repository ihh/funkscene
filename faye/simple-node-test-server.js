var http = require('http'),
    faye = require('faye');

var server = http.createServer(),
    bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});

// Handle non-Bayeux requests
var n = 0;
var server = http.createServer(function(request, response) {
    console.log(request.url);
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end('Hello, non-Bayeux request ' + (++n));
});

bayeux.attach(server);
server.listen(8000);
