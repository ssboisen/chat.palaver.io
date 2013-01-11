"use strict";
var LocalStrategy = require('passport-local').Strategy;
var passportSocketIo = require('passport.socketio');
var crypto = require("crypto");
var Q = require('q');

module.exports = setupAuthentication;

function setupAuthentication(passport, chatRepo, io, sessionInfo){

    passport.serializeUser(function(user, done) {
        done(null, user.username);
    });

    passport.deserializeUser(function(username, done) {
        Q.when(chatRepo.findUser(username), function(user){
            if(user) {
                done(null, user);
            }
            else {
                done(null, false);
            }
        }, function(error){
            console.error("Error: ", error);
        });
    });

    passport.use(new LocalStrategy(function(username, password, done){
        Q.when(chatRepo.findUser(username), function(user){
            if(!user.salt) {
                done(null,false, { message: 'Invalid login information, please contact support' });
            }

            crypto.pbkdf2(password, user.salt, 1000, 20, function(err, derivedKey) {
                if(user.password === derivedKey){
                    done(null, user);
                }
                else {
                    done(null,false, { message: 'Invalid username or password' } );
                    console.log("false!!");
                }
            });

        }, function(error){
            console.error("Error: ", error);
            done(null, false);
        });
    }));


    io.configure(function (){
        io.set("authorization", passportSocketIo.authorize({
            sessionKey:    sessionInfo.sessionKey,      //the cookie where express (or connect) stores its session id.
            sessionStore:  sessionInfo.sessionStore,     //the session store that express uses
            sessionSecret: sessionInfo.sessionSecret,
            passport: passport
        }));
    });

}
