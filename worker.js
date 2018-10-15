var SCWorker = require('socketcluster/scworker');
var fs = require('fs');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var config = require('./config');
class Worker extends SCWorker {

    constructor() {
        super();
        console.log("constructor of worker");
        setInterval(function() {
            var options = {
                hostname: '187.162.125.161',
                port: 8088,
                path: '/StandardApiAction_login.action?account=admin&password=admin',
                method: 'GET'
            };

            console.log("enviando mensaje por websocket ");
            this.mdvrSend();

            http.request(options, function(res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));

                res.setEncoding('utf8');
                res.on('data', function(data) {
                    var jsession = JSON.parse(data).jsession;
                    if(jsession == undefined)
                        return;
                    console.log(jsession);
                    var options2 = {
                        hostname: '187.162.125.161',
                        port: 8088,
                        path: '/StandardApiAction_queryUserVehicle.action?jsession=' + jsession,
                        method: 'GET'
                    };
                    http.request(options2, function(res2) {
                        res2.setEncoding('utf8');
                        res2.on('data', function (data2) {
                            console.log("segunda peticion", data2);
                        });
                    }).end();
                });
                // res.on('data', function (chunk) {
                //     console.log('BODY: ' + chunk);
                // });
            }).end();
        }, 10000);

    }

    run() {
        console.log('   >> Worker PID:', process.pid);
        var app = require('express')();
        var httpServer = this.httpServer;
        var scServer = this.scServer;
        app.use(serveStatic(path.resolve(__dirname, 'public')));
        httpServer.on('request', app);
        var deviceController = require(__dirname + '/lib/deviceController')(scServer);
	    var bb = require(__dirname + '/lib/bbCtrl')(scServer);
        deviceController.run({ debug: true, port: 3000, device_adapter: 'GT06' });
	    bb.run({port:config.bbPort, ipaddress:config.serverAllIp});
        scServer.on('connection', function(socket) {});

        this.on('masterMessage', function(data) {
            console.log("me llamo el master");
        });

        // var mdvrController = require(__dirname + '/lib/mdvrController')(scServer);
        // mdvrController.run({ debug: true, port: 3000, device_adapter: 'MDVR' });

    }

    mdvrSend() {
        scServer.exchange.publish('sampleClientEvent', {message: 'This is an object with a message property'});
    }
}
new Worker();
