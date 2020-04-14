// var gps = require(__dirname + '/server');
var Client = require('node-rest-client').Client;
var config = require('../config');
var http = require('http');
var moment = require('moment');

module.exports = (scServer) => {
    class mdvrController {

        constructor() {
            this.lastData = {};
            this.options = {
                hostname: config.mdvrApiIp,
                port: config.mdvrApiPort,
                path: '/StandardApiAction_login.action?account=' + config.mdvrApiUser + '&password=' + '',
                method: 'GET'
            };
            this.scServer = scServer;
            this.jsession = "";
            this.initializeMdvrSocket();

        }

        getDeviceData(deviceId, deviceLabel = null) {
            var client = new Client();
            var _this = this;
            // console.log("jsession: ", _this.jsession);
            // console.log("device id: ", deviceId);
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
                    var gpsStatus = deviceData.ol == 1 ? 0 : 1;
                    var speed = deviceData.sp <= 0 ? 0 : deviceData.sp / 10;
                    // if(deviceData.id == "433082748402") {
                    //     console.log("GPS STATUSSSSS--------------: ", deviceData.ol);
                    //     console.log("STATUS QUE QUEDO: ", gpsStatus);
                    // }

                    var gpsData = {
                        idDevice: deviceData.id,
                        latitude: deviceData.mlat,
                        longitude: deviceData.mlng,
                        speed: speed,
                        orientation_plain: deviceData.hx,
                        gps_status: gpsStatus,
                        device_id: deviceData.id,
                        mdvr_number: true,
                        date: deviceData.gt,
                        mygps_status: deviceData.ol,
                        deviceLabel: deviceLabel
                    };
                    if(gpsData.latitude != "0.0" || gpsData.longitude != "0.0") {
                        // console.log("last data: " + _this.lastData[deviceId]);
                        if(true || _this.lastData[deviceId] == undefined /*|| _this.lastData[deviceId] != gpsData.latitude + "," + gpsData.longitude*/) {
                            _this.lastData[deviceId] = gpsData.latitude + "," + gpsData.longitude;
                            var args = {
                                data: { deviceModel:'MDVR', gpsData: gpsData },
                                headers: { "Content-Type": "application/json" }
                            };
                            // console.log("CALLING API TO STORE MDVR");
                            client.post(config.apiUrl + "/gps/coords", args, function (data, response) {});
                            _this.mdvrSend(_this.scServer, gpsData);
                        } else {
                            console.log("no enviados datos de: ", deviceId);
                        }
                    }
                });
            }).end();
        }

        mdvrFirstSend() {
            // console.log("first send of mdvr controller");
            var _this = this;
            http.request(_this.options, function (res) {
                console.log('LOGIN STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));

                res.setEncoding('utf8');
                res.on('data', function (data) {
                    // console.log("first time data: ", data);
                    _this.jsession = JSON.parse(data).jsession;
                    console.log("JSESSION: ", _this.jsession);
                    if (_this.jsession == undefined)
                        return;
                    _this.getVehicles();
                });
            }).end();
            setInterval(function () {
                // console.log("cada 10 segundos");
                // console.log(_this.vehicles);
                _this.getAllDevicesData();
            }, 4000);

        }

        loginAndGetVehicles() {
            var _this = this;
            var clientHttp = new Client();
            var args2 = {
                headers: {
                    "Content-Type": "application/json",
                    "service_token": "ec4d5f0a2c9ea2edb03f5b9212e230f74a598e37049378e35a91fd0485977439"
                }
            };
            clientHttp.get(config.apiUrl + "/get-api-pass", args2, function (data, response) {
                console.log("password api: ", data);
                let api_pass = data[0].api_pass;
                _this.options.path = '/StandardApiAction_login.action?account=' + config.mdvrApiUser + '&password=' + api_pass;
                console.log("OPTIONS: ", _this.options);
                _this.mdvrFirstSend();
            });
        }
        getVehicles() {
            var _this = this;
            var options2 = {
                hostname: config.mdvrApiIp,
                port: config.mdvrApiPort,
                path: '/StandardApiAction_queryUserVehicle.action?jsession=' + _this.jsession,
                method: 'GET'
            };
            _this.dataJson = "";
            http.request(options2, function (res2) {
                res2.setEncoding('utf8');
                res2.on('data', function (data2) {
                    _this.dataJson += data2;
                });
                res2.on('end', () => {
                    var result = JSON.parse(_this.dataJson);
                    // console.log(result);
                    _this.vehicles = [];
                    for(var i = 0; i < result.vehicles.length; i++) {
                        _this.vehicles.push({
                            deviceId: result.vehicles[i].dl[0].id,
                            deviceLabel: result.vehicles[i].nm
                        });
                    }
                    _this.mdvrSend(_this.scServer, _this.dataJson);
                });
            }).end();

        }

        mdvrSend(scServer, data) {
            // console.log("MDVR SEND: ", data);
            scServer.exchange.publish(data.device_id, data);
        }


        run(options) {

        }

        getAllDevicesData() {
            var _this = this;
            if(_this.vehicles) {
                for(var i = 0; i < _this.vehicles.length; i++) {
                    _this.getDeviceData(_this.vehicles[i].deviceId, _this.vehicles[i].deviceLabel);
                    // _this.getDeviceAlarm(_this.vehicles[i]);
                }
            }
        }

        getDeviceAlarm(deviceId) {
            var client = new Client();
            var _this = this;
            // moment.utc();
            var options = {
                hostname: config.mdvrApiIp,
                port: config.mdvrApiPort,
                path: '/StandardApiAction_queryAlarmDetail.action?jsession=' + _this.jsession +
                '&devIdno=' + deviceId +
                '&begintime=' + moment().subtract(10, 'seconds').format("YYYY-MM-DD%20HH:mm:ss") +
                '&endtime=' + moment().format("YYYY-MM-DD%20HH:mm:ss") +
                '&armType=2,9,11,17,19' +
                '&currentPage=1' +
                '&pageRecords=50',
                method: 'GET'
            };
            // console.log("url", options.path);
            http.request(options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));

                res.setEncoding('utf8');
                res.on('data', function (data) {
                    // console.log("alarms api response: ", data);
                    var data = JSON.parse(data);
                    if(data.alarms == null)
                        return;

                    // console.log("alarm data: ", data);
                    var alarmData =  {
                        device_info: 100,
                        device_id: deviceId,
                        latitude: data.alarms[0].emlat,
                        longitude: data.alarms[0].emlng,
                        speed: data.alarms[0].ssp,
                        orientation_plain: 0,
                    };
                    // return;
                    // var args = {
                    //     data: { deviceModel:'MDVR', gpsData: gpsData },
                    //     headers: { "Content-Type": "application/json" }
                    // };
                    // client.post(config.apiUrl + "/gps/coords", args, function (data, response) {});
                    // console.log("enviando alarma: ", alarmData);
                    _this.mdvrAlarmSend(_this.scServer, alarmData);
                });
            }).end();
        }

        mdvrAlarmSend(scServer, alarmData) {
            var clientHttp = new Client();
            console.log("al enviar la alarma: ", alarmData);
            scServer.exchange.publish("alarms_" + alarmData.device_id, alarmData);
            var alarm_data = alarmData;
            var args2 = {
                data: { alarm_data },
                headers: { "Content-Type": "application/json" }
            };
            clientHttp.post(config.apiUrl + "/alarms", args2, function (data, response) {
                console.log(data);
            });
        }

        initializeMdvrSocket() {
            console.log("subscribing mdvr");
            var _this = this;
            _this.scServer.exchange.subscribe("mdvr_channel");
            this.scServer.exchange.watch('mdvr_channel', function(data) {
                console.log("----------------------------------- MDVR CHANNEL --------------------------------------", data);
                data = JSON.parse(data);
                if(data.alarmlist == undefined)
                    return;
                var datatArray = data.alarmlist;
                datatArray.forEach(function(value) {
                    // console.log("gps data: ", value.Gps);
                    if(value.type == 19){
                        var alarmData =  {
                            device_info: 100,
                            device_id: value.DevIDNO,
                            latitude: value.Gps.mlat,
                            longitude: value.Gps.mlng,
                            speed: value.Gps.sp,
                            orientation_plain: value.Gps.hx
                        };
                        console.log("alarm data: ", alarmData);
                        _this.mdvrAlarmSend(_this.scServer, alarmData);
                    }
                });
            });
        }


    }

    return new mdvrController(scServer);
};
