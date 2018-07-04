#!/usr/bin/env node

const program = require('commander');

const { bases, version } = require('./package.json');

const { spawn } = require("child_process");

// Set version
program.version(version);

/*
 * Commands
 */

program
  .command('cnefe download [targetDir]')
  .description('download CNEFE files from IBGE FTP to [targetDir], defaults to ./data/cnefe.')
  .action(function (targetDir){
    const clone = spawn('wget', [
      `ftp-url`, 
      `--continue`, 
      `--no-host-directories`, 
      `--cut-dirs=3`, 
      `--recursive`,
      `--directory-prefix=${targetDir || './data/cnefe'}`,
      `-A.zip`, 
      bases.cnefe
    ]);
    clone.stdout.on('data', data=>process.stdout.write(data));
    clone.stderr.on('data', data=>process.stdout.write(data));
  });

program
  .command('logradouros download [targetDir]')
  .description('download "base_de_faces_de_logradouros" directory from IBGE FTP to [targetDir] (defaults: ./data)')
  .action(function (){
    const clone = spawn('wget', [
      `ftp-url`, 
      `--continue`, 
      `--no-host-directories`, 
      `--cut-dirs=3`, 
      `--recursive`,
      `--directory-prefix=${arguments[2] || './data'}`,
      `-A.zip`, 
      bases.logradouros
    ]);
    clone.stdout.on('data', data=>process.stdout.write(data));
    clone.stderr.on('data', data=>process.stdout.write(data));
  });

program.parse(process.argv);