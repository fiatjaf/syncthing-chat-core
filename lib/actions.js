'use strict'

const delay = require('delay')

const d = require('./data')
const st = require('./client')
const ready = require('./syncthing').ready
const helpers = require('./helpers')

module.exports = {
  listDevices,
  createChat,
  listChats,

  listMessages,
  sendMessage
}

function listDevices () {

}

function listChats (config) {

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
        return
      }
    }

    // check if the device is valid
    if (deviceID === d.myID) {
      throw new Error(`${deviceID} is this same device. You can't chat with yourself!`)
    }
    for (let i = 0; i < config.devices.length; i++) {
      let dev = config.devices[i]
      if (dev.deviceID === deviceID) {
        // create the new folder
        console.log(`Creating chat with ${dev.name || dev.id}...`)
        config.folders.push(folderToCreate)
        return st.system.setConfig(config)
        .then(delay(400))
        .then(st.system.restart())
        .then(() => folderToCreate)
        .catch(e => console.log('POST config: ' + e.stack))
      }
    }
    throw new Error(`${deviceID} is not a device we know. Please add it first using the Syncthing interface.`)
  })
  .then(folder => {
    // folder is already created when we reach here
  })
  .catch(e => console.log('createChat: ' + e.stack))
}

function listMessages (deviceID, since) {
  return ready.then(() => {


    if (c.deviceID === deviceID) {
      fs.readdirSync(c.path).map(name => ({
        time: name.split('|')[0],
        sender: name.split('|')[1].split('.')[0],
        contents: fs.readFileSync(name, 'utf-8')
      }))
    }
  })
}

function sendMessage (deviceID, contents) {
  /* creates a text file with only the message text inside */
  let filename = `${(new Date()).toISOString()}|${myID}.txt`

  return ready.then(() => {


    if (c.deviceID === deviceID) {
      let location = path.join(c.path, filename)

      // actually write the file
      fs.writeFileSync(location, contents)

      // notify syncthing we have a new file
      st.db.scan(c.id, location)
    }
  })
}
