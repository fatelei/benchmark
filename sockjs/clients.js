/**
 * This file is used to test sockjs-tornado's performance.
 */
'use strict';

var SockJS = require('sockjs-client-node');

var benchmark = (path) => {
  let client = new SockJS(path);
  client.onopen = function () {
    //console.log('open');
  };
  client.onmessage = function (e) {
    console.log(e.data);
  };
  client.onclose = function (e) {
    console.log(e);
  };
};


var run = () => {
  let path = process.argv[2];
  let connections = +process.argv[3];

  for (let i = 0; i < connections; i++) {
    (function () {
      benchmark(path);
    })();
  }
};

run();
