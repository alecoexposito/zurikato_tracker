var net = require('net');
const nmea = require('node-nmea');
var Client = require('node-rest-client').Client;
var config = require('../config');
var Readable = require('stream').Readable;
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var util = require('util');
var cp = require('child_process');

module.exports = (scServer) => {
    class bbController {
        constructor() {
        }

        run(options) {
            var _this = this;
            var client = new Client();
            var lastData = null;
            var server = net.createServer(function (socket) {

                socket.write('Echo server\r\n');
                socket.pipe(socket);
                socket.on('data', function (data) {
                    try {
                        let dataStr = data.toString().replace("][", ", ");
                        dataStr = dataStr.toString().replace(", ]", "]");
                        console.log("data before explode: ", dataStr);
                        let gpsData = JSON.parse(dataStr);
                        let offlineIds = [];
                        if(Array.isArray(gpsData)) {
                            for (let i = 0; i < gpsData.length; i++) {
                                let elem = gpsData[i];
                                elem.orientation_plain = elem.track;
                                console.log("bb elem: ", elem);
                                var args = {
                                    data: {'deviceModel': 'BB', 'gpsData': elem},
                                    headers: {"Content-Type": "application/json"}
                                };
                                console.log("ENVIANDO ESTO A LA API-----------: ", args);
                                client.post(config.apiUrl + "/gps/coords", args, function (err, response, body) {
                                });
                                offlineIds.push(elem.offline_id);
                            }
                            let reply = {
                                type: 'reply-offline',
                                info: 'received',
                                ids: offlineIds
                            };
                            socket.write(JSON.stringify(reply), function(err) {
                                if(err) {
                                    console.log("error sending ok to socket");
                                } else {
                                    console.log("received offline sent to bb: ", reply);
                                }
                            });

                        } else {
                            gpsData.orientation_plain = gpsData.track;
                            console.log("bb gpsData: ", gpsData);
                            scServer.exchange.publish(gpsData.device_id, gpsData);
                            var args = {
                                data: {'deviceModel': 'BB', gpsData},
                                headers: {"Content-Type": "application/json"}
                            };
                            client.post(config.apiUrl + "/gps/coords", args, function (err, response, body) {
                                if(response.statusCode === 200) {
                                    let localId = gpsData.localId;
                                    let reply = {
                                        type: 'reply',
                                        info: 'received',
                                        localId: localId
                                    };
                                    socket.write(JSON.stringify(reply), function(err) {
                                        if(err) {
                                            console.log("error sending ok to socket");
                                        } else {
                                            console.log("received sent to bb", reply);
                                        }
                                    });
                                }
                            });
                        }


                    } catch (error) {
                        console.log(error);
                    }
                });
                socket.on('error', function(err) {
                    console.log("ocurrio un error en el socket", err);
                })

            });

            server.listen(options.port, options.ipaddress);
            var lastUtilityLine = "";


            var videoBackupChannel = scServer.exchange.subscribe("video_backup_channel");
            videoBackupChannel.watch(function(data) {
                var playlistFolder = "/var/www/html/cameras/" + data.deviceId + "/" + data.playlist;
                var playlistFile = playlistFolder + "/playlist.m3u8";
                if(data.type == "backup-file") {

                    if(!fs.existsSync(playlistFile)) {
                        _this.initPlayList(playlistFile, playlistFolder);
                        let playlistChannel = scServer.exchange.subscribe(data.playlist + '_channel');
                        playlistChannel.publish({ type: "backup-initialized"});
                    }
                    var line = data.fileName;
                    if (data.isFirstTime) {
                        _this.addTsToPlaylist(line, playlistFile, data.lastUtilityLine);
                    } else {
                        _this.removeLastLine(playlistFile).then(() => {
                            _this.addTsToPlaylist(line, playlistFile, data.lastUtilityLine);
                        });
                    }
                } else if(data.type == "end-playlist") {
                    _this.writeToPlayList(playlistFile, "#EXT-X-ENDLIST");
                } else if(data.type == "download-video") {
                    _this.downloadVideoByTime(data.initialTime, data.totalTime, data.playlist, data.deviceId);
                } else if(data.type === "continue-playlist") {
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
            var _this = this;
            _this.mkDirByPathSync(playlistFolder);
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
            this.writeToPlayList(playlistFilename, tsFilename + "\n\n");
            // this.writeToPlayList("#EXT-X-ENDLIST\n");
        }

        mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
            const sep = path.sep;
            const initDir = path.isAbsolute(targetDir) ? sep : '';
            const baseDir = isRelativeToScript ? __dirname : '.';

            return targetDir.split(sep).reduce((parentDir, childDir) => {
                const curDir = path.resolve(baseDir, parentDir, childDir);
                try {
                    fs.mkdirSync(curDir, {recursive: true});
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

        removeLastLine(filename) {
            var lines2nuke = 1;
            var command = util.format('tail -n %d %s', lines2nuke, filename);

            cp.exec(command, (err, stdout, stderr) => {
                if (err) throw err;
                var to_vanquish = stdout.length;
                fs.stat(filename, (err, stats) => {
                    if (err) throw err;
                    fs.truncate(filename, stats.size - to_vanquish, (err) => {
                        if (err) throw err;
                        return Promise.resolve();
                    })
                });
            });
        }

    }

    return new bbController(scServer);
};
