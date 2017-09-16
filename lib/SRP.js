/**
 * @file SRP implementation
 * @copyright National Instruments, 2016-2017
 * @license MIT
 */
'use strict';

var JSBN = require('jsbn');
var BigInteger = JSBN.BigInteger;
var SecureRandom = JSBN.SecureRandom;
var SHA1 = require('./SHA1.js');
var Utils = require('./Utils.js');

function isBigInteger(x) {
   return (x instanceof BigInteger);
}

function areBigIntegers(/* ... */) {
   for (var i = 0; i < arguments.length; ++i) {
      if (!isBigInteger(arguments[i]))
         return false;
   }
   return true;
}

function isString(x) {
   return (typeof x == 'string');
}

function isArray(x) {
   return Array.isArray(x);
}

var rng = new SecureRandom();

/*
 * MGF1 mask generation function with SHA1 hash.
 */
function MGF1SHA1(byteArray) {
   var C1 = byteArray.concat([0,0,0,0]);
   var C2 = byteArray.concat([0,0,0,1]);
   return SHA1(C1) + SHA1(C2);
}

/**
 * SRP mathematical operations.
 *
 * Style note: These functions use a lot of single-character function and
 * variable names. This harkens back to the original Secure Remote Password
 * protocol paper. See http://srp.stanford.edu/ndss.html
 */
