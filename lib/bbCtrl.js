var net = require('net');
const nmea = require('node-nmea');
var Client = require('node-rest-client').Client;
var config = require('../config');
module.exports = (scServer) => {
    class bbController {
        constructor() {
        }

        run(options) {

            var client = new Client();
            var server = net.createServer(function (socket) {

                socket.write('Echo server\r\n');
                socket.pipe(socket);
                socket.on('data', function (data) {
                    // console.log("enviando a bb");
                    // scServer.exchange.publish("camera_channel", { message: 'from tracker to BB' });
                    // console.log("bb data: ", data);
                    //let gprmc = nmea.parse(data.toString());
                    try {
                        console.log("data before explode: ", data.toString());
                        let gpsData = JSON.parse(data.toString());
                        // console.log("bb gpsData: ", gpsData);
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

            var videoBackupChannel = scServer.exchange.subscribe("video_backup_channel");
            videoBackupChannel.watch(function(data) {
                console.log("received in backup channel: ", data);
            });

        }
    }

    return new bbController(scServer);
};
