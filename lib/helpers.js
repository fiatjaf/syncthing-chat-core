'use strict'

const fs = require('fs')
const xml = require('pixl-xml')
const path = require('path')
const homeDir = require('home-dir')
const phonetic = require('phonetic')

module.exports = {
  getConfigFromFile,
  generateFolderConfig,
  generateDeviceConfig
}

function getConfigFromFile () {
  let configFile = path.join(getConfigPath(), 'config.xml')
  let config = xml.parse(fs.readFileSync(configFile, 'utf-8'))

  return config
}

function getConfigPath () {
  /*
    based on https://github.com/syncthing/syncthing/blob/4fd614be09572774b33b18aca65ae3becd89b886/cmd/stindex/util.go
  */

  let APPDATA = process.env.LocalAppData || process.env.AppData
  if (APPDATA) {
    // windows
    return path.join(APPDATA, 'Syncthing')
  }
  if (process.platform === 'darwin') {
    // mac
    return path.join(process.env.HOME, 'Library/Application Support/Syncthing')
  }

  // linux
  let XDGCONFIG = process.env.XDG_CONFIG_HOME
  if (XDGCONFIG) {
    return path.join(XDGCONFIG, 'syncthing')
  }
  return path.join(process.env.HOME, '.config/syncthing')
}

function generateFolderConfig (myId, deviceId) {
  // chats will be stored somewhere like ./syncthing-chat/*
  let chatPath = homeDir('syncthing-chat/' + deviceId)
  let bothDevices = [myId, deviceId].sort()
  let folderName = 'chat::' + phonetic.generate({
    seed: bothDevices.join(':'),
    syllables: 4
  }).toLowerCase()

  return {
    'id': folderName,
    'path': chatPath,
    'devices': [{'deviceID': deviceId}, {'deviceID': myId}],
    'readOnly': false,
    'rescanIntervalS': 4,
    'ignorePerms': false,
    'autoNormalize': true,
    'minDiskFreePct': 1,
    'versioning': {
      'type': '',
      'params': {}
    },
    'copiers': 0,
    'pullers': 0,
    'hashers': 0,
    'order': 'alphabetic',
    'ignoreDelete': true,
    'scanProgressIntervalS': 0,
    'pullerSleepS': 0,
    'pullerPauseS': 0,
    'maxConflicts': 10,
    'disableSparseFiles': false,
    'invalid': ''
  }
}

function generateDeviceConfig (deviceID, name) {
  return {
    'deviceID': deviceID,
    'name': name || '',
    'addresses': [
      'dynamic'
    ],
    'compression': 'metadata',
    'certName': '',
    'introducer': false
  }
}
