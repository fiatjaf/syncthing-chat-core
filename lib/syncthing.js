'use strict'

const child_process = require('child_process')
const delay = require('delay')
const log = require('debug-log')('debug')

const st = require('./client')

var stprocess = null
process.on('exit', () => {
  if (stprocess && stprocess.kill) stprocess.kill()
})

function start () {
  /* ensure syncthing is running */

  return st.system.ping().catch(e => {
    if (e.code === 'ECONNREFUSED') {
      return delay(5000)
      .then(function () {
        log('syncthing is not running, starting syncthing...')
        let env = process.env
        // env.STTRACE = 'events'
        stprocess = child_process.spawn('env', ['syncthing'], {env})
        stprocess.stdout.on('data', (data) => {
          log(`syncthing: ${data.toString().trim()}`)
        })
        stprocess.stderr.on('data', (data) => {
          log(`syncthing: ${data.toString().trim()}`)
        })
        stprocess.on('close', (code) => {
          log(`syncthing process exited with code ${code}`)
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
  restart: () => {
    return st.system.restart()
    .then(delay(4000))
    .then(() => st.reload())
  }
}
