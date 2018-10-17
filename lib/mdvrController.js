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
            var _this = this;
            var options = {
                hostname: config.mdvrApiIp,
                port: config.mdvrApiPort,
                path: '/StandardApiAction_getDeviceStatus.action?jsession=' + _this.jsession + '&devIdno=' + deviceId + '&toMap=2&driver=0&geoaddress=1',
                method: 'GET'
            };

            http.request(_this.options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));

                res.setEncoding('utf8');
                res.on('data', function (data) {
                    console.log(JSON.parse(data));
                });
            }).end();
        }

        mdvrFirstSend() {
            console.log("first send of mdvr controller");
            var _this = this;
            http.request(_this.options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));

                res.setEncoding('utf8');
                res.on('data', function (data) {
                    _this.jsession = JSON.parse(data).jsession;
                    if (_this.jsession == undefined)
                        return;
                    _this.getVehicles();
                });
            }).end();
            setInterval(function () {
                console.log("cada 10 segundos");
                console.log(_this.vehicles);
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
            scServer.exchange.publish('mdvr_channel', data);
        }


        run(options) {

        }
    }

    return new mdvrController(scServer);
};
