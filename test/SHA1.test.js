/**
 * @file sha1 library tests
 * @copyright National Instruments, 2016-2017
 * @license MIT
 */

"use strict";
var assert = require('assert');
var SHA1 = require('../lib/SHA1.js');

describe('SHA1', function() {
   it('should handle arrays of bytes', function() {
      var message = [ 0x61, 0x62, 0x63 ];
      assert.equal("a9993e364706816aba3e25717850c26c9cd0d89d", SHA1(message));
   });

   // somewhat important: jsbn BigInteger.toByteArray returns int8 values,
   // not uint8 values... the hash function needs to cope.
   it('should handle negative values', function() {
      var test1a = [ 0, 0, 0, 0, 0xFF ];
      var test1b = [ 0, 0, 0, 0, -1 ];
      var test2a = [ 0, 0, 0, 0xFF, 0 ];
      var test2b = [ 0, 0, 0, -1, 0 ];
      var test3a = [ 0, 0, 0xFF, 0, 0 ];
      var test3b = [ 0, 0, -1, 0, 0 ];
      var test4a = [ 0, 0xFF, 0, 0, 0 ];
      var test4b = [ 0, -1, 0, 0, 0 ];
      var test5a = [ 0xFF, 0, 0, 0, 0 ];
      var test5b = [ -1, 0, 0, 0, 0 ];

      var expected1 = "836adc5637c4320983016c50c1c3625f9f92ce1a";
      var expected2 = "2da1eb63c05691a88dce231f0279cb84696901dc";
      var expected3 = "4d86dc9985d62b84d6199b4d58a838e21507077a";
      var expected4 = "645375a94b9cdd65472be4abc0d52626c0cc70e4";
      var expected5 = "88f3c8e6e819aa83da1ce48353b2bddaad759fb9";

      assert.equal(SHA1(test1a), expected1);
      assert.equal(SHA1(test1b), expected1);
      assert.equal(SHA1(test2a), expected2);
      assert.equal(SHA1(test2b), expected2);
      assert.equal(SHA1(test3a), expected3);
      assert.equal(SHA1(test3b), expected3);
      assert.equal(SHA1(test4a), expected4);
      assert.equal(SHA1(test4b), expected4);
      assert.equal(SHA1(test5a), expected5);
      assert.equal(SHA1(test5b), expected5);
   });
});
