'use strict'

const fs = require('fs')
const path = require('path')

const st = require('./').st
const listChats = require('./').listChats
const myID = require('./').myID

var chats
listChats().then(folders => chats = folders)

/* turn syncthing events into message events */
st.on('deviceConnected', data => {
  chats.forEach(c => {
    if (c.deviceID === data.id) {
      st.emit('someoneOnline', {
        time: (new Date()).toISOString(),
        deviceID: data.id
      })
    }
  })
})

st.on('deviceDisconnected', data => {
  chats.forEach(c => {
    if (c.deviceID === data.id) {
      st.emit('someoneOffline', {
        time: (new Date()).toISOString(),
        deviceID: data.id
      })
    }
  })
})

st.on('folderRejected', data => {
  // accept chat from device
})

st.on('itemFinished', data => {
  chats.forEach(c => {
    if (c.id === data.folder) {
      if (data.error) {
        console.log('failedToGetMessage: ', data)
        st.emit('failedToGetMessage', data)
      } else {
        console.log('gotMessage: ', data)
        st.emit('gotMessage', {
          deviceID: c.deviceID,
          time: (new Date()).toISOString(),
          timeSent: data.item.slice(0, 24),
          message: fs.readFileSync(path.join(c.path, data.item), 'utf-8')
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
      let location = path.join(c.path, filename)

      // actually write the file
      fs.writeFileSync(location, contents)

      // notify syncthing we have a new file
      st.db.scan(c.id, location)
    }
  })
}
