var JSFtp = require('jsftp');
var readJSON = require('read-json');
var async = require('async');

function main(){
  async.series([
      function(cb){
        connectFTP(function(){
          cb();
        });
      },
      function(cb){
        console.log('connected.');
        cb();
      }
  ]);
}

function connectFTP(cb){
  readJSON('2wayftp.json', function(error, moduleConf){
    var Ftp = new JSFtp({
      host: moduleConf.host,
      port: moduleConf.port,
      user: moduleConf.user,
      pass: moduleConf.pass
    });
    cb();
  })
}

main();