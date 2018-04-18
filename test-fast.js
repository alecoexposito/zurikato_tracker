var net = require('net');
var server = net.createServer(function(socket) {
	socket.on('message',function(data){
		console.log('algo hizo');
	});
	console.log('adsf');
});

server.listen('3002','0.0.0.0');
