#!/usr/bin/env node
'use strict';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
var request = require('request');
var async = require('async');
var argv = require('yargs')
    .option('host', {
        alias: 't',
        describe: 'Where to connect to the base server (A2)',
        default: 'http://localhost:3000/'
    })
    .option('statementsDir', {
        alias: 's',
        describe: 'The directory where to read the statements from, relative to this file path',
        default: 'statements'
    })
    .option('log', {
        alias: 'l',
        describe: 'Activate the log output',
        default: false
    })
    .option('rounds', {
        alias: 'r',
        describe: 'The amount of times to send all the traces',
        default: 1
    })
    .option('devUsername', {
        alias: 'du',
        describe: 'Developer username (that will be used to configure the game)',
        default: 'tempdev1'
    })
    .option('devPassword', {
        alias: 'dp',
        describe: 'Developer password (that will be used to configure the game)',
        default: 'dev'
    })
    .option('devRole', {
        alias: 'dr',
        describe: 'Developer role (that will be used to configure the game)',
        default: 'developer'
    })
    .option('teacherUsername', {
        alias: 'tu',
        describe: 'Teacher username (that will be used to configure the game)',
        default: 'tempteacher2'
    })
    .option('teacherPassword', {
        alias: 'tp',
        describe: 'Teacher password (that will be used to configure the game)',
        default: 'tea'
    })
    .option('teacherRole', {
        alias: 'tr',
        describe: 'Teacher role (that will be used to configure the game)',
        default: 'teacher'
    })
    .fail(function (msg, err, yargs) {
        if (err) throw err; // preserve stack
        console.error('The tests failed!');
        console.error(msg);
        console.error('Error', err);
        console.error('You should be doing', yargs.help());
        process.exit(1);
    })
    .help('h')
    .alias('h', 'help')
    .epilog('e-UCM Research Group - for more information find our manual at https://github.com/e-ucm/rage-analytics/wiki')
    .argv;

var host = process.env.HOST || argv.host || args.t ||  'http://localhost:3000/';
if (!host.endsWith("/")) {
    host = host + "/";
}
var statementsDir = argv.statementsDir || argv.s || 'statements';
var log = argv.log || argv.l || process.env.LOG || false;
var rounds = argv.rounds || argv.r || 1;
if (rounds < 1) {
    rounds = 1;
}

var dev = {
    username: argv.devUsername || argv.du || 'tempdev2',
    password: argv.devPassword || argv.dp || 'dev',
    role: argv.devRole || argv.dr || 'developer'
};

var teacher = {
    username: argv.teacherUsername || argv.tu || 'tempteacher2',
    password: argv.teacherPassword || argv.tp || 'tea',
    role: argv.teacherRole || argv.tr || 'teacher'
};

var gameId;
var versionId;
var classId;
var sessionId;
var trackingCode;
var usrTokens = {};
/**
 *
 * @param dir the directory where the xAPI Statements are located. E.g. '/statements'.
 * @returns {Array} Array of all the traces that have been obtained from the given directory.
 */
var getStatementsFromDir = function (dir) {

    if (log) {
        console.log('Reading all traces from directory', dir);
    }

    var filesystem = require("fs");
    var path = require('path');

    var options = {
        encoding: 'utf-8'
    };

    if (log) {
        var totalStatements = 0;
    }
    var dirFiles = [];
    filesystem.readdirSync(path.join(__dirname, dir)).forEach(function (file) {

        file = path.join(dir, file);

        if (log) {
            console.log("Reading: " + file);
        }

        var data = JSON.parse(filesystem.readFileSync(path.join(__dirname, file), options));

        var statements = [];
        data.forEach(function (trace) {
            if (!trace.object) {
                trace.object = {};
            }
            if (!trace.object.definition) {
                trace.object.definition = {};
            }

            if (!trace.object.definition.type) {
                trace.object.definition.type = '.../test_type';
            }
            statements.push(trace);
        });
        if (log) {
            totalStatements += statements.length;
        }
        dirFiles.push(statements);
    });


    if (log) {
        console.log('Files count', dirFiles.length, 'Total statements', totalStatements);
    }
    return dirFiles;
};


