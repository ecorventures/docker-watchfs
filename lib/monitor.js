'use strict'

const fs = require('fs')
const path = require('path')
const watch = require('watch')
const cp = require('child_process')

class Monitor {
  constructor (monitorPath, handlerPath) {
    let me = this

    this.handler = handlerPath
    this.path = monitorPath
    this.dir = null
    this.isDirectory = null

    fs.stat(this.path, function (err, stats) {
      if (err) {
        console.log(err.message)
      } else {
        me.isDirectory = stats.isDirectory()
        me.dir = me.isDirectory ? me.path : path.dirname(me.path)
        watch.createMonitor(me.dir, function (monitor) {
          monitor.on('created', function (f, stat) {
            me.handle(f, 'create')
          })
          monitor.on('changed', function (f, curr, prev) {
            me.handle(f, 'modify')
          })
          monitor.on('removed', function (f, stat) {
            me.handle(f, 'delete')
          })
        })
      }
    })
  }

  handle (file, event) {
    if (!this.shouldProcess(file)) {
      return
    }
    console.log('Running', event, this.handler, 'for', file)
    cp.execFile(this.handler, [event, file], {
      env: process.env
    }, function (err, stdout, stderr) {
      if (err) {
        console.error(err.message)
      }
      if (stdout) {
        console.log(stdout)
      }
      if (stderr) {
        console.log(stderr)
      }
    })
  }

  shouldProcess (file) {
    if (!this.isDirectory) {
      return path.basename(file) === path.basename(this.path)
    }
    return true
  }
}

module.exports = Monitor
