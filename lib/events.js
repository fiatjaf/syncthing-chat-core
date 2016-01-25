'use strict'

const fs = require('fs')
const log = require('debug-log')('debug')
const path = require('path')
const EventEmitter = require('events').EventEmitter

const actions = require('./actions')
const helpers = require('./helpers')
const config = require('./config')
const d = require('./data')

/* we will get the events from the syncthing client and turn them into our own */
const ee = new EventEmitter()
module.exports = ee

const startListening = function (st) {
  st.on('error', e => {
    log('eventlistener error', e, e.stack)
  })

  /* turn syncthing events into chat events */
  st.on('deviceConnected', data => {
    if (!d.devices[data.id]) return
    ee.emit('someoneOnline', {
      time: (new Date()).toISOString(),
      deviceID: data.id
    })
  })

  st.on('deviceDisconnected', data => {
    if (!d.devices[data.id]) return
    ee.emit('someoneOffline', {
      time: (new Date()).toISOString(),
      deviceID: data.id
    })
  })

  st.on('itemFinished', data => {
    let folder = d.folders[data.folder]
    if (!folder) return
    if (data.error) {
      ee.emit('failedToGetMessage', data)
      return
    }
    ee.emit('gotMessage', {
      deviceID: d.deviceByFolderId[data.folder].deviceID,
      folder: data.folder,
      time: (new Date()).toISOString(),
      timeSent: data.item.slice(0, 24),
      content: fs.readFileSync(path.join(folder.path, data.item), 'utf-8')
    })
  })

  /* here we also automatically react to events instead of just transforming them */
  st.on('folderRejected', data => {
    if (!d.devices[data.device]) return

    let folder = helpers.generateFolderConfig(d.myID, data.device)
    if (config.acceptChats && folder.id === data.folder) {
      actions.createChat(data.device)
      .then(() => {
        ee.emit('chatAccepted', {
          deviceID: data.device,
          folder: data.folder,
          time: (new Date()).toISOString()
        })
      })
    }
  })

  log('started listening for syncthing events.')
}

/* more-or-less like client.js, we export a method to let us set listeners again whenever we need */
module.exports.listen = startListening

/* reacting to our own events */
ee.on('chatAccepted', data => d.refetch())
