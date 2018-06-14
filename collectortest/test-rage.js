#!/usr/bin/env node
'use strict';

var request = require('request');
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

var frequency = 1;
var host = process.env.HOST || 'http://localhost:3000/';
var statementsDir = 'statements';
var log = process.env.LOG || true;
var trackingCode = process.env.TRACKING_CODE || '';
var method = 'random';
var batchSize = 10;
var fromscript = -1;

var TrackerAsset = require('xapi-tracker');
var tracker = new TrackerAsset();

// ############### OBTAIN PARAMETERS ###############

var op_lastname = '';
var op_lastval = '';
var op_lastresult = '';
var obtainParameter = function(name, val){
    if(name === op_lastname && val === op_lastval){
        return op_lastresult;
    }

    var result = false;
    op_lastname = name;
    op_lastval = val;
    var fullname = '--' + name + '=';
    var v = val.indexOf(fullname);

    if(v>-1){
        result = val.substr(fullname.length);
    }

    op_lastresult = result;
    return result;
};

process.argv.forEach(function (val, index, array) {
    host = obtainParameter('host', val) ? obtainParameter('host', val) : host;
    trackingCode = obtainParameter('tracking_code', val) ? obtainParameter('tracking_code', val) : trackingCode;
    method = obtainParameter('method', val) ? obtainParameter('method', val) : method;
    frequency = obtainParameter('frequency', val) ? parseInt(obtainParameter('frequency', val)) : frequency;
    batchSize = obtainParameter('batch_size', val) ? parseInt(obtainParameter('batch_size', val)) : batchSize;
    statementsDir = obtainParameter('path', val) ? obtainParameter('path', val) : statementsDir;
    fromscript = obtainParameter('fromscript', val) ? obtainParameter('fromscript', val) : fromscript;
});

console.log('Sending traces to host: ' + host);
console.log('With frequency: ' + frequency + ' t/s');
console.log('With method: ' + method);
if(trackingCode != ''){
    console.log('To the Tracking Code: ' + trackingCode);
}
if(method == 'stored'){
    console.log('From path: ' + statementsDir);
}
if(fromscript && statementsDir !== 'statements'){
    statementsDir = '/../' + statementsDir; 
}
// #################################################

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomString() {
    return Math.random().toString(36).substring(7);
}

function getRandomPhrase(){
    var subjects=['Ivan', 'Balta', 'Manu', 'Cristian', 'Cristi', 'Victorma', 'Toni', 'ESDLM'];
    var verbs=['will search for','will get','will find','attained','found','will start interacting with'
                ,'will accept','accepted', 'used', 'will use', 'stealed', 'will steal'];
    var objects=['Untested code','a gallon of lube','a picture of Javi','my self steem'
                ,'experiments in mordor', 'a bunch of cooper', 'a typo', 'undocumented code'
                , 'a paper without references', 'a NSFW meme', 'a deprecated library in the release', ''];
    var endings=['the day of the pilots',', right?','.',', ass follows.','.',', just like your momma!'];


    return subjects[Math.round(Math.random()*(subjects.length-1))]
            +' '+verbs[Math.round(Math.random()*(verbs.length-1))]
            +' '+objects[Math.round(Math.random()*(objects.length-1))]
            +endings[Math.round(Math.random()*(endings.length-1))];
}

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
var activityId;
var classId;
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
    var files = [];

    var currentdir = path.join(__dirname, dir);
    console.log();
    if(filesystem.lstatSync(currentdir).isDirectory()){
        files = filesystem.readdirSync(currentdir);
        for(var i = 0; i < files.length; i++){
            files[i] = path.join(currentdir, files[i]);
        }
    }else{
        files.push(currentdir);
    }

    for(var i = 0; i < files.length; i++){
        var file = files[i];

        if (log) {
            console.log("Reading: " + file);
        }

        var data = JSON.parse(filesystem.readFileSync(file, options));

        var statements = [];
        data.forEach(function (trace) {
            statements.push(trace);
        });
        dirFiles.push(statements);
    }


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
        if (err || !httpResponse || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Didn\'t signup', name, 'Err:', err, 'Status code:',
                    httpResponse ? httpResponse.statusCode : -1, 'Body', body);
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

var createNewClass = function (authToken, callback) {
    request({
        uri: host + 'api/proxy/gleaner/classes',
        method: 'POST',
        body: {
            name: 'Test Class',
        },
        headers: {
            Authorization: authToken
        },
        json: true
    }, function (err, httpResponse, body) {
        if (err || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Didn\'t create a new class Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
            }
            return callback(err);
        }

        classId = body._id;

        if (log) {
            console.log('Test class created successfully');
        }
        callback(null, body);
    });
};

