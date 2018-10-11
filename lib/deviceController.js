var gps = require(__dirname + '/server');
var Client = require('node-rest-client').Client;
var config = require('../config');
module.exports = (scServer) => {
    class deviceController {
        constructor() {}
        run(options) {
            var client = new Client();
            var server = gps.server(options, function(device, connection) {

                device.on('login_request', function(device_id, msg_parts) {
                    this.login_authorized(true);
                });
                device.on('ping', function(gpsData, msgParts) {
		scServer.exchange.publish(gpsData.device_id, gpsData);
		var args = {
                        data: { gpsData },
                        headers: { "Content-Type": "application/json" }
                    };
                    client.post(config.apiUrl + "/gps/coords", args, function (data, response) {});
                    
                });
                device.on("alert", function(alarm_code, alarm_data, msg_data) {
                   scServer.exchange.publish('alarms_'+alarm_data.device_id, alarm_data);
                    var args2 = {
                        data: { alarm_data },
                        headers: { "Content-Type": "application/json" }
                    };
                    client.post(config.apiUrl + "/alarms", args2, function (data, response) {
                        console.log("se guardo la alarma");
                        console.log(data);
                    });
                    console.log("AlARM START !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                    console.log(alarm_data);
                    console.log("END DATA !!!!!!!!!!!");
                });
                device.on("handshake", function() {});
            });
            server.setDebug(true);
        }
    }
    return new deviceController(scServer);
};
