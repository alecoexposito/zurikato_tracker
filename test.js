var gps = require(__dirname + '/index');

var options = {
    debug: true,
    port: 3000,
    device_adapter: 'GT06'
}

var server = gps.server(options, function(device, connection) {

    device.on('login_request', function(device_id, msg_parts) {
        this.login_authorized(true)

    });
    device.on('ping', function(gpsData, msgParts) {
        console.log('GPS DATA');
        console.log(gpsData);
        console.log('msgParts');
        console.log(msgParts);
    });
    device.on("alarm", function(alarm_code, alarm_data, msg_data) {
        console.log("AlARMA !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" + alarm_code + " (" + alarm_data.msg + ")");
    });
    device.on("handshake", function() {});
});
server.setDebug(true);
