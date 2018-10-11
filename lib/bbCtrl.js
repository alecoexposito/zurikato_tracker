var net = require('net');
const nmea = require('node-nmea');
var Client = require('node-rest-client').Client;
var config = require('./config');
module.exports = (scServer) => {
    class bbController {
        constructor() {}
        run(options) {
		console.log('BBRUN1');
            var client = new Client();
		console.log('BBRUN2');
            var server = net.createServer(function(socket) {
		    
		    console.log('BBRUN3');
            socket.write('Echo server\r\n');
		    console.log('BBRUN4');
            socket.pipe(socket);
		    console.log('BBRUN5');
		socket.on('data',function(data){
			console.log('BBRUNFOR1');
		//let gprmc = nmea.parse(data.toString());
		try{
			let gpsData = JSON.parse(data.toString());
			scServer.exchange.publish(gpsData.device_id, gpsData);
			var args = {
                        	data: {'deviceModel':'BB', gpsData },
	                        headers: { "Content-Type": "application/json" }
        		            };
	                //client.post("https://zurikatoapi.herokuapp.com/api/v1/gps/coords", args, function (data, response) {});
			client.post(config.apiUrl + "/gps/coords", args, function (data, response) {});

		}catch(error){console.log(error);}
			console.log('BBRUNFOR20');
		});

	});
		
		console.log('PUERTO E IPPPPPPPP');
	console.log(options.port);
		console.log(options.ipaddress);
         server.listen(options.port, options.ipaddress);
	console.log('after serverlisten');
        }
    }
    return new bbController(scServer);
};
