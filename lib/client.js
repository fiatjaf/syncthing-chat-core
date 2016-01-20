'use strict'

const NS = require('node-syncthing')

const helpers = require('./helpers')

let config = helpers.getConfigFromFile()
const st = new NS({
  hostname: config.gui.address.split(':')[0],
  port: config.gui.address.split(':')[1],
  apiKey: config.gui.apikey,
  https: config.gui.tls,
  eventListener: true
})

module.exports = st
