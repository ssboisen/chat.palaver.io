"use strict";
module.exports.ensureAuthenticated = ensureAuthenticated;

module.exports.makeMongodbResolver = makeMongodbResolver;

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login');
}

function makeMongodbResolver (deferred) {
    return function (error, value) {
        if (error) {
            deferred.reject(error);
        } else if (arguments.length > 1) {
            deferred.resolve(value);
        }
        else{
            deferred.resolve();
        }
    };
};
