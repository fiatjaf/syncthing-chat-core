'use strict'

const fs = require('fs')
const log = require('debug-log')('debug')
const path = require('path')
const readMultiple = require('tiny-promisify')(require('read-multiple-files'))

const d = require('./data')
const st = require('./client')
const ready = require('./syncthing').ready
const restart = require('./syncthing').restart
const helpers = require('./helpers')

module.exports = {
  addDevice,
  createChat,

  listMessages,
  sendMessage
}

function addDevice (deviceID, name) {
  return ready.then(() =>
    st.system.getConfig()
  )
  .then(config => {
    let deviceToAdd = helpers.generateDeviceConfig(deviceID, name)

    // check if the device already exists
    for (let i = 0; i < config.devices.length; i++) {
      let device = config.devices[i]
      if (device.deviceID === deviceID) {
        log('device is already added.')
        return
      }
    }

    config.devices.push(deviceToAdd)
    return st.system.setConfig(config)
  })
  .then(folder => {
    log('rebuilding our main data source...')
    d.refetch()
  })
  .catch(e => log('addDevice: ' + e.stack, e))
}

function createChat (deviceID) {
  return ready.then(() =>
    st.system.getConfig()
  )
  .then(config => {
    let folderToCreate = helpers.generateFolderConfig(d.myID, deviceID)

    // check if the chat already exists
    for (let i = 0; i < config.folders.length; i++) {
      let folder = config.folders[i]
      if (folder.id === folderToCreate.id) {
        log('chat already exists.')
        return
      }
    }

    // check if the device is valid
    if (deviceID === d.myID) {
      throw new Error(`${deviceID} is this same device. you can't chat with yourself!`)
    }
    for (let i = 0; i < config.devices.length; i++) {
      let dev = config.devices[i]
      if (dev.deviceID === deviceID) {
        // create the new folder
        log(`creating chat with ${dev.name || dev.id}`)
        config.folders.push(folderToCreate)
        return st.system.setConfig(config)
        .catch(e => log('setConfig error: ' + e.stack, e, '\n', JSON.stringify(config)))
        .then(() => log('config set, restarting...'))
        .then(() => restart())
        .catch(e => log('restart error: ' + e.stack, e))
        .then(() => log('restarted syncthing.'))
        .then(() => folderToCreate)
      }
    }
    throw new Error(`${deviceID} is not a device we know. Please add it first using the Syncthing interface.`)
  })
  .then(folder => {
    // folder is already created when we reach here
    log('rebuilding our main data source...')
    d.refetch()
    log('telling syncthing to scan our new folder...')
    return st.db.scan(folder.id)
  })
  .catch(e => log('createChat: ' + e.stack, e))
}

function listMessages (deviceID, since) {
  let folder = d.chatFolderForDevice[deviceID]
  log('reading messages on directory', folder.path)

  let names = fs.readdirSync(folder.path).filter(n => n[24] === '@')
  let fullNames = names.map(n => path.join(folder.path, n))

  return ready.then(() => {
    return readMultiple(fullNames)
  })
  .then(contents => {
    return contents.map((content, i) => ({
      time: names[i].slice(0, 24),
      sender: names[i].slice(25, -4),
      content: content
    }))
  })
  .catch(e => log('listMessages: ' + e.stack, e))
}

function sendMessage (folderID, content) {
  /* creates a text file with only the message text inside */
  let filename = `${(new Date()).getTime()}@${d.myID}.txt`

  return ready.then(() => {
    let folder = d.folders[folderID]
    let location = path.join(folder.path, filename)

    // actually write the file
    log('writing the message file: ', location)
    fs.writeFileSync(location, content)

    // notify syncthing we have a new file
    log('telling syncthing to scan our message...')
    return st.db.scan(folder.id, location)
  })
  .catch(e => log('sendMessage: ' + e.stack, e))
}
