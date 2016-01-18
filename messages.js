'use strict'

const fs = require('fs')
const path = require('path')

const st = require('./').st
const listChats = require('./').listChats
const myID = require('./').myID

var chats
listChats().then(folders => chats = folders)

/* turn syncthing events into message events */
st.on('deviceConnected', event => {
  chats.forEach(c => {
    if (c.deviceID === event.data.id) {
      st.emit('someoneOnline', {
        time: event.time,
        deviceID: event.data.id
      })
    }
  })
})

st.on('deviceDisconnected', event => {
  chats.forEach(c => {
    if (c.deviceID === event.data.id) {
      st.emit('someoneOffline', {
        time: event.time,
        deviceID: event.data.id
      })
    }
  })
})

st.on('itemFinished', event => {
  chats.forEach(c => {
    if (c.id === event.data.folder) {
      if (event.data.error) {
        console.log('failedToGetMessage: ', event)
        st.emit('failedToGetMessage', event)
      } else {
        console.log('gotMessage: ', event)
        st.emit('gotMessage', {
          deviceID: c.deviceID,
          time: event.time,
          timeSent: event.data.item.slice(0, 24),
          message: fs.readFileSync(path.join(c.path, event.data.item), 'utf-8')
        })
      }
    }
  })
})

module.exports = {
  list,
  send
}

function list (deviceID, since) {
  chats.forEach(c => {
    if (c.deviceID === deviceID) {
      fs.readdirSync(c.path).map(name => ({
        time: name.split('|')[0],
        sender: name.split('|')[1].split('.')[0],
        contents: fs.readFileSync(name, 'utf-8')
      }))
    }
  })
}

function send (deviceID, contents) {
  /* creates a text file with only the message text inside */

  let filename = `${(new Date()).toISOString()}|${myID}.txt`

  chats.forEach(c => {
    if (c.deviceID === deviceID) {
      // actually write the file
      fs.writeFileSync(path.join(c.path, filename), contents)

      // notify syncthing we have a new file
      st.db.scan(c.id)
    }
  })
}
