// var gps = require(__dirname + '/server');
var Client = require('node-rest-client').Client;
var config = require('../config');
module.exports = (scServer) => {
    class mdvrController {


        constructor() {
            this.options = {
                hostname: config.mdvrApiIp,
                port: config.mdvrApiPort,
                path: '/StandardApiAction_login.action?account=admin&password=admin',
                method: 'GET'
            };

        }

        mdvrFirstSend() {
            setInterval(function () {
                http.request(options, function (res) {
                    // console.log('STATUS: ' + res.statusCode);
                    // console.log('HEADERS: ' + JSON.stringify(res.headers));

                    res.setEncoding('utf8');
                    res.on('data', function (data) {
                        var jsession = JSON.parse(data).jsession;
                        if (jsession == undefined)
                            return;
                        console.log(jsession);
                        var options2 = {
                            hostname: config.mdvrApiIp,
                            port: config.mdvrApiPort,
                            path: '/StandardApiAction_queryUserVehicle.action?jsession=' + jsession,
                            method: 'GET'
                        };
                        http.request(options2, function (res2) {
                            res2.setEncoding('utf8');
                            res2.on('data', function (data2) {
                                console.log("segunda peticion", data2);
                                _this.mdvrSend(_this.scServer, data2);
                            });
                        }).end();
                    });
                }).end();
            }, 10000);

        }

        run(options) {

        }
    }

    return new mdvrController(scServer);
};
