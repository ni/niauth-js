/**
 * @file utils tests
 * @copyright National Instruments, 2016-2017
 * @license MIT
 */

"use strict";
var assert = require('assert');
var NIAuthenticator = require('../lib/Utils.js');

describe('Utils', function() {

   describe('#splitParamsString', function() {
      it('should split param strings', function() {
         var srcString = "N=4,s=K7YIn92KQeT9NfyZx7AYjw==,B=5axg064+LI3qRPuYDbJOgFHZ32OqLibrkDrLnL2pw3GDmoQ6lIPOLgUJjCmkrN35S+dXsFxMzXOLsZwz8JwojmjF+DwnRKCv+Uf49V378xvX7pg4hc=";
         var params = NIAuthenticator.splitParamsString(srcString);

         assert.equal(params.N, "4");
         assert.equal(params.s, "K7YIn92KQeT9NfyZx7AYjw==");
         assert.equal(params.B, "5axg064+LI3qRPuYDbJOgFHZ32OqLibrkDrLnL2pw3GDmoQ6lIPOLgUJjCmkrN35S+dXsFxMzXOLsZwz8JwojmjF+DwnRKCv+Uf49V378xvX7pg4hc=");
      });
   });

});
