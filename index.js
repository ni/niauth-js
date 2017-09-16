/**
 * @file NIAuthenticator main
 * @copyright National Instruments, 2016-2017
 * @license MIT
 */
'use strict';

var Base64 = require('./lib/Base64.js');
var BigInteger = require('jsbn').BigInteger;
var SRP = require('./lib/SRP.js');
var Utils = require('./lib/Utils.js');
var parseXML = require('xml-parse-from-string');

function getText(el) {
   return (el.textContent || el.innerText || '');
}

/*
 * These are the 1024-bit primes and generators. We store them
 * as source as base64, but we need to transform them into a hex
 * string in order to turn them into BigIntegers.
 */
var primes = [
   {n:'ieJUvpnjDnS8CjQLseVMV6+bLPH2bNQLFVj1nVgSrCdErkLGUGhosubcgk6I7XoqM417RFquVMZvqgXMwggvoJyvy003qXK1bukOLlW1cRW6KLCzRBljPsMG6WeNbKqAatVX1MDHtc/d35B4q2ZJ/UXDzFCE2H/MbbJH7yylr2c=', g:'Cw==' },
   {n:'1XFmKuymyyba31KcEoWXHJco2eqggRxU9/ojMPPAkMaMRGw9WxIgEpfZGsxBOlY/ZciBaFWhbZd6gYK3AEYYEiW1N+noFDjBQyonPk3ZguElv9DgB8bv/bw9+U9o8DK1ScjJkrejEvoP2r9Bn6nANPd52l05digkV68v26fzb0c=', g:'EQ==' },
   {n:'iJWQ/xNLgaQM8A3XgQ4jmr4yOw4EQ8pcjQ2pJENouY9KfM5kjOGJdiOLnVYZqzDM6bk7wIVCBoO883dnWo4iXVvjsP1EPZ8fs9D2/u1bXtfcq7+ZWgvWGAmaiv9k2SAU8tq4W4ftseMg+CD1qtpGXylIxjWiR4GteZdgbFAS8Mc=', g:'BQ==' },
   {n:'5axg064+LI3qRPuYNbgpjlEqoFLpA6VMdJfHs4kJGo74Cl2o4E5JXwkceD26WxT6PzwhHZeqpDbJOgFHZ32OqLibrkDrLnL2pw3GDmoQ6lIPOLgUJjCmkrN35S+dXsFxMzXOLsZwz8JwojmjF+DwnRKCv+Uf49V378xvX7pg4hc=', g:'BQ==' },
   {n:'oOFpUEn0CdvWkCF3heD/etjalOiuis53GgbgIaNbh6JTKiFgs5qN1PuKXBIGhtQ9tmxj+JiZAUMzV5AylidbB1YN/l1DMq/7YZoD1nySkDwF0YS3aJMt+Q4S5PzHuoDazCI//ZzCL8nDG565Aunbgx+kQgr37dsYSdDY8rdOOVc=', g:'BQ==' },
].map(function(prime) {
   return {
      n: new BigInteger(Utils.b64tohex(prime.n), 16),
      g: new BigInteger(Utils.b64tohex(prime.g), 16)
   };
});

function hasSessionCookie() {
   return document.cookie.search('_appwebSessionId_') != -1;
}

function getUserNameFromLoggedInString(str) {
   return str.match(/Logged in as: (.*)/)[1];
}

function Permission(xmlNode) {
   this.name = '';
   this.builtin = false;
   this.id = -1;

   for (var cn = 0; cn < xmlNode.childNodes.length; ++cn) {
      var cnode = xmlNode.childNodes[cn];
      if (cnode.tagName == 'Name')
         this.name = getText(cnode);
      else if (cnode.tagName == 'BuiltIn')
         this.builtin = !!(getText(cnode));
      else if (cnode.tagName == 'ID')
         this.id = parseInt(getText(cnode));
   }
}

var _parsePermissions = function(xmlData) {
   var permissions = {};
   var root = xmlData.documentElement;
   if (root.tagName != 'Permissions') {
      throw 'Unknown element type, got ' + root.tagName;
   }

   for (var cn = 0; cn < root.childNodes.length; ++cn) {
      var cnode = root.childNodes[cn];
      if (cnode.tagName == 'Permission') {
         var p = new Permission(cnode);
         permissions[p.name] = p;
      }
   }

   return permissions;
};

/*
 * Retrieve the user permissions for a user.
 */
var getAggregateUserPermissions = function(username) {
   return fetch('/LVWSAuthSvc/GetAggregateUserPermissions?username=' + (username || ''), {
      credentials: 'same-origin',
      method: 'GET',
      headers: { 'Accept': 'text/xml' },
   }).then(function(response) {
      return response.text();
   }).then(function(text) {
      return _parsePermissions(parseXML(text));
   });
};

var srpClient = new SRP.Client();
var loggedInUser = '';
var cachedPermissions = undefined;

/*
 * This splits up a parameters string; as an example, the X-NI-AUTH-PARAMS
 * string has the format "N=4,s=[base64],B=[base64],ss=[base64]"
 */
var splitParamsString = function(str) {
   var ret = {};
   var params = str.split(',');
   for (var i = 0; i < params.length; ++i) {
      var equals = params[i].indexOf('=');
      if (equals == -1)
         throw 'not a valid params string';

      var name = params[i].substr(0, equals);
      var value = params[i].substr(equals+1);

      ret[name] = value;
   }
   return ret;
};

/*
 * Decode the SRP parameters from the server.
 */
