var http = require('http');
var SocketCluster = require('socketcluster');
var socketCluster = new SocketCluster({
    workers: 1,
    brokers: 1,
    port: 3001,
    appName: "Zurikato Api",
    workerController: __dirname + '/worker.js',
    brokerController: __dirname + '/broker.js',
    socketChannelLimit: 1000,
    rebootWorkerOnCrash: true
});


setInterval(function() {
    var options = {
        hostname: '187.162.125.161',
        port: 8088,
        path: '/StandardApiAction_login.action?account=admin&password=admin',
        method: 'GET'
    };

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
