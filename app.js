var JSFtp = require('jsftp');
var readJSON = require('read-json');
var async = require('async');
var walk = require('walkdir');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var watch = require('watch');

var settings = {};
var ftp;
var remoteFiles = {};
var localFiles = {};
var waitTime = 1000;
var definedWatch = false;

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
        grabRemote(function(){
          console.log("Remote files ("+Object.keys(remoteFiles).length+"): ",remoteFiles);
          console.log("----------------------------");
          cb();
        });
      },
      function(cb){
        // Look for local files
        grabLocal(function(){
          console.log("Local files ("+Object.keys(localFiles).length+"): ",localFiles);
          cb();
        });
      },
      function(cb){
        // Activate the watchAndSync function
        setInterval(watchAndSync,10000);
        watchAndSync();
        cb();
      }
  ]);
}

function readAndPut(f){
  console.log("READ AND PUT: ",f);
  fs.readFile(f, (err, buffer) => {
    if (err) throw new Error(err);
    var dir = settings.remote + f.replace(/[\\]/g,"/").replace(settings.local,"");
    ftp.put(buffer, dir, function(err) { 
      if(err) throw new Error(err);
    });
  });
}

function compareRemote(f){
  console.log("COMPARING: ",f);
  var dir = settings.remote + f.replace(/[\\]/g,"/").replace(settings.local,"");
  var remId = remoteFiles[path.basename(dir)];
  var locId = localFiles[path.basename(dir)];
  if(!remId) return true; // Remote file does not exists
  if(locId.modified>=remId.modified) return true; // Local file is newer
}

function commit(f){
  console.log("COMMITING: ",f);
  var dir = settings.remote + f.replace(/[\\]/g,"/").replace(settings.local,"");
  var canProceed = compareRemote(f);
  if(canProceed){
    readAndPut(f);
  }else{
    console.log("cannot update file, remote file is newer!");
  }
}

function remRemote(f){
  ftp.raw["delete"](function(err, data) {
    if (err) throw new Error(err);
    console.log(data);
  });
}

function watchAndSync(){
  if(!definedWatch){
    // Watch local tree
    console.log("Now watching: ",settings.local);
    watch.createMonitor(settings.local, function (monitor) {
      monitor.files['*']
      monitor.on("created", function (f, stat) {
        console.log("NEW ",f);
        grabLocal(function(){
          commit(f);
        })
      })
      monitor.on("changed", function (f, curr, prev) {
        console.log("EDIT ",f);
        commit(f);
      })
      monitor.on("removed", function (f, stat) {
        console.log("REM ",f);
        remRemote(f);
      })
    })
    definedWatch = true; 
  }
  
  grabRemote(function(){
    console.log("Remote files ("+Object.keys(remoteFiles).length+"): ",remoteFiles);
    console.log("----------------------------");
    for(item in remoteFiles){
      if(localFiles[item].modified<remoteFiles[item].modified){
        updateLocal(item)
      }
    }
  })
}

function updateLocal(f){
  var str = "";
  fPath = settings.remote+"/"+f;
  ftp.get(fPath, function(err, socket) {
    if (err) throw new Error(err);
    socket.on("data", function(d) { str += d.toString(); })
    socket.on("close", function(err) {
      if(err) throw new Error(err);
      fs.writeFile(settings.local+"/"+f, str, function(err) {
        if(err) throw new Error(err);
        console.log("The file was saved!");
      }); 
    });
    socket.resume();
  });
}

function grabRemote(dir,cb){
  var recursive = false;
  
  if(dir && !cb){
    // No callback so use default dir
    cb = dir;
    dir = settings.remote;
    setTimeout(function(){
      cb();
    },waitTime);
  }else{
    // This is probably from grabRemote function calling itself, recursive folder searching.
    dir = settings.remote+"/"+dir;
    recursive = true;
  }
  ftp.ls(dir, function(err, res) {
    if(err) throw new Error(err);
    for(i=0;i<res.length;i++){
      if(res[i].type == 1){
        res[i].type = true
      }else{
        res[i].type = false
      }
      var name = res[i].name;
      if(recursive) name = dir + "/" + name;
      remoteFiles[name] = {
        isFolder: res[i].type,
        modified: res[i].time/1000,
        size: res[i].size
      }
      if(res[i].type){
        grabRemote(res[i].name,function(){});
      }
    }
  });
}

function grabLocal(cb){
  walk(settings.local,function(file,stat){
    var dir = file.replace(/[\\]/g,"/").replace(settings.local,"").replace("/"+path.basename(file),"");
    var name = path.basename(file);
    if(dir.length>=1) name = dir + "/" + name;
    localFiles[name] = {
      isFolder: fs.lstatSync(file).isDirectory(),
      modified: Date.parse(stat.mtime)/1000,
      size: stat.size
    }
  })
  setTimeout(function(){
    cb();
  },waitTime);
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
    ftp.auth(settings.user,settings.pass,function(err,data){
      if(err) throw new Error(err);
      if(data.code == 230) return(cb());
      console.log(data);
    });
  })
}

main();