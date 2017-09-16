/**
 * @file uncategorized utilities
 * @copyright National Instruments, 2016-2017
 * @license MIT
 */
'use strict';

var Base64 = require('./Base64.js');

/**
 * Transform a "hash string" into a byte array.
 */
function hashStringToByteArray(str) {
   var ar = [];
   for (var i = 0; i < str.length; i += 2) {
      ar.push(parseInt(str.substr(i, 2), 16));
   }
   return ar;
}

/**
 * Transform a byte array into a "hash string".
 */
function byteArrayToHashString(ar) {
   var hs = '';
   for (var i = 0; i < ar.length; ++i) {
      hs += ('00' + (ar[i] & 0xFF).toString(16)).substr(-2);
   }
   return hs;
}

// jsbn's bigint doesn't give all the bytes we expect all the time...
function bigIntegerToBytes(bi, byteCount) {
   var bytes = bi.toByteArray();
   var i;

   if (bytes.length == byteCount) {
      return bytes;
   } else if (bytes.length < byteCount) {
      // left-pad with zeroes
      var paddingBytes = (byteCount - bytes.length);
      var na = [];
      for (i = 0; i < paddingBytes; ++i)
         na[i] = 0;
      return na.concat(bytes);
   } else if (bytes.length > byteCount) {
      // trim leading zeroes
      var leaders = bytes.slice(0, bytes.length - byteCount);
      for (i = 0; i < leaders.length; ++i) {
         if (leaders[i] != 0) {
            throw 'attmpted to truncate to ' + byteCount;
         }
      }
      return bytes.slice(bytes.length - byteCount);
   }
}

function b64tohex(b64str) {
   var decoded = Base64.decode(b64str);
   var decodedhex = '';
   for (var i = 0; i < decoded.length; ++i) {
      decodedhex += ('00' + decoded[i].toString(16)).substr(-2);
   }
   return decodedhex;
}

function hexStringToBase64(str) {
   var bytes = [];
   for (var i = 0; i < str.length; i += 2) {
      bytes.push(parseInt(str.substr(i, 2), 16));
   }
   return Base64.encode(bytes);
}

function byteStringToByteArray(str) {
   var ar = [];
   for (var i = 0; i < str.length; ++i) {
      ar.push(String.fromCharCode(i));
   }
   return ar;
}

function bigIntToBase64(ba, len) {
   var bytes = bigIntegerToBytes(ba, len);
   for (var i = 0; i < bytes.length; ++i)
      bytes[i] = (bytes[i] & 0xFF);

   return Base64.encode(bytes);
}

/* XOR two hash strings.
 * Example:
 *   "a7a9e7e59519897d" ^ "30a85174187253d3"
 * Assumes hashes are a multiple of 4 characters long.
 *
 * @param {hex string} a
 * @param {hex string} b
 * @returns {hex string} a xor b
 */
function xorHashStrings(a, b) {
   if (a.length != b.length)
      throw 'strings not same length';

   var res = '';

   /* four chars at a time == 16-bit chunks */
   /* this avoids problems with negative overflow that we'd have with 32-bit */
   for (var i = 0; i < a.length; i+=4) {
      var ac = parseInt(a.substr(i, 4), 16);
      var bc = parseInt(b.substr(i, 4), 16);
      res += ('0000' + (ac ^ bc).toString(16)).substr(-4);
   }
   return res;
}

/**
 * Turn a regular Base64-encoded string into a URL-Base64-encoded string.
 *
 * This works by turning char 62 from "+" to "-" and char 63 from "/" to "_".
 *
 * @param {String} regularBase64Str
 */
function makeUrlBase64(regularBase64Str) {
   var newStr = '';
   for (var i = 0; i < regularBase64Str.length; ++i) {
      if (regularBase64Str.charAt(i) == '+')
         newStr += '-';
      else if (regularBase64Str.charAt(i) == '/')
         newStr += '_';
      else
         newStr += regularBase64Str.charAt(i);
   }
   return newStr;
}

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

module.exports = {
   b64tohex: b64tohex,
   hexStringToBase64: hexStringToBase64,
   hashStringToByteArray: hashStringToByteArray,
   byteArrayToHashString: byteArrayToHashString,
   byteStringToByteArray: byteStringToByteArray,
   bigIntToBase64: bigIntToBase64,
   makeUrlBase64: makeUrlBase64,
   xorHashStrings: xorHashStrings,
   bigIntegerToBytes: bigIntegerToBytes,
   splitParamsString: splitParamsString,
};
