"use strict";

var SteamUser = require('steam-user');
var config = require('./config.js');
var mysql = require('mysql');

var client = new SteamUser();

client.logOn({
    "accountName": config.name,
    "password": config.password
});

var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'chatterbot'
});

connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + connection.threadId);
});

client.on('loggedOn', function(details) {
    console.log("Logged into Steam as " + client.steamID.getSteam3RenderedID());
    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed(440);
});

client.on('error', function(e) {
    // Some error occurred during logon
    console.log(e);
});

client.on('friendMessage', function(steamID, message) {
    console.log("Friend message from " + steamID.getSteam3RenderedID() + ": " + message);

    if(message === '!quit' && steamID.getSteam3RenderedID() === '[U:1:51709674]') {
        console.log('Okay thanks bye');
        connection.end();
        process.exit();
    }

    let words = message.split(' ');

    let query = 'SELECT t.sentence, t.sumWeight, t.totalConnections, t.totalWords\n' +
        '            FROM (\n' +
        '                SELECT BS.sentence, BC.sumWeight, COUNT(BCT.sentence_id) AS totalConnections, COUNT(BW.word_id) AS totalWords\n' +
        '                FROM (\n' +
        '                   SELECT t.sentence_id, t.sumWeight\n' +
        '                   FROM (\n' +
        '                       SELECT tt.sentence_id, tt.sumWeight, max(tt.sumWeight) AS maxWeight\n' +
        '                       FROM (\n' +
        '                              SELECT BC.sentence_id, SUM(BC.weight) AS sumWeight\n' +
        '                              FROM bot_words BW\n' +
        '                                LEFT JOIN bot_connection BC ON BW.word_id = BC.word_id\n' +
        '                              WHERE word IN (? '+ (',?'.repeat(words.length-1)) +')\n' +
        '                              GROUP BY BC.sentence_id\n' +
        '                            ) tt\n' +
        '                     GROUP BY tt.sentence_id\n' +
        '                        ) t\n' +
        '                   WHERE t.sumWeight = t.maxWeight\n' +
        '                 ) BC\n' +
        '                LEFT JOIN bot_sentence BS ON BS.sentence_id = BC.sentence_id\n' +
        '                LEFT JOIN bot_connection BCT ON BCT.sentence_id = BC.sentence_id\n' +
        '                LEFT JOIN bot_words BW ON BW.word_id = BCT.word_id AND word IN (? '+ (',?'.repeat(words.length-1)) +')\n' +
        '                GROUP BY BCT.sentence_id\n' +
        '                ORDER BY BC.sumWeight DESC\n' +
        '            ) t\n' +
        '            WHERE t.totalWords * (100 / t.totalConnections) > 50\n' +
        '            GROUP BY t.sentence\n' +
        '            ORDER BY t.totalWords * (100 / t.totalConnections) DESC';

    words = words.concat(words);

    connection.query(query, words,
        function (error, results, fields) {
            if (error) {
                console.log(error);
                client.chatMessage(steamID, "huh");
            }
            else if(results.length > 0) {
                client.chatMessage(steamID, results[0].sentence);
            } else {
                client.chatMessage(steamID, "huh");
            }
        });

});