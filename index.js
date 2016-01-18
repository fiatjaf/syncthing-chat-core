'use strict'

const NS = require('node-syncthing')
const child_process = require('child_process')

const helpers = require('./helpers')

let config = helpers.getConfigFromFile()
const st = new NS({
  hostname: config.gui.address.split(':')[0],
  port: config.gui.address.split(':')[1],
  apiKey: config.gui.apikey,
  eventListener: true
})

var stprocess = null
process.on('exit', () => {
  if (stprocess.kill) stprocess.kill()
})

module.exports = {
  listDevices,
  createChat,
  listChats,
  start,
  st
}

/* importing this has side effects */
const messages = require('./messages')
module.exports.sendMessage = messages.send
module.exports.listMessages = messages.list
/* ~ */

function start () {
  /* ensure syncthing is running */

  if (module.exports.myID) {
    // this means it is running (?)
    return Promise.resolve()
  }

  return st.system.ping().then(init).catch(function () {
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

    setTimeout(start, 500)
  })
}

function init () {
  /* store our deviceID */
  return st.system.status().then(status => {
    module.exports.myID = status.myID
  }).catch(e => console.log('init: ' + e.stack))

  /* set the configs we need */
}

function listDevices () {
  return start.then(() => {
    return st.system.getConfig()
  })
  .then(config => {
    let devs = config.devices
    let chats = listChats(config)

    // device is not our own
    devs = devs.filter(d => d.deviceID !== module.exports.myID)

    // say this device already has a chat
    devs.forEach(d => {
      chats.forEach(c => {
        if (d.deviceID === c.deviceID) {
          d.chat = c
        }
      })
    })

    return devs
  })
  .catch(e => console.log('listDevices: ' + e.stack))
}

function listChats (config) {
  return start.then(() => {
    var c
    if (config) {
      c = Promise.resolve(config)
    } else {
      c = st.system.getConfig()
    }
    return c
  })
  .then(config => {
    var chatFolders = []
    config.folders.forEach(f => {
      if (f.id.slice(0, 6) === 'chat::') {
        f.deviceID = f.devices.filter(d => d.deviceID !== module.exports.myID)[0].deviceID
        chatFolders.push(f)
      }
    })
    return chatFolders
  })
}

function createChat (deviceID) {
  return start.then(() => {
    return st.system.getConfig()
  })
  .then(config => {
    let folderToCreate = helpers.generateFolderConfig(module.exports.myID, deviceID)

    // check if the chat already exists
    for (let i = 0; i < config.folders.length; i++) {
      let folder = config.folders[i]
      if (folder.id === folderToCreate.id) {
        return
      }
    }

    // check if the device is valid
    if (deviceID === module.exports.myID) {
      throw new Error(`${deviceID} is this same device. You can't chat with yourself!`)
    }
    for (let i = 0; i < config.devices.length; i++) {
      let dev = config.devices[i]
      if (dev.id === deviceID) {
        // create the new folder
        console.log(`Creating chat with ${dev.name || dev.id}...`)
        config.folders.push(folderToCreate)
        return st.system.setConfig(config)
        .then(st.restart())
        .then(() => folderToCreate)
        .catch(e => console.log('POST config: ' + e.stack))
      }
    }
    throw new Error(`${deviceID} is not a device we know. Please add it first using the Syncthing interface.`)
  })
  .then(folder => {
    // folder is created here
  })
  .catch(e => console.log('createChat: ' + e.stack))
}

if (require.main === module) {
  start()
}