var createNewActivity = function (authToken, gameId, versionId, classId, callback) {
    request({
        uri: host + 'api/proxy/gleaner/activities/',
        method: 'POST',
        body: {
            name: 'Test Activity',
            gameId: gameId,
            versionId: versionId,
            classId: classId
        },
        headers: {
            Authorization: authToken
        },
        json: true
    }, function (err, httpResponse, body) {
        if (err || httpResponse.statusCode !== 200) {
            if (log) {
                console.log('Didn\'t create a new activity Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
            }
            return callback(err);
        }

        if (log) {
            console.log('Test activity created successfully');
        }

        activityId = body._id;

        console.log("Tracking code is: " + body.trackingCode);

        request({
            uri: host + 'api/proxy/gleaner/activities/' + activityId,
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

var startActivity = function (authToken, sessionId, callback) {
    request({
        uri: host + 'api/proxy/gleaner/activities/' + sessionId + '/event/start',
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
                console.log('Didn\'t start the activity Err:', err, 'Status code:', httpResponse.statusCode, 'Body', body);
            }
            return callback(err);
        }

        if (log) {
            console.log('Activity started successfully');
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

            createNewClass(authToken, function (err, body) {
                if (err) {
                    if (log) {
                        console.log('Failed to create a new Class', err);
                    }
                    return callback(err);
                }

                if (log) {
                    console.log('Class created', body);
                }

                createNewActivity(authToken, gameId, versionId, classId, function (err, body) {
                    if (err) {
                        if (log) {
                            console.log('Failed to create a new activity', err);
                        }
                        return callback(err);
                    }

                    startActivity(authToken, activityId, function (err, body) {
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
    });
};


var sendStatementsFromDir = function(dir){
    var statementsFromDir = getStatementsFromDir(dir);

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
};

var sendRandomAccessibleTrace = function(){
    if(getRandomInt(0,1)){
        tracker.Accessible.Accessed(getRandomString(), getRandomInt(0,4));
    }else{
        tracker.Accessible.Skipped(getRandomString(), getRandomInt(0,4));
    }
};

var sendRandomAlternativeTrace = function(){
    if(getRandomInt(0,1)){
        tracker.setSuccess(getRandomInt(0,1) ? true : false);
    }

    if(getRandomInt(0,1)){
        tracker.Alternative.Selected(getRandomString(), getRandomPhrase(), getRandomInt(0,5));
    }else{
        tracker.Alternative.Unlocked(getRandomString(), getRandomPhrase(), getRandomInt(0,5));
    }
};

var sendRandomCompletableTrace = function(){
    switch(getRandomInt(0,2)){
        case 0: 
            tracker.Completable.Initialized(getRandomString(), getRandomInt(0,8));
            break;
        case 1: 
            tracker.Completable.Progressed(getRandomString(), getRandomInt(0,8), getRandomInt(0,10)/10.0);
            break;
        case 2: 
        default:
            tracker.Completable.Completed(getRandomString(), getRandomInt(0,8)
                ,getRandomInt(0,1) ? true : false, getRandomInt(0,10)/10.0); 
            break;
    }
};

var sendRandomGameObjectTrace = function(){
    if(getRandomInt(0,1)){
        tracker.GameObject.Interacted(getRandomString(), getRandomInt(0,3));
    }else{
        tracker.GameObject.Used(getRandomString(), getRandomInt(0,3));
    }
};

var sendRandomTrace = function (callback){
    switch(getRandomInt(1,4)){
        case 1:
            sendRandomAccessibleTrace();
            break;
        case 2:
            sendRandomAlternativeTrace();
            break;
        case 3:
            sendRandomCompletableTrace();
            break;
        case 4:
        default:
            sendRandomGameObjectTrace();
            break;
    }

    console.log('Asking to flush: ' + tracker.queue.length 
                +  ' traces,\tBlocks pending: ' + tracker.tracesPending.length
                +  ' traces,\tBlocks unlogged: ' + tracker.tracesUnlogged.length);
    tracker.Flush(function(response, error){
        callback(error, response);
    });
};

var sendStatementsRandom = function (callback){
    tracker.settings.host = host;
    tracker.settings.batch_size = batchSize;
    tracker.settings.debug = false;
    tracker.settings.trackingCode = trackingCode;

    tracker.Start(function(result, error){
        if(error){
            console.log('Unable to start');
            return callback(result);
        }

        setInterval(function(){
            sendRandomTrace(function(err, result){
                if(err){
                    console.log("Error sending trace");
                }else{
                    console.log("Trace sent");
                }
            })
        }, 1000 / frequency);
    });
};

var sendTraces = function(method, callback){
    switch(method){
        case 'stored':
            sendStatementsFromDir(statementsDir, callback);
            break;
        case 'random':
        default:
            sendStatementsRandom(callback);
            break;
    }
};

var obtainTrackingCode = function(callback){
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

            callback(err, body);
        });
    });
};

var sendTracesCallback = function(error, result){
    if(error){
        console.log(error);
    }else{
        console.log(result);
    }
}

if (!trackingCode) {
    obtainTrackingCode(function(err, result){
        sendTraces(method, sendTracesCallback);
    });
}else{
     sendTraces(method, sendTracesCallback);
}



//sendStatementsFromDir(statementsDir);