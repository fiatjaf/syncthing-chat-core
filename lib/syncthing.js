'use strict'

const child_process = require('child_process')
const delay = require('delay')

const st = require('./client')

var stprocess = null
process.on('exit', () => {
  if (stprocess && stprocess.kill) stprocess.kill()
})

function start () {
  /* ensure syncthing is running */

  if (module.exports.myID) {
    // this means it is running (?)
    return Promise.resolve()
  }

  return st.system.ping().catch(e => {
    if (e.code === 'ECONNREFUSED') {
      return delay(5000)
      .then(function () {
        console.log('syncthing is not running, starting syncthing...')
        stprocess = child_process.spawn('env', ['syncthing'])
        stprocess.stdout.on('data', (data) => {
          process.stdout.write(`stdout: ${data}`)
        })
        stprocess.stderr.on('data', (data) => {
          process.stdout.write(`stderr: ${data}`)
        })
        stprocess.on('close', (code) => {
          process.stdout.write(`child process exited with code ${code}`)
        })
      })
      .then(delay(5000))
      .then(start)
    } else {
      throw e
    }
  })
}

/* start syncthing as soon as possible */
module.exports = {
  ready: start(), // everybody must wait for syncthing to be started
  start // will not need
}
