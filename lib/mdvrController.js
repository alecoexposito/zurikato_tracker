// var gps = require(__dirname + '/server');
var Client = require('node-rest-client').Client;
var config = require('../config');
module.exports = (scServer) => {
    class mdvrController {
        constructor() {}

        run(options) {
            console.log("run dentro del mdvr controller");
            // var client = new Client();
            var gpsData = { message: 'adff' };
            scServer.exchange.publish('mdvr', gpsData);
            // var args = {
            //     data: { gpsData },
            //     headers: { "Content-Type": "application/json" }
            // };
            // client.post(config.apiUrl + "/gps/coords", args, function (data, response) {});

            // var server = gps.server(options, function(device, connection) {
            //     device.on('ping', function(gpsData, msgParts) {
		     //        scServer.exchange.publish(gpsData.device_id, gpsData);
		     //        var args = {
            //             data: { gpsData },
            //             headers: { "Content-Type": "application/json" }
            //         };
            //         client.post(config.apiUrl + "/gps/coords", args, function (data, response) {});
            //     });
            // });
            // server.setDebug(true);
        }
    }
    return new mdvrController(scServer);
};
