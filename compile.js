var nexe = require('nexe');

nexe.compile({
    input: 'app.js', // where the input file is
    output: 'C:/Users/M/Documents/Code/NPM/2wayftp/bin', // where to output the compiled binary
    nodeVersion: '5.5.0', // node version
    nodeTempDir: '/src', // where to store node source.
    nodeConfigureArgs: ['opt', 'val'], // for all your configure arg needs.
    nodeMakeArgs: ["-j", "4"], // when you want to control the make process.
    python: 'C:/Python27', // for non-standard python setups. Or python 3.x forced ones.
    flags: true, // use this for applications that need command line flags.
    jsFlags: "--use_strict", // v8 flags
    framework: "node" // node, nodejs, or iojs
}, function(err) {
    if(err) {
        return console.log(err);
    }

     // do whatever
});