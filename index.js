#!/usr/bin/env node

const program = require('commander');

const { cnefeFtp, version } = require('./package.json');

const { spawn } = require("child_process");

// Set version
program.version(version);

// Command: download
program
  .command('download [targetDir]')
  .description('download CNEFE files from IBGE FTP to [targetDir], defaults to ./data/ibge-ftp.')
  .action(function (targetDir){
    const clone = spawn('wget', [
      `ftp-url`, 
      `--continue`, 
      `--no-host-directories`, 
      `--cut-dirs=3`, 
      `--recursive`,
      `--directory-prefix=${targetDir || './data/ibge-ftp'}`,
      `-A.zip`, 
      cnefeFtp
    ]);
    clone.stdout.on('data', data=>process.stdout.write(data));
    clone.stderr.on('data', data=>process.stdout.write(data));
  });

program.parse(process.argv);