var net = require('net');
const nmea = require('node-nmea');
var Client = require('node-rest-client').Client;
var config = require('../config');
var Readable = require('stream').Readable;

module.exports = (scServer) => {
    class bbController {
        constructor() {
        }

        run(options) {
            var _this = this;
            var client = new Client();
            var server = net.createServer(function (socket) {

                socket.write('Echo server\r\n');
                socket.pipe(socket);
                socket.on('data', function (data) {
                    // console.log("enviando a bb");
                    // scServer.exchange.publish("camera_channel", { message: 'from tracker to BB' });
                    // console.log("bb data: ", data);
                    //let gprmc = nmea.parse(data.toString());
                    try {
                        console.log("data before explode: ", data.toString());
                        let gpsData = JSON.parse(data.toString());
                        // console.log("bb gpsData: ", gpsData);
                        scServer.exchange.publish(gpsData.device_id, gpsData);
                        var args = {
                            data: {'deviceModel': 'BB', gpsData},
                            headers: {"Content-Type": "application/json"}
                        };
                        //client.post("https://zurikatoapi.herokuapp.com/api/v1/gps/coords", args, function (data, response) {});
                        client.post(config.apiUrl + "/gps/coords", args, function (data, response) {
                        });

                    } catch (error) {
                        console.log(error);
                    }
                });

            });

            console.log('PUERTO E IPPPPPPPP');
            console.log(options.port);
            console.log(options.ipaddress);
            server.listen(options.port, options.ipaddress);
            console.log('after serverlisten');
            var lastUtilityLine = "";


            var videoBackupChannel = scServer.exchange.subscribe("video_backup_channel");
            videoBackupChannel.watch(function(data) {
                console.log(data.fileName);
                var fileBuffer = Buffer.from(data.fileData, 'base64');
                var s = new Readable();
                s.push(fileBuffer);
                s.push(null);
                s.pipe(fs.createWriteStream("/var/www/html/" + data.deviceId + "/" + data.playlist + "/" + data.fileName));
                var playlistFile = "/var/www/html/" + data.deviceId + "/" + data.playlist + "/playlist.m3u8";
                if(!fs.existsSync(playlistFile)) {
                    var playlistFolder = "/var/www/html/" + data.deviceId + "/" + data.playlist;
                    _this.initPlayList(playlistFile, playlistFolder);
                }

                var line = data.fileName;
                _this.addTsToPlaylist(line, playlistFile, data.lastUtilityLine);

                // console.log("received in backup channel: ", data);
            });

        }

        writeToPlayList(filename, data) {
            fs.appendFileSync(filename, data, function(err) {
                if(err) {
                    return console.log("error: ", err);
                }
            });
        }

        initPlayList(filename, playlistFolder) {
            fs.mkdirSync(playlistFolder);
            this.writeToPlayList(filename, "#EXTM3U\n");
            this.writeToPlayList(filename, "#EXT-X-VERSION:3\n");
            this.writeToPlayList(filename, "#EXT-X-MEDIA-SEQUENCE:0\n");
            this.writeToPlayList(filename, "#EXT-X-ALLOW-CACHE:YES\n");
            this.writeToPlayList(filename, "#EXT-X-TARGETDURATION:32\n");
        }

        addTsToPlaylist(tsFilename, playlistFilename, infoLine) {
            var infoLineData = "#EXTINF:30.000000,\n";
            if(infoLine !== undefined)
                infoLineData = infoLine + "\n";
            this.writeToPlayList(playlistFilename, infoLineData);
            this.writeToPlayList(playlistFilename, tsFilename + "\n");
            // this.writeToPlayList("#EXT-X-ENDLIST\n");
        }

    }

    return new bbController(scServer);
};
