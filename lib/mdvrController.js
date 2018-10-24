// var gps = require(__dirname + '/server');
var Client = require('node-rest-client').Client;
var config = require('../config');
var http = require('http');

module.exports = (scServer) => {
    class mdvrController {


        constructor() {
            this.options = {
                hostname: config.mdvrApiIp,
                port: config.mdvrApiPort,
                path: '/StandardApiAction_login.action?account=admin&password=admin',
                method: 'GET'
            };
            this.scServer = scServer;
            this.jsession = "";

        }

        getDeviceData(deviceId) {
            var client = new Client();
            var _this = this;
            console.log("jsession: ", _this.jsession);
            console.log("device id: ", deviceId);
            var options = {
                hostname: config.mdvrApiIp,
                port: config.mdvrApiPort,
                path: '/StandardApiAction_getDeviceStatus.action?jsession=' + _this.jsession + '&devIdno=' + deviceId,
                method: 'GET'
            };

            http.request(options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));

                res.setEncoding('utf8');
                res.on('data', function (data) {
                    var deviceData = JSON.parse(data).status[0];
                    var gpsData = {
                        idDevice: deviceData.id,
                        latitude: deviceData.mlat,
                        longitude: deviceData.mlng,
                        speed: deviceData.sp,
                        orientation_plain: deviceData.hx,
                        gps_status: deviceData.ol,
                        device_id: deviceData.id,
                        mdvr_number: true,
                        date: deviceData.gt
                    };
                    console.log("parsed gpsData: ", gpsData);
                    var args = {
                        data: { deviceModel:'MDVR', gpsData: gpsData },
                        headers: { "Content-Type": "application/json" }
                    };
                    client.post(config.apiUrl + "/gps/coords", args, function (data, response) {});
                    _this.mdvrSend(_this.scServer, gpsData);
                });
            }).end();
        }

        mdvrFirstSend() {
            console.log("first send of mdvr controller");
            var _this = this;
            http.request(_this.options, function (res) {
                console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));

                res.setEncoding('utf8');
                res.on('data', function (data) {
                    console.log("first time data: ", data);
                    _this.jsession = JSON.parse(data).jsession;
                    if (_this.jsession == undefined)
                        return;
                    _this.getVehicles();
                });
            }).end();
            setInterval(function () {
                console.log("cada 10 segundos");
                console.log(_this.vehicles);
                _this.getAllDevicesData();
            }, 10000);

        }

        loginAndGetVehicles() {
            this.mdvrFirstSend();
        }
        getVehicles() {
            var _this = this;
            var options2 = {
                hostname: config.mdvrApiIp,
                port: config.mdvrApiPort,
                path: '/StandardApiAction_queryUserVehicle.action?jsession=' + _this.jsession,
                method: 'GET'
            };
            http.request(options2, function (res2) {
                res2.setEncoding('utf8');
                res2.on('data', function (data2) {
                    console.log("segunda peticion", data2);
                    var result = JSON.parse(data2);
                    console.log(result);
                    _this.vehicles = [];
                    for(var i = 0; i < result.vehicles.length; i++) {
                        _this.vehicles.push(result.vehicles[i].dl[0].id);
                    }
                    // _this.mdvrSend(_this.scServer, data2);
                });
            }).end();

        }

        mdvrSend(scServer, data) {
            scServer.exchange.publish(data.device_id, data);
        }


        run(options) {

        }

        getAllDevicesData() {
            var _this = this;
            for(var i = 0; i < _this.vehicles.length; i++) {
                console.log("dentro del for: ", _this.vehicles[i]);
                _this.getDeviceData(_this.vehicles[i]);
            }
        }
    }

    return new mdvrController(scServer);
};
