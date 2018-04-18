var SCWorker = require('socketcluster/scworker');
var fs = require('fs');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
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
	console.log('ANTES DEL BB RUN');
	bb.run({port:3002, ipaddress:"192.168.1.100"});
/*	var router = express.Router();
	router.post('/', function(req, res, next) {
             let gpsData = JSON.parse(req.body.data.toString());
		console.log(gpsData);
                scServer.exchange.publish(gpsData.device_id, gpsData);
                var args = {
                        data: {'deviceModel':'BB', gpsData },
                        headers: { "Content-Type": "application/json" }
                    };
                    client.post("http://189.207.202.64:3007/api/v1/gps/coords", args, function (data, response) {});
	});
       app.use('/bbdata',router);*/
        scServer.on('connection', function(socket) {});
    }
}
new Worker();