var SRP = (function() {

   /**
    * Returns client's random number.
    * @returns {BigInteger}
    */
   var a = function() {
      return new BigInteger(512, rng);
   };

   /*
    * Calculates "A", public random number.
    * @param {BigInteger} N - A large safe prime
    * @param {BigInteger} g - A generator modulo N
    * @param {BigInteger} a - A random number
    * @returns {BigInteger} g^a % N
    */
   var A = function(N, g, a) {
      if (!areBigIntegers(N, g, a))
         throw 'invalid argument';

      return g.modPow(a, N);
   };

   /**
    * Calculates "B", public random number.
    * @param {BigInteger} N - A large safe prime
    * @param {BigInteger} g - A generator modulo N
    * @param {BigInteger} v - Password verifier
    * @param {BigInteger} b - A random number
    * @returns {BigInteger} k * v + g^b
    */
   var B = function(N, g, v, b) {
      if (!areBigIntegers(N, g, v, b))
         throw 'invalid argument';

      return ((k(N, g).multiply(v)).add(g.modPow(b, N))).mod(N);
   };

   /**
    * Calculates "u" random scrambling parameter.
    * u = SHA(A+B)
    * @param {BigInteger} A - Client public random number
    * @param {BigInteger} B - Client public random number
    * @returns {BigInteger} SHA(A+B)
    */
   var u = function(A, B) {
      if (!areBigIntegers(A, B))
         throw 'invalid argument';

      var Ab = Utils.bigIntegerToBytes(A, 128);
      var Bb = Utils.bigIntegerToBytes(B, 128);
      var ABb = Ab.concat(Bb);
      return new BigInteger(SHA1(ABb), 16);
   };

   /**
    * Calculates "k" multiplier number
    * k = SHA(N + PAD(g))
    * @param {BigInteger} N - A large safe prime
    * @param {BigInteger} g - a generator modulo N
    * @returns {BigInteger} SHA(N+PAD(g))
    */
   var k = function(N, g) {
      if (!areBigIntegers(N, g))
         throw 'invalid argument';

      var Nb = Utils.bigIntegerToBytes(N, 128);
      var gb = Utils.bigIntegerToBytes(g, 128);
      var Ngb = Nb.concat(gb);
      return new BigInteger(SHA1(Ngb), 16);
   };

   /**
    * Calculates the value of "x" private key derived from username,
    * password, and salt.
    * x = SHA(salt + SHA(username + ":" + assword))
    * @param {byte array} salt User's salt
    * @param {string} username User's name
    * @param {string} password User's password
    * returns {BigInteger} SHA(salt + SHA(username + ":" + password))
    */
   var x = function(salt, username, password) {
      username = username || '';
      password = password || '';

      if (!isArray(salt))
         throw 'invalid argument';
      if (!isString(username) || !isString(password))
         throw 'invalid argument';

      var concat1 = (username + ':' + password);
      var concat2 = salt.concat(Utils.hashStringToByteArray(SHA1(concat1)));
      return new BigInteger(SHA1(concat2), 16);
   };

   /**
    * Calculates the client side value of "S".
    * @param {BigInteger} N - A large safe prime
    * @param {BigInteger} g - A generator modulo N
    * @param {BigInteger} B - Server's public random number
    * @param {BigInteger} k - Multiplier parameter
    * @param {BigInteger} x - Private key
    * @param {BigInteger} a - Client's private random number
    * @param {BigInteger} u - Random scrambling parameter
    * @returns {BigInteger} (B - g^x) ^ (a + u * x) % N
    */
   var Sc = function(N, g, B, k, x, a, u) {
      if (!areBigIntegers(N, g, B, k, x, a, u))
         throw 'invalid argument';

      return (B.add(k.multiply(N.subtract(g.modPow(x, N))).mod(N))).modPow(a.add(u.multiply(x)), N);
   };

   /**
    * Calculates the server side value of "S"
    * @param {BigInteger} N - A large safe prime
    * @param {BigInteger} A - Client's public random number
    * @param {BigInteger} v - Verifier
    * @param {BigInteger} b - Server's private random number
    * @param {BigInteger} u - Random scrambling parameter
    */
   var Ss = function(N, A, v, u, b) {
      if (!areBigIntegers(N, A, v, b, u))
         throw 'invalid argument';

      return (A.multiply(v.modPow(u, N))).modPow(b, N);
   };

   /**
    * Calculates "K" strong session key
    * @param {BigInteger} S - Session key
    * @returns {byte array}
    */
   var K = function(S) {
      if (!isBigInteger(S))
         throw 'invalid argument';

      var Sb = Utils.bigIntegerToBytes(S, 128);
      return Utils.hashStringToByteArray(MGF1SHA1(Sb));
   };

   /**
    * Calculates "M", client's proof of "K".
    *
    * @param {BigInteger} N - a large safe prime
    * @param {BigInteger} g - A generator modulo N
    * @param {string} username - Username, defaults to ""
    * @param {byte array} salt - User's salt
    * @param {BigInteger} A - client's public random number
    * @param {BigInteger} B - server's public random number
    * @param {byte array} k - multiplier parameter
    * @returns {hex string} SHA(SHA(N) xor SHA(g) + SHA(username) + salt + A + B + K)
    */
   var Mc = function(N, g, username, salt, A, B, K) {
      username = username || '';

      if (!areBigIntegers(N, g, A, B))
         throw 'invalid argument';
      if (!isArray(salt) || !isArray(K))
         throw 'invalid argument';
      if (!isString(username))
         throw 'invalid argument';

      var Nb = Utils.bigIntegerToBytes(N, 128);
      var gb = Utils.bigIntegerToBytes(g, 1);
      var shaN = SHA1(Nb);
      var shag = SHA1(gb);
      var ret = Utils.hashStringToByteArray(Utils.xorHashStrings(shaN, shag));
      var shau = Utils.hashStringToByteArray(SHA1(username));

      var Ab = Utils.bigIntegerToBytes(A, 128);
      var Bb = Utils.bigIntegerToBytes(B, 128);

      return SHA1(ret.concat(shau, salt, Ab, Bb, K));
   };

   /**
    * Calculates "M", server's proof of "K"
    *
    * @param {hash string} M - Client's proof of K
    * @param {BigInteger} A - Client's public random number
    * @param {byte array} K - Strong session key
    * @returns {hex string} SHA(A+M+K)
    */
   var Ms = function(A, M, K) {
      M = Utils.hashStringToByteArray(M);

      if (!isBigInteger(A))
         throw 'invalid argument';
      if (!isArray(M) || !isArray(K))
         throw 'invalid argument';

      var Ab = Utils.bigIntegerToBytes(A, 128);

      return SHA1(Ab.concat(M, K));
   };

   /**
    * Calculates "V", the password verifier
    * @param {BigInteger} N - A large safe prime
    * @param {BigInteger} g - A generator modulo N
    * @param {BigInteger} x - Private key
    * @returns {BigInteger} Password verifier
    */
   var v = function(N, g, x) {
      if (!areBigIntegers(N, g, x))
         throw 'invalid argument';

      return g.modPow(x, N);
   };

   return {
      a:a,
      b:a,
      A:A,
      B:B,
      u:u,
      k:k,
      x:x,
      Sc:Sc,
      Ss:Ss,
      K:K,
      Mc:Mc,
      Ms:Ms,
      v:v
   };
})();

