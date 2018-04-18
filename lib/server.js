util = require('util');
EventEmitter = require('events').EventEmitter;
net = require('net');
extend = require('node.extend');
functions = require('./functions');
Device = require('./device');

util.inherits(Server, EventEmitter);

function Server(opts, callback) {
    if (!(this instanceof Server)) {
        return new Server(opts, callback);
    }

    EventEmitter.call(this);
    var defaults = {
        debug: false,
        port: 8080,
        device_adapter: false,
    };
    this.opts = extend(defaults, opts);

    var _this = this;
    this.devices = [];

    this.server = false;
    this.availableAdapters = {
        GT06: './adapters/gt06',
    };
    this.setAdapter = function(adapter) {
        if (typeof adapter.adapter !== 'function') {
            throw 'The adapter needs an adapter() method to start an instance of it';
        }
        this.device_adapter = adapter;
    };
    this.getAdapter = function() {
        return this.device_adapter;
    };
    this.addAdaptar = function(model, Obj) {
        this.availableAdapters.push(model);
    };

    this.init = function(cb) {

        _this.setDebug(this.opts.debug);

        if (_this.opts.device_adapter === false)
            throw 'The app don\'t set the device_adapter to use. Which model is sending data to this server?';

        if (typeof _this.opts.device_adapter === 'string') {


            if (typeof this.availableAdapters[this.opts.device_adapter] === 'undefined')
                throw 'The class adapter for ' + this.opts.device_adapter + ' doesn\'t exists';


            var adapterFile = (this.availableAdapters[this.opts.device_adapter]);

            this.setAdapter(require(adapterFile));

        } else {

            _this.setAdapter(this.opts.device_adapter);
        }

        _this.emit('before_init');
        if (typeof cb === 'function') cb();
        _this.emit('init');


        console.log('Expecting Alarms!');
    };

    this.addAdaptar = function(model, Obj) {
        this.adapters.push(model);
    };

    this.do_log = function(msg, from) {
        if (this.getDebug() === false) return false;

        if (typeof from === 'undefined') {
            from = 'SERVER';
        }

        msg = '#' + from + ': ' + msg;
        console.log(msg);

    };
    this.setDebug = function(val) {
        this.debug = (val === true);
    };

    this.getDebug = function() {
        return this.debug;
    };
    this.init(function() {

        _this.server = net.createServer(function(connection) {

            connection.device = new Device(_this.getAdapter(), connection, _this);
            _this.devices.push(connection);


            connection.on('data', function(data) {
                connection.device.emit('data', data);
            });


            connection.on('end', function() {
                _this.devices.splice(_this.devices.indexOf(connection), 1);
                connection.device.emit('disconnected');
            });

            callback(connection.device, connection);

            connection.device.emit('connected');
        }).listen(opts.port);
    });


    this.find_device = function(deviceId) {
        for (var i in this.devices) {
            var dev = this.devices[i].device;
            if (dev.uid === deviceId) {
                return dev;
            }
        }

        return false;
    };


    this.send_to = function(deviceId, msg) {
        var dev = this.find_device(deviceId);
        dev.send(msg);
    };

    return this;
}

exports.server = Server;
exports.version = require('../package').version;
