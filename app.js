var JSFtp = require('jsftp');
var readJSON = require('read-json');
var async = require('async');
var walk = require('walkdir');
var fs = require('fs');
var path = require('path');
var moment = require('moment');

var settings = {};
var ftp;
var remoteFiles = {};
var localFiles = {};

function main(){
  async.series([
      function(cb){
        // Connect to FTP
        connectFTP(function(){
          cb();
        });
      },
      function(cb){
        // Look for remote files
        ftp.ls(settings.remote, function(err, res) {
          if(err) throw new Error(err);
          for(i=0;i<res.length;i++){
            if(res[i].type == 1){
              res[i].type = true
            }else{
              res[i].type = false
            }
            remoteFiles[res[i].name] = {
              isFolder: res[i].type,
              modified: res[i].time/1000,
              size: res[i].size
            }
          }
        });
        setTimeout(function(){
          cb();
          console.log(remoteFiles);
          console.log("----------------------------");
        },1000);
      },
      function(cb){
        walk(settings.local,function(file,stat){
          localFiles[path.basename(file)] = {
            isFolder: fs.lstatSync(file).isDirectory(),
            modified: Date.parse(stat.mtime)/1000,
            size: stat.size
          }
        })
        setTimeout(function(){
          cb();
          console.log(localFiles);
        },1000);
      }
  ]);
}

function connectFTP(cb){
  readJSON('2wayftp.json', function(error, moduleConf){
    settings = moduleConf;
    ftp = new JSFtp({
      host: settings.host,
      port: settings.port,
      user: settings.user,
      pass: settings.pass
    });
    cb();
  })
}

main();