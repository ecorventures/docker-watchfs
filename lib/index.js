'use strict'

const fs = require('fs')
const path = require('path')
let Monitor = require ('./monitor')

// Helper methods
const isExecutable = function (file) {
  try {
    fs.accessSync(file, fs.X_OK)
    return true
  } catch (e) {
    console.log(e)
    return false
  }
}
const isReadable = function (file) {
  try {
    fs.accessSync(file, fs.R_OK)
    return true
  } catch (e) {
    console.log(e)
    return false
  }
}

process.on('uncaughtException', function (e) {
  console.error(e.message)
})

// Identify all of the environment variables beginning with MONITOR whose
// directory or file actually exists (who also have a handler specified).
let monitors = Object.keys(process.env).filter(function (variable) {
  // Only process WATCH _events_.
  if (variable.substr(0, 7).trim().toUpperCase() !== 'MONITOR' || (variable.split('_')||[null]).pop() === 'HANDLER') {
    return false
  }
  // Make sure a corresponding handler variable exists
  if (!process.env.hasOwnProperty(variable + '_HANDLER')) {
    console.log(variable + ' exists with no handler (Missing ' + (variable + '_HANDLER') + '). SKIPPED.')
    return false
  }
  // If the handler cannot be found, warn.
  let handler = path.resolve(process.env[variable + '_HANDLER'])
  if (!isExecutable(handler)) {
    console.log(variable + '_HANDLER (' + handler + ') is not not a recognized executable. Check the file exists and has execute permissions.')
  } else {
    let stats = fs.statSync(handler)
    if (!stats.isFile()) {
      console.warn(variable + '_HANDLER (' + handler + ') appears to be a directory, not a script.')
    }
  }
  let e = isReadable(path.resolve(process.env[variable]))
  if (!e) {
    console.log(process.env[variable] + ' cannot be found, or the monitor does not have appropriate permissions.')
  } else
  return true
})

// For each file or directory, create a monitor.
monitors.forEach(function (variable) {
  let monitor = new Monitor(process.env[variable], process.env[variable + '_HANDLER'])
  console.log('Now monitoring', process.env[variable], 'with', process.env[variable + '_HANDLER'])
})

if (monitors.length === 0) {
  console.warn('No valid monitors found.')
  process.exit(1)
} else {
  process.stdin.resume()
}
