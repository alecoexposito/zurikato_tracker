f = require('../functions');
var appRoot = require('app-root-path');
exports.protocol = 'GT06';
exports.model_name = 'GT06';
exports.compatible_hardware = ['GT06/supplier'];

var adapter = function(device) {
    if (!(this instanceof adapter)) {
        return new adapter(device);
    }

    this.format = { 'start': '(', 'end': ')', 'separator': '' };
    this.device = device;
    this.__count = 1;
    this.parse_data = function(data) {
        data = this.bufferToHexString(data);
        var parts = {
            'start': data.substr(0, 4)
        };
        if (parts['start'] == '7878') {
            parts['length'] = parseInt(data.substr(4, 2), 16);
            parts['finish'] = data.substr(6 + parts['length'] * 2, 4);

            parts['protocal_id'] = data.substr(6, 2);

            if (parts['finish'] != '0d0a') {
                throw 'finish code incorrect!';
            }

            if (parts['protocal_id'] == '01') {
                parts['device_id'] = data.substr(8, 16);
                parts.cmd = 'login_request';
                parts.action = 'login_request';
            } else if (parts['protocal_id'] == '12') {
                parts['device_id'] = '';
                parts['data'] = data.substr(8, parts['length'] * 2);
                parts.cmd = 'ping';
                parts.action = 'ping';
            } else if (parts['protocal_id'] == '13') {
                parts['device_id'] = '';
                parts.cmd = 'heartbeat';
                parts.action = 'heartbeat';
            } else if (parts['protocal_id'] == '16' || parts['protocal_id'] == '18') {
                parts['device_id'] = '';
                parts['data'] = data.substr(8, parts['length'] * 2);
                parts.cmd = 'alert';
                parts.action = 'alert';
            } else {
                parts['device_id'] = '';
                parts.cmd = 'noop';
                parts.action = 'noop';
            }
        } else {
            parts['device_id'] = '';
            parts.cmd = 'noop';
            parts.action = 'noop';
        }
        return parts;
    };
    this.authorize = function() {

        var length = '05';
        var protocal_id = '01';
        var serial = f.str_pad(this.__count, 4, 0);

        var str = length + protocal_id + serial;

        this.__count++;

        var crc = require(appRoot + '/node_modules/crc/lib/index.js');
        var crcResult = f.str_pad(crc.crc16(str).toString(16), 4, '0');

        var buff = new Buffer('7878' + str + crcResult + '0d0a', 'hex');
        var buff = new Buffer('787805010001d9dc0d0a', 'hex');
        console.log("In the authorize function");
        console.log(buff.toString());
        console.log(" --------------- ");
        this.device.send(buff);
    };
    this.zeroPad = function(nNum, nPad) {
        return ('' + (Math.pow(10, nPad) + nNum)).slice(1);
    };
    this.synchronous_clock = function(msg_parts) {

    };
    this.receive_heartbeat = function(msg_parts) {
        var buff = new Buffer('787805130001d9dc0d0a', 'hex');
        this.do_log("Receiving heartbit");
        this.device.send(buff);
    };
    this.run_other = function(cmd, msg_parts) {};

    this.request_login_to_device = function() {
        //@TODO: Implement this.
    };

    this.receive_alarm = function(msg_parts, device_id) {
        console.log('ALEEEEEEERTTTTTTT');
        //console.log(msg_parts);
        var str = msg_parts.data;
	    console.log(str);
        var data = {
            'device_id': device_id,
            'date': str.substr(0, 12),
            'set_count': str.substr(12, 2),
            'latitude_raw': str.substr(14, 8),
            'longitude_raw': str.substr(22, 8),
            'latitude': this.dex_to_degrees(str.substr(14, 8)),
            'longitude': '-'+this.dex_to_degrees(str.substr(22, 8)),
            'speed': parseInt(str.substr(30, 2), 16),
            'orientation': str.substr(32, 4),
            'lbs': str.substr(36, 18),
            'device_info': f.str_pad(parseInt(str.substr(54, 2)).toString(2), 8, 0),
            'power': str.substr(56, 2),
            'gsm': str.substr(58, 2),
            'alert': str.substr(60, 4),
        };

        data['power_status'] = data['device_info'][0];
        data['gps_status'] = data['device_info'][1];
        data['charge_status'] = data['device_info'][5];
        data['acc_status'] = data['device_info'][6];
        data['defence_status'] = data['device_info'][7];
	return data;
        //console.log(data);
    };

    this.dex_to_degrees = function(dex) {
        return parseInt(dex, 16) / 1800000;
    };

    this.hex2bin = function hex2bin(s){
        // return ("00000000" + (parseInt(hex, 16)).toString(2)).substr(-8);
        var i, k, part, ret = '';
        // lookup table for easier conversion. '0' characters are padded for '1' to '7'
        var lookupTable = {
            '0': '0000', '1': '0001', '2': '0010', '3': '0011', '4': '0100',
            '5': '0101', '6': '0110', '7': '0111', '8': '1000', '9': '1001',
            'a': '1010', 'b': '1011', 'c': '1100', 'd': '1101',
            'e': '1110', 'f': '1111',
            'A': '1010', 'B': '1011', 'C': '1100', 'D': '1101',
            'E': '1110', 'F': '1111'
        };
        for (i = 0; i < s.length; i += 1) {
            if (lookupTable.hasOwnProperty(s[i])) {
                ret += lookupTable[s[i]];
            } else {
                return false;
            }
        }
        return ret;
    };

    this.get_ping_data = function(msg_parts, device_id) {
        var str = msg_parts.data;
        console.log("Data string");
        console.log(str);
        console.log(" --------------- ");
        console.log("calculating orientation and status");
        console.log("digits to converto to binary: ", str.substr(32, 4));
        var orientationStatus = this.hex2bin(str.substr(32, 4));
        console.log("converted to binary: ", orientationStatus);
        var orientation = orientationStatus.substr(6, 10);
        var orientationDegrees = parseInt(orientation, 2); // convertin from binary to decimal
        var gpsTrakingStatus = orientationStatus[2];
        console.log("GPS Tracking status: ", gpsTrakingStatus);
        console.log("Orientation in degrees: ", orientationDegrees);
        var data = {
            'device_id': device_id,
            'date': str.substr(0, 12),
            'set_count': str.substr(12, 2),
            'latitude_raw': str.substr(14, 8),
            'longitude_raw': str.substr(22, 8),
            'latitude': this.dex_to_degrees(str.substr(14, 8)),
            'longitude': '-'+this.dex_to_degrees(str.substr(22, 8)),
            'speed': parseInt(str.substr(30, 2), 16),
            'orientation': orientation,
            'orientation_plain': orientationDegrees,
            'lbs': str.substr(36, 16),
        };

        /*
         "device_info"	: f.str_pad(parseInt(str.substr(54,2)).toString(2), 8, 0),
         "power"	        : str.substr(56,2),
         "gsm"	        : str.substr(58,2),
         "alert"	        : str.substr(60,4),
         data['power_status'] = data['device_info'][0];
         data['gps_status'] = data['device_info'][1];
         data['charge_status'] = data['device_info'][5];
         data['acc_status']= data['device_info'][6];
         data['defence_status'] = data['device_info'][7];
         */

        res = {
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            orientation: data.orientation
        };
        return data;
    };
    this.set_refresh_time = function(interval, duration) {};
    this.bufferToHexString = function(buffer) {
        var str = '';
        for (var i = 0; i < buffer.length; i++) {
            if (buffer[i] < 16) {
                str += '0';
            }
            str += buffer[i].toString(16);
        }
        return str;
    };
};
exports.adapter = adapter;
