'use strict'

const fs = require('fs')
const log = require('debug-log')('debug')
const path = require('path')

const d = require('./data')
const st = require('./client')
const ready = require('./syncthing').ready
const restart = require('./syncthing').restart
const helpers = require('./helpers')

module.exports = {
  listDevices,
  createChat,
  listDevicesWithChats,

  listMessages,
  sendMessage
}

function listDevices () {
  return Promise.resolve(d.devices.keys().map(k => d.devices[k]))
}

function listDevicesWithChats (config) {
  return Promise.resolve(d.folders.keys().map(k => d.deviceByFolderId[k]))
}

function createChat (deviceID) {
  return ready.then(() => {
    return st.system.getConfig()
  })
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
  return ready.then(() => {
    let folder = d.chatFolderForDevice[deviceID]
    log('reading messages on directory', folder.path)
    fs.readdirSync(folder.path).map(name => ({
      time: name.split('|')[0],
      sender: name.split('|')[1].split('.')[0],
      content: fs.readFileSync(name, 'utf-8')
    }))
  })
}

function sendMessage (deviceID, content) {
  /* creates a text file with only the message text inside */
  let filename = `${(new Date()).toISOString()}|${d.myID}.txt`

  return ready.then(() => {
    let folder = d.chatFolderForDevice[deviceID]
    let location = path.join(folder.path, filename)

    // actually write the file
    log('writing the message file: ', location)
    fs.writeFileSync(location, content)

    // notify syncthing we have a new file
    log('telling syncthing to scan our message...')
    return st.db.scan(folder.id, location)
  })
}