var sendStatementsToCollector = function (trackingCode, statements, round, callback) {
    if(usrTokens[statements[0].actor.name]){
        request({
            uri: host + 'api/proxy/gleaner/collector/track',
            method: 'POST',
            body: statements,
            json: true,
            headers: {
                Authorization: usrTokens[statements[0].actor.name]
            }
        }, function (err, httpResponse, body) {
            if (err || httpResponse.statusCode !== 200) {
                if (log) {
                    console.log('Did not track the statements! Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
                }
                return callback(err);
            }

            if (log) {
                console.log(statements.length, 'Statements sent successfully.');
            }
            callback(null, body);
        });
    } else {
        request.post(host + 'api/proxy/gleaner/collector/start/' + trackingCode, {
                json: true
            },
            function (err, httpResponse, body) {
                if (err || httpResponse.statusCode !== 200) {
                    if (log) {
                        console.error(err);
                        console.error(httpResponse.statusCode);
                        console.log('Did not start the collection process! Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
                    }
                    return callback(err);
                }
                /*
                for (var i = 0; i < statements.length; ++i) {
                    var statement = statements[i];
                    statement.actor = body.actor;
                }
                */
                usrTokens[statements[0].actor.name] = body.authToken;
                request({
                    uri: host + 'api/proxy/gleaner/collector/track',
                    method: 'POST',
                    body: statements,
                    json: true,
                    headers: {
                        Authorization: body.authToken
                    }
                }, function (err, httpResponse, body) {
                    if (err || httpResponse.statusCode !== 200) {
                        if (log) {
                            console.log('Did not track the statements! Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
                        }
                        return callback(err);
                    }

                    if (log) {
                        console.log(statements.length, 'Statements sent successfully.');
                    }
                    callback(null, body);
                });
            });
    }
};

var signUp = function (name, password, role, callback) {
    request({
        uri: host + 'api/signup',
        method: 'POST',
        body: {
            username: name,
            password: password,
            email: name + '@email.com',
            role: role,
            prefix: 'gleaner'
        },
        json: true
    }, function (err, httpResponse, body) {
        if (err || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Didn\'t signup', name, 'Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
            }
            return callback(err);
        }

        if (log) {
            console.log('Signed up successfully', name);
        }
        callback(null, body);
    });
};


var logIn = function (name, password, callback) {
    request({
        uri: host + 'api/login',
        method: 'POST',
        body: {
            username: name,
            password: password
        },
        json: true
    }, function (err, httpResponse, body) {
        if (err || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Did register', name, 'Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
            }
            return callback(err);
        }

        if (log) {
            console.log('Logged in successfully', name);
        }
        callback(null, body);
    });
};

var createNewGame = function (authToken, callback) {
    request({
        uri: host + 'api/proxy/gleaner/games',
        method: 'POST',
        body: {
            title: 'Test Game'
        },
        headers: {
            Authorization: authToken
        },
        json: true
    }, function (err, httpResponse, body) {
        if (err || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Didn\'t create a new game Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
            }
            return callback(err);
        }

        if (log) {
            console.log('Test game created successfully');
        }

        request({
            uri: host + 'api/proxy/gleaner/games/' + body._id,
            method: 'PUT',
            body: {
                public: true
            },
            headers: {
                Authorization: authToken
            },
            json: true
        }, function (err, httpResponse, body) {
            if (err || httpResponse.statusCode !== 200) {
                if (log) {
                    console.log('Didn\'t configure the new game as public Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
                }
                return callback(err);
            }

            if (log) {
                console.log('Test game configured as public successfully');
            }
            callback(null, body);

        });
    });
};

var createNewSessionGame = function (authToken, gameId, versionId, callback) {
    request({
        uri: host + 'api/proxy/gleaner/games/' + gameId + '/versions/' + versionId + '/classes',
        method: 'POST',
        body: {
            name: 'Test Class'
        },
        headers: {
            Authorization: authToken
        },
        json: true
    }, function (err, httpResponse, body) {
        if (err || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Didn\'t create a new class Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
            }
            return callback(err);
        }

        if (log) {
            console.log('Test class created successfully');
        }

        classId = body._id;
        request({
            uri: host + 'api/proxy/gleaner/games/' + gameId + '/versions/' + versionId + '/classes/' + classId + '/sessions',
            method: 'POST',
            body: {
                name: 'Test Session'
            },
            headers: {
                Authorization: authToken
            },
            json: true
        }, function (err, httpResponse, body) {
            if (err || httpResponse.statusCode !== 200) {
                if (log) {
                    console.log('Didn\'t create a new class Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
                }
                return callback(err);
            }

            if (log) {
                console.log('Test session created successfully');
            }
            sessionId = body._id;
            request({
                uri: host + 'api/proxy/gleaner/sessions/' + sessionId,
                method: 'PUT',
                body: {
                    allowAnonymous: true
                },
                headers: {
                    Authorization: authToken
                },
                json: true
            }, function (err, httpResponse, body) {
                if (err || httpResponse.statusCode !== 200) {
                    if (log) {
                        console.log('Didn\'t allow anonymous users Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
                    }
                    return callback(err);
                }

                if (log) {
                    console.log('Anonymous users allowed successfully');
                }
                callback(null, body);
            });
        });
    });
};

var startSession = function (authToken, sessionId, callback) {
    request({
        uri: host + 'api/proxy/gleaner/sessions/' + sessionId + '/event/start',
        method: 'POST',
        body: {
            allowAnonymous: true
        },
        headers: {
            Authorization: authToken
        },
        json: true
    }, function (err, httpResponse, body) {
        if (err || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Didn\'t start the session Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
            }
            return callback(err);
        }

        if (log) {
            console.log('Session started successfully');
        }
        callback(null, body);
    });
};

var createNewGameVersion = function (authToken, gameId, callback) {
    request({
        uri: host + 'api/proxy/gleaner/games/' + gameId + '/versions',
        method: 'POST',
        headers: {
            Authorization: authToken
        },
        json: true
    }, function (err, httpResponse, body) {
        if (err || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Didn\'t create a new version for the game', gameId, 'Err:', err, 'Status code:', httpResponse ? httpResponse.statusCode : httpResponse, 'Body', body);
            }
            return callback(err);
        }

        if (log) {
            console.log('Test game created successfully');
        }
        callback(null, body);
    });
};

