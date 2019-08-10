var SCWorker = require('socketcluster/scworker');
var fs = require('fs');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var config = require('./config');
var http = require('http');
var net = require('net');

class Worker extends SCWorker {

    constructor() {
        super();
        var _this = this;
    }

    run() {
        var _this = this;
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
        var mdvrController = require(__dirname + '/lib/mdvrController')(scServer);
        mdvrController.loginAndGetVehicles();

        var socketTracker = net.createServer(function() {
            console.log("socket server connected");
        });

        socketTracker.listen(config.socketPort, '0.0.0.0', function() {
            console.log("listening on port: " + config.socketPort);

            socketTracker.on('connection', function(conn) {
                conn.on('data', function(data) {
                    console.log(conn.getEncoding());
                    console.log("data received over tcp: ", data);
                });
                conn.on('end', () => {
                    // const file = Buffer.concat(chunks)
                    // do what you want with it
                    console.log("its over the tcp transfer");
                });
                conn.on('close', function() {
                    console.log("on the close event");
                });

                conn.on('error', function(err) {
                    console.log("error ocurred");
                    console.log(err);
                });
            });

        });

        // scServer.on('connection', function(socket) {
        //     setInterval(function() {
            //     console.log("connected clients: ", _this.scServer.clientsCount);
            //
            // }, 2000);
        // });
    }

}
new Worker();
