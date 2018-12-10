var net = require('net');
const nmea = require('node-nmea');
var Client = require('node-rest-client').Client;
var config = require('../config');
module.exports = (scServer) => {
    class bbController {
        constructor() {
        }

        run(options) {
            /* code for camera websockets */




            /* end code */
            var client = new Client();
            var server = net.createServer(function (socket) {

                socket.write('Echo server\r\n');
                socket.pipe(socket);
                socket.on('data', function (data) {
                    console.log("enviando a bb");
                    scServer.exchange.publish("camera_channel", { message: 'from tracker to BB' });

                    console.log("data: ", data);
                    //let gprmc = nmea.parse(data.toString());
                    try {
                        let gpsData = JSON.parse(data.toString());
                        scServer.exchange.publish(gpsData.device_id, gpsData);
                        var args = {
                            data: {'deviceModel': 'BB', gpsData},
                            headers: {"Content-Type": "application/json"}
                        };
                        //client.post("https://zurikatoapi.herokuapp.com/api/v1/gps/coords", args, function (data, response) {});
                        client.post(config.apiUrl + "/gps/coords", args, function (data, response) {
                        });

                    } catch (error) {
                        console.log(error);
                    }
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