/**
 * Create a new SRP client.
 */
function Client() {
}

/**
 * Set the identity information (username and password)
 */
Client.prototype.setIdentity = function(identity) {
   this.username = identity.username;
   this.password = identity.password;
};

/**
 * Configure the client for the modulus, generator,
 * salt, and server's public key.
 *
 * @param serverInfo.modulus {BigInteger}
 * @param serverInfo.generator {BigInteger}
 * @param serverInfo.salt {Array}
 * @param serverInfo.serverPublicKey {BigInteger}
 */
Client.prototype.setServerInfo = function(serverInfo) {
   if (!serverInfo.hasOwnProperty('modulus'))
      throw 'serverInfo needs modulus';
   if (!serverInfo.hasOwnProperty('generator'))
      throw 'serverInfo needs generator';
   if (!serverInfo.hasOwnProperty('salt'))
      throw 'serverInfo needs salt';
   if (!serverInfo.hasOwnProperty('serverPublicKey'))
      throw 'serverInfo needs serverPublicKey';

   this.modulus = serverInfo.modulus;
   this.generator = serverInfo.generator;
   this.salt = serverInfo.salt;
   this.serverPublicKey = serverInfo.serverPublicKey;
};

/**
 * Compute the client's public key (A) and proof (M)
 * from the server info.
 */
Client.prototype.generatePublicKeyAndProof = function() {
   var N = this.modulus;
   var g = this.generator;
   var s = this.salt;
   var B = this.serverPublicKey;

   if (B.mod(N).compareTo(BigInteger.ZERO) == 0)
      throw 'precondition fail';

   var a = SRP.a();
   var A = SRP.A(N, g, a);
   var u = SRP.u(A, B);

   if (u.compareTo(BigInteger.ZERO) == 0)
      throw 'precondition fail';

   var k = SRP.k(N, g);

   if (k.compareTo(BigInteger.ZERO) == 0)
      throw 'precondition fail';

   var x = SRP.x(s, this.username, this.password);
   var S = SRP.Sc(N, g, B, k, x, a, u);
   var K = SRP.K(S);
   var M = SRP.Mc(N, g, this.username, s, A, B, K);

   this.sharedKey = K;

   return {
      clientPublicKey: A,
      clientProof: M
   };
};

/**
 * Create a new SRP server.
 *
 * @param lookupFunc - A function returning an object with keys n, g, v, and s.
 */
function Server(lookupFunc) {
   this.lookupFunc = lookupFunc;
}

/**
 * Begin a new login session.
 */
Server.prototype.startLogin = function(username) {
   var entry = this.lookupFunc(username);

   var N = new BigInteger(Utils.byteArrayToHashString(entry.n), 16);
   var g = new BigInteger(Utils.byteArrayToHashString(entry.g), 16);
   var v = new BigInteger(Utils.byteArrayToHashString(entry.v), 16);
   var s = entry.s;
   var b = SRP.b();
   var B = SRP.B(N, g, v, b);

   this.modulus = N;
   this.generator = g;
   this.salt = s;
   this.serverPrivateKey = b;
   this.serverPublicKey = B;
   this.verifier = v;

   return {
      modulus: this.modulus,
      generator: this.generator,
      salt: this.salt,
      serverPublicKey: this.serverPublicKey
   };
};

/**
 * Finish a login session.
 */
Server.prototype.finishLogin = function(clientParams) {
   var N = this.modulus;
   var B = this.serverPublicKey;
   var b = this.serverPrivateKey;
   var v = this.verifier;
   var A = clientParams.clientPublicKey;
   var Mc = clientParams.clientProof;

   var u = SRP.u(A, B);

   if (u.compareTo(BigInteger.ZERO) == 0)
      throw 'precondition fail';

   var S = SRP.Ss(N, A, v, u, b);
   var K = SRP.K(S);
   var M = SRP.Ms(A, Mc, K);

   this.sharedKey = K;

   return {serverProof: M};
};

module.exports = {
   SRPOps: SRP,
   BigInteger: BigInteger,
   Client: Client,
   Server: Server,
};
