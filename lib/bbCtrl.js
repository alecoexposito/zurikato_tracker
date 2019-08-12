var net = require('net');
const nmea = require('node-nmea');
var Client = require('node-rest-client').Client;
var config = require('../config');
var Readable = require('stream').Readable;
var fs = require('fs');
var path = require('path');
var moment = require('moment');

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
                var playlistFolder = "/var/www/html/cameras/" + data.deviceId + "/" + data.playlist;
                var playlistFile = playlistFolder + "/playlist.m3u8";
                if(data.type == "backup-file") {
                    console.log(data.fileName);
                    var fileBuffer = Buffer.from(data.fileData, 'base64');

                    if(!fs.existsSync(playlistFile)) {
                        _this.initPlayList(playlistFile, playlistFolder);
                        console.log("initialized backup and sending");
                        let playlistChannel = socket.subscribe(data.playlist + '_channel');
                        playlistChannel.publish({ type: "backup-initialized"});
                    }
                    var line = data.fileName;
                    fs.writeFile(playlistFolder + "/" + data.fileName, fileBuffer, function(err) {
                        if(err)
                            console.log("error creating the file: ", err);
                    });
                    _this.addTsToPlaylist(line, playlistFile, data.lastUtilityLine);
                } else if(data.type == "end-playlist") {
                    console.log("data en el endplaylist", data);
                    _this.writeToPlayList(playlistFile, "#EXT-X-ENDLIST");
                } else if(data.type == "download-video") {
                    _this.downloadVideoByTime(data.initialTime, data.totalTime, data.playlist, data.deviceId);
                }
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
            console.log("initiating playlist: ", playlistFolder);
            // fs.mkdirSync(playlistFolder, { recursive: true });
            var _this = this;
            this.mkDirByPathSync(playlistFolder);
            _this.writeToPlayList(filename, "#EXTM3U\n");
            _this.writeToPlayList(filename, "#EXT-X-VERSION:3\n");
            _this.writeToPlayList(filename, "#EXT-X-MEDIA-SEQUENCE:0\n");
            _this.writeToPlayList(filename, "#EXT-X-ALLOW-CACHE:YES\n");
            _this.writeToPlayList(filename, "#EXT-X-TARGETDURATION:32\n");
        }

        addTsToPlaylist(tsFilename, playlistFilename, infoLine) {
            var infoLineData = "#EXTINF:30.000000,\n";
            if(infoLine !== undefined)
                infoLineData = infoLine + "\n";
            this.writeToPlayList(playlistFilename, infoLineData);
            this.writeToPlayList(playlistFilename, tsFilename + "\n");
            // this.writeToPlayList("#EXT-X-ENDLIST\n");
        }

        mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
            const sep = path.sep;
            const initDir = path.isAbsolute(targetDir) ? sep : '';
            const baseDir = isRelativeToScript ? __dirname : '.';

            return targetDir.split(sep).reduce((parentDir, childDir) => {
                const curDir = path.resolve(baseDir, parentDir, childDir);
                try {
                    fs.mkdirSync(curDir);
                } catch (err) {
                    if (err.code === 'EEXIST') { // curDir already exists!
                        return curDir;
                    }

                    // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
                    if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
                        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
                    }

                    const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
                    if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
                        throw err; // Throw if it's just the last created dir.
                    }
                }

                return curDir;
            }, initDir);
        }

        downloadVideoByTime(initialTime, totalTime, playlistName, deviceId) {
            console.log("entered in download video by time");
            console.log("initial time: ", initialTime);
            console.log("total time: ", totalTime);
            var location = "/var/www/html/cameras/" + deviceId + "/" + playlistName;
            if(fs.existsSync(location + "/videos.txt")) {
                fs.truncateSync(location + "/videos.txt", 0);
            }

            fs.readdir(location, (err, files) => {
                var noFileFound = true;
                var firstPass = true;
                var initialDate = null;
                var endDate = null;
                var noFileFound = true;
                var _this = this;
                var scriptsLocation = "/usr/scripts";
                files.forEach(file => {
                    noFileFound = false;
                    if(file != 'playlist.m3u8') {
                        if(firstPass) {
                            var dateStr = file.replace("_hls.ts", "");
                            var fileDate = moment(dateStr, 'YYYY-MM-DD_HH-mm-ss');
                            var initialDateTmp = fileDate.add(Math.floor(initialTime), 'seconds');
                            initialDate = initialDateTmp.format('YYYY-MM-DD_HH-mm-ss') + "_hls.ts";
                            endDate = initialDateTmp.add(Math.ceil(totalTime), 'seconds').format('YYYY-MM-DD_HH-mm-ss') + "_hls.ts";
                            console.log("initial date: ", initialDate);
                            console.log("end date: ", endDate);
                            firstPass = false;
                        }
                        var filename = location + "/videos.txt";
                        if(file >= initialDate && file <= endDate) {
                            console.log("included file: ", file);
                            fs.appendFileSync(filename, "file " + file + "\n", function(err) {
                                if(err) {
                                    return console.log("error: ", err);
                                }
                            });
                        }
                    }
                });
                var videoBackupChannel = scServer.exchange.subscribe(playlistName + '_channel');
                _this.runCommand("sh", [
                    scriptsLocation + '/join-cut-segments.sh',
                    initialTime,
                    totalTime,
                    playlistName,
                    deviceId
                ], function() {
                    videoBackupChannel.publish({ type: "download-ready" });
                });

                if(noFileFound == true) {
                    videoBackupChannel.publish({ type: "no-video-available" });
                }
            });

        }

        runCommand(command, params, closeCallback) {
            var _this = this;
            const
                {spawn} = require('child_process'),
                vcommand = spawn(command, params, {
                    detached: true
                });

            vcommand.stdout.on('data', data => {
                console.log(`stdout: ${data}`);
            });

            vcommand.stderr.on('data', data => {
                console.log(`stderr: ${data}`);
            });

            vcommand.on('close', code => {
                if(closeCallback !== undefined) {
                    console.log("executing callback function");
                    closeCallback();
                }
                _this.livePid = null;
                console.log('------------------child process exited with code ${code} ----------------');
            });
            return vcommand;
        }



    }

    return new bbController(scServer);
};