var decodeServerParamsString = function(str) {
   var srpParams = str;
   if (!srpParams)
      return {};

   var params = splitParamsString(str);
   if (!params.hasOwnProperty('N') ||
       !params.hasOwnProperty('s') ||
       !params.hasOwnProperty('B') ||
       !params.hasOwnProperty('ss')) {
      throw 'didn\'t get everything we needed from server';
   }

   params.N = parseInt(params.N, 10);
   params.s = Base64.decode(params.s);
   params.B = new BigInteger(Utils.b64tohex(params.B), 16);

   if (params.N > primes.length)
      throw 'invalid prime index';

   return {
      modulus:primes[params.N].n,
      generator:primes[params.N].g,
      salt:params.s,
      serverPublicKey:params.B,
      // We don't need to operate on the login token, so leave as string.
      loginToken:params.ss
   };
};

// eslint-disable-next-line no-unused-vars
var updatePermissionsCache = function() {
   return getAggregateUserPermissions(loggedInUser).then(function(permissions) {
      cachedPermissions = permissions;
      return true;
   });
};

var _loggedInUser = '';

var getUserName = function() {
   return _loggedInUser;
};

/*
 * This is used to synchronize the client state with the server state;
 * specifically, if we have a session cookie, we want to figure out if
 * that cookie is for a valid session.
 *
 * @returns {Promise} true if logged in, false if logged out
 */
var updateFromSession = function() {
   if (!hasSessionCookie()) {
      /* We don't have a session cookie on our end. */
      return Promise.resolve(false);
   }

   return fetch('/Login', {
      credentials: 'same-origin',
      method: 'GET',
   }).then(function(response) {

      if (response.status == 200) {
         /*
          * The response text is a plain text string:
          * "Logged in as: username"
          */
         return response.text().then(function(str) {
            _loggedInUser = getUserNameFromLoggedInString(str);

            return true;
         });
      } else {
         /*
          * For any other error, assume that the session is bad or
          * expired.
          */
         return false;
      }
   });
};

/*
 * Log in to NIAuth.
 *
 * @returns {Promise} will resolve to true if successful
 */
var login = function(username, password) {
   /* Configure the SRP client. */
   srpClient.setIdentity({username:username, password:password});

   /*
    * Issue the initial login request.
    */
   return fetch('/Login?username=' + (username || ''), {
      credentials: 'same-origin',
      method: 'GET',
   }).then(function(response) {

      if (response.status == 200) {
         /*
          * If we get a 200, we have a valid session cookie and we're
          * already logged in. The response text is a plain text string:
          * "Logged in as: username"
          * We need to make sure it matches.
          */
         return response.text().then(function(str) {
            _loggedInUser = getUserNameFromLoggedInString(str);

            if (_loggedInUser == username) {
               /* Excellent. Update permissions. */
               return fetch('/LVWSAuthSvc/GetAggregateUserPermissions?username=' + (username || ''), {
                  credentials: 'same-origin',
                  method: 'GET',
                  headers: { 'Accept': 'text/xml' },
               });
            } else {
               /* TODO: This can and should be handled by automatically logging out. */
               throw 'Already logged in as ' + _loggedInUser + ', log out first!';
            }
         });

      } else if (response.status == 403) {
         /*
          * A 403 is "expected" on a fresh login. It's how we obtain the
          * X-NI-AUTH-PARAMS header containing information for the next
          * part of the SRP handshake.
          */

         /* Obtain the SRP parameters */
         var serverParams = response.headers.get('X-NI-AUTH-PARAMS');
         var serverInfo = decodeServerParamsString(serverParams);

         /* Generate the client-side parameters */
         srpClient.setServerInfo(serverInfo);
         var clientParams = srpClient.generatePublicKeyAndProof();

         /* Send the client-side parameters back to the server */
         var data;
         data  = 'A=' + Utils.makeUrlBase64(Utils.bigIntToBase64(clientParams.clientPublicKey, 128));
         data += '&M=' + Utils.makeUrlBase64(Utils.hexStringToBase64(clientParams.clientProof));
         data += '&ss=' + serverInfo.loginToken;

         return fetch('/Login', {
            credentials: 'same-origin',
            method: 'POST',
            headers: {
               'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: data,
         });
      } else {
         throw 'Unknown/unhandled status code from NIAuth (' + response.status + ')';
      }

   }).then(function(response) {
      if (response.status == 200) {
         /* Success! The response includes the new permissions set. */
         _loggedInUser = username;

         return response.text().then(function(permText) {
            return _parsePermissions(parseXML(permText));
         }).then(function(newPermissions) {
            cachedPermissions = newPermissions;
            return true;
         });
      } else if (response.status == 403) {
         /* Authentication failed. */
         throw 'Login failed!';
      }
   });
};

/*
 * Logs out of NI Auth. This clears the session.
 *
 * @returns {Promise} will resolve to true if successful
 */
var logout = function() {
   if (!hasSessionCookie()) {
      /*
       * If we don't have the session cookie, then we don't have a session.
       * Ergo, we are already logged out.
       */
      _loggedInUser = '';
      return Promise.resolve(true);
   }

   return fetch('/Logout', {
      credentials: 'same-origin',
      method: 'GET',
   }).then(function(response) {
      if (response.status == 200) {
         _loggedInUser = '';
         return true;
      } else {
         return false;
      }
   });
};

/*
 * Does the currently logged-in user have permission for something?
 */
var hasPermission = function(permName) {
   if (cachedPermissions == undefined)
      return false;
   return cachedPermissions.hasOwnProperty(permName);
};

module.exports = {
   updateFromSession: updateFromSession,
   getAggregateUserPermissions: getAggregateUserPermissions,
   login: login,
   logout: logout,
   hasPermission: hasPermission,
   getUserName: getUserName,
};