/**
 * Sign Up, Log In, Create Game, Create Game Version
 */
var setupDeveloperOperations = function (callback) {
    signUp(dev.username, dev.password, dev.role, function (err, body) {
        if (err) {
            if (log) {
                console.log('Failed to signUp', dev.username, err);
            }
            return callback(err);
        }

        logIn(dev.username, dev.password, function (err, body) {
            if (err) {
                if (log) {
                    console.log('Failed to login', dev.username, err);
                }
                return callback(err);
            }

            if (log) {
                console.log('LogIn correct', body.username);
            }

            var authToken = 'Bearer ' + body.user.token;
            dev.authToken = authToken;
            createNewGame(authToken, function (err, body) {
                if (err) {
                    if (log) {
                        console.log('Failed to create a new game', err);
                    }
                    return callback(err);
                }

                gameId = body._id;
                createNewGameVersion(authToken, gameId, function (err, body) {
                    if (err) {
                        if (log) {
                            console.log('Failed to create a new version for the game', gameId, err);
                        }
                        return callback(err);
                    }

                    versionId = body._id;
                    trackingCode = body.trackingCode;
                    if (log) {
                        console.log('New game version creation successfully!');
                    }
                    callback(null, body);
                });
            });
        });
    });
};

var setupTeacherOperations = function (callback) {
    signUp(teacher.username, teacher.password, teacher.role, function (err, body) {
        if (err) {
            if (log) {
                console.log('Failed to signUp', teacher.username, err);
            }
            return callback(err);
        }

        logIn(teacher.username, teacher.password, function (err, body) {
            if (err) {
                if (log) {
                    console.log('Failed to login', teacher.username, err);
                }
                return callback(err);
            }

            if (log) {
                console.log('LogIn correct', body.username);
            }

            var authToken = 'Bearer ' + body.user.token;
            teacher.authToken = authToken;
            createNewSessionGame(authToken, gameId, versionId, function (err, body) {
                if (err) {
                    if (log) {
                        console.log('Failed to create a new session', err);
                    }
                    return callback(err);
                }

                startSession(authToken, sessionId, function (err, body) {
                    if (err) {
                        if (log) {
                            console.log('Failed start the session', gameId, err);
                        }
                        return callback(err);
                    }

                    callback(null, body);
                });
            });
        });
    });
};


var sendFolderTraces = function (round, callback) {
    var statementsFromDir = getStatementsFromDir(statementsDir);

    statementsFromDir.forEach(function (statements) {
        async.eachSeries(statements, function (statement, inDone) {
            if (statement) {
                if (statement.actor) {
                    statement.actor.name = 'round-' + round + '-' + statement.actor.name;
                }
                sendStatementsToCollector(trackingCode, [statement], round, function (err, res) {
                    if (err) {
                        callback(err);
                    }
                })}
                setTimeout(function(){
                    console.log("send trace")
                    inDone();
                }
                , 750);
        });
        /*
        sendStatementsToCollector(trackingCode, statements, round, function (err, res) {
            if (err) {
                callback(err);
            }
        })
        */
    });
    callback(null);
};


if (process.env.TRACKING_CODE) {
    trackingCode = process.env.TRACKING_CODE;

    var round;
    for (var i = 0; i < rounds; ++i) {
        round = i + 1;
        if (log) {
            console.log('Success sending all the folder traces, round', round);
        }
        sendFolderTraces(round, function (err) {
            if (err) {
                if (log) {
                    console.log('Failed to send traces from folder', err);
                }
                return process.exit(1);
            }

            if (log) {
                console.log('Success sending all traces to the collector', err);
            }
        });
    }
} else {

    setupDeveloperOperations(function (err, body) {
        if (err) {
            if (log) {
                console.log('Failed to setup the developer operations', err);
            }
            return process.exit(1);
        }

        if (log) {
            console.log('Success performing the developer operations', err);
        }

        setupTeacherOperations(function (err, body) {
            if (err) {
                if (log) {
                    console.log('Failed to setup the teacher operations', err);
                }
                return process.exit(1);
            }

            if (log) {
                console.log('Success performing the teacher operations', err);
            }

            var round;
            for (var i = 0; i < rounds; ++i) {
                round = i + 1;
                if (log) {
                    console.log('Success sending all the folder traces, round', round);
                }
                sendFolderTraces(round, function (err) {
                    if (err) {
                        if (log) {
                            console.log('Failed to send traces from folder', err);
                        }
                        return process.exit(1);
                    }

                    if (log) {
                        console.log('Success sending all traces to the collector', err);
                    }
                });
            }
        });
    });
}