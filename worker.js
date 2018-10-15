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
