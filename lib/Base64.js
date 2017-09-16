/**
 * @file base64 encode/decode wrappers
 * @copyright National Instruments, 2016-2017
 * @license MIT
 */
'use strict';

/**
 * Encode to Base64.
 *
 * @param {Array} arr - Byte sequence
 * @returns {String} Base64-encoded string
 */
var encode = function(arr) {
   return (new Buffer(arr)).toString('base64');
};

/**
 * Decode from Base64.
 *
 * @param {String} str
 * @param {Array} bytes
 */
var decode = function(str) {
   var buf = new Buffer(str, 'base64');
   var arr = [];
   for (var i = 0; i < buf.length; ++i) {
      arr[i] = buf[i];
   }
   return arr;
};

module.exports = {
   encode: encode,
   decode: decode,
};
