'use strict'

const NS = require('node-syncthing')
const log = require('debug-log')('debug')

const helpers = require('./helpers')

function loadClient () {
  log('loading or reloading st client.')

  let config = helpers.getConfigFromFile()
  let st = new NS({
    hostname: config.gui.address.split(':')[0],
    port: config.gui.address.split(':')[1],
    apiKey: config.gui.apikey,
    https: config.gui.tls,
    eventListener: true
  })

  return st
}

function restartListening (st) {
  require('./events').listen(st)
}

module.exports = loadClient()
module.exports.reload = () => {
  let st = loadClient()
  restartListening(st)
  module.exports = st
}

