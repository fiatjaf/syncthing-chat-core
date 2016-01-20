'use strict'

const fs = require('fs')
const path = require('path')

const actions = require('./actions')
const helpers = require('./helpers')
const config = require('./config')
const st = require('./client')
const d = require('./data')

/* turn syncthing events into chat events */
st.on('deviceConnected', data => {
  if (!d.devices[data.id]) return
  st.emit('someoneOnline', {
    time: (new Date()).toISOString(),
    deviceID: data.id
  })
})

st.on('deviceDisconnected', data => {
  if (!d.devices[data.id]) return
  st.emit('someoneOffline', {
    time: (new Date()).toISOString(),
    deviceID: data.id
  })
})

st.on('itemFinished', data => {
  let folder = d.folders[data.folder]
  if (!folder) return
  if (data.error) {
    st.emit('failedToGetMessage', data)
    return
  }
  console.log('gotMessage: ', data)
  st.emit('gotMessage', {
    deviceID: d.deviceByFolderId[data.folder].deviceID,
    time: (new Date()).toISOString(),
    timeSent: data.item.slice(0, 24),
    message: fs.readFileSync(path.join(folder.path, data.item), 'utf-8')
  })
})

/* here we also automatically react to events instead of just transforming them */
st.on('folderRejected', data => {
  if (!d.devices[data.device]) return

  let folder = helpers.generateFolderConfig(d.myID, data.device)
  if (config.acceptChats && folder.id === data.folder) {
    actions.createChat(data.device)
    .then(() => {
      st.emit('chatAccepted', {
        deviceID: data.device,
        time: (new Date()).toISOString()
      })
    })
  }
})

/* reacting to our own events */
st.on('chatAccepted', data => d.refetch())

/* instead of creating our own eventemitter we reuse node-syncthing's */
module.exports = st
