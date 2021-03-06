#!/usr/bin/env node
'use strict';

var request = require('request');

var host = process.env.HOST || 'http://localhost:3000/';
var statementsDir = 'statements';
var log = process.env.LOG || true;

var thomasKilmannClassifications = ["avoiding", "competing", "accomodating", "compromising", "collaborating"];

var dev = {
    username: 'tempdev1',
    password: 'dev',
    role: 'developer'
};

var teacher = {
    username: 'tempteacher1',
    password: 't',
    role: 'teacher'
};

var gameId;
var versionId;
var sessionId;
var trackingCode = process.env.TRACKING_CODE || '';
var addThomasKilmannData = process.env.ADD_THOMAS_KILMANN_DATA || '';

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

    var dirFiles = [];
    filesystem.readdirSync(path.join(__dirname, dir)).forEach(function (file) {

        file = path.join(dir, file);

        if (log) {
            console.log("Reading: " + file);
        }

        var data = JSON.parse(filesystem.readFileSync(path.join(__dirname, file), options));

        var statements = [];
        data.forEach(function (trace) {
            statements.push(trace);
        });
        dirFiles.push(statements);
    });


    if (log) {
        console.log('Files count', dirFiles.length);
    }
    return dirFiles;
};

function buildThomasKilmannClassification() {
    return thomasKilmannClassifications[Math.floor(Math.random() * thomasKilmannClassifications.length)];
}

function buildListofBiases() {
    return {
        "gender": Math.random() < 0.5 ? true : false,
        "race": Math.random() < 0.5 ? true : false,
        "ability": Math.random() < 0.5 ? true : false,
        "occupation": Math.random() < 0.5 ? true : false,
        "fashion": Math.random() < 0.5 ? true : false,
        "otherSocial": Math.random() < 0.5 ? true : false
    }
}

var sendStatementsToCollector = function (trackingCode, statements, callback) {

    request.post(host + 'api/proxy/gleaner/collector/start/' + trackingCode, {
            json: true
        },
        function (err, httpResponse, body) {
            if (err || httpResponse.statusCode !== 200) {
                if (log) {
                    console.error(err);
                    console.error(httpResponse.statusCode);
                    console.log('Did not start the collection process! Err:', err, 'Status code:', httpResponse.statusCode, 'Body', JSON.stringify(body, null, '    '));
                }
                return callback(err);
            }

            for (var i = 0; i < statements.length; ++i) {
                var statement = statements[i];
                statement.actor = body.actor;

                if (!statement.object) {
                    statement.object = {};
                }
                if (!statement.object.definition) {
                    statement.object.definition = {};
                }

                if (!statement.object.definition.type) {
                    statement.object.definition.type = '.../test_type';
                }

                if (addThomasKilmannData) {
                    if (!statement.result) {
                        statement.result = {};
                    }

                    if (!statement.result.extensions) {
                        statement.result.extensions = {};
                    }


                    statement.result.extensions["https://rage.e-ucm.es/xapi/ext/thomasKilmann"] = buildThomasKilmannClassification();
                    statement.result.extensions["https://rage.e-ucm.es/xapi/ext/biases"] = buildListofBiases();
                }
            }

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
                        console.log('Did not track the statements! Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
                    }
                    return callback(err);
                }

                if (log) {
                    console.log('Statements sent successfully.');
                }
                callback(null, body);
            });
        });
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
                console.log('Didn\'t signup', name, 'Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
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
                console.log('Did register', name, 'Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
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
            title: 'Test Game',
            public: true
        },
        headers: {
            Authorization: authToken
        },
        json: true
    }, function (err, httpResponse, body) {
        if (err || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Didn\'t create a new game Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
            }
            return callback(err);
        }

        if (log) {
            console.log('Test game created successfully');
        }
        callback(null, body);
    });
};

var createNewSessionGame = function (authToken, gameId, versionId, callback) {
    request({
        uri: host + 'api/proxy/gleaner/games/' + gameId + '/versions/' + versionId + '/sessions',
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
                console.log('Didn\'t create a new session Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
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
                    console.log('Didn\'t allow anonymous users Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
                }
                return callback(err);
            }

            if (log) {
                console.log('Anonymous users allowed successfully');
            }
            callback(null, body);
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
                console.log('Didn\'t start the session Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
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
                console.log('Didn\'t create a new version for the game', gameId, 'Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
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
                console.log('LogIn correct', body);
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
                    console.log(body);
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
                console.log('LogIn correct', body);
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

if (!trackingCode) {

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

            var statementsFromDir = getStatementsFromDir(statementsDir);

            statementsFromDir.forEach(function (statements) {
                sendStatementsToCollector(trackingCode, statements, function (err, res) {
                    if (err) {
                        if (log) {
                            console.log('Failed to setup the teacher operations', err);
                        }
                    }
                    else {
                        if (log) {
                            console.log('Statements sent, result', res);
                        }
                    }
                })
            });
        });
    });
} else {
    var statementsFromDir = getStatementsFromDir(statementsDir);

    statementsFromDir.forEach(function (statements) {
        sendStatementsToCollector(trackingCode, statements, function (err, res) {
            if (err) {
                if (log) {
                    console.log('Failed to setup the teacher operations', err);
                }
            }
            else {
                if (log) {
                    console.log('Statements sent, result', res);
                }
            }
        })
    });
}
