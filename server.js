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

// var worker = require(__dirname + '/worker.js');