"use strict";

var SteamUser = require('steam-user');
var config = require('./config.js');

var client = new SteamUser();

client.logOn({
    "accountName": config.name,
    "password": config.password
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
});