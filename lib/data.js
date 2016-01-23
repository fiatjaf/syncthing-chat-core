'use strict'

const D = require('derived')
const log = require('debug-log')('debug')

const st = require('./client')
const ready = require('./syncthing').ready

/* for now, the data source will be map[deviceID]device,
   device will be a map with all the device data + an array of
   folders.
   the folders and devices are already filtered to show chats only.
*/
var source = new D()

source.derived('devices', (_, data) => {
  let dev = {}
  for (let k in data) {
    if (k !== 'folders') {
      dev[k] = data[k]
    }
  }
  return [data.deviceID, dev]
})

source.derived('folders', function (_, data) {
  data.folders.forEach(f => this.emit(f.id, f))
})

source.derived('deviceByFolderId', function (_, data) {
  data.folders.forEach(f => this.emit(f.id, data))
})

source.derived('deviceByName', (_, data) => [data.name, data])

source.derived('chatFolderForDevice', function (_, data) {
  data.folders.forEach(f => {
    if (f.id.slice(0, 6) === 'chat::') {
      this.emit(data.deviceID, f)
    }
  })
})

module.exports = {
  myID: null,
  devices: source.devices, // by id
  folders: source.folders, // by id
  deviceByName: source.deviceByName,
  deviceByFolderId: source.deviceByFolderId,
  chatFolderForDevice: source.chatFolderForDevice,

  refetch: () => ready.then(fetchData)
}

ready
.then(() => st.system.status())
.then(status => {
  /* store our deviceID */
  module.exports.myID = status.myID
})
.then(fetchData)
.catch(e => log('init', e, e.stack))

function fetchData () {
  return st.system.getConfig()
  .then(config => {
    var dataSource = {}

    /* create an array for folders in each device */
    config.devices.forEach(d => {
      d.folders = []
      dataSource[d.deviceID] = d
    })

    config.folders.forEach(f => {
      /* filter our non-chat folders */
      if (f.id.slice(0, 6) !== 'chat::') return

      /* a list of all deviceIDs in this folder */
      let dids = f.devices.map(d => d.deviceID).filter(i => i !== module.exports.myID)

      config.devices.forEach(d => {
        /* filter out my own device */
        if (d.deviceID === module.exports.myID) return

        if (dids.indexOf(d.deviceID) !== -1) {
          dataSource[d.deviceID].folders.push(f)
        }
      })
    })

    source.replace(dataSource)
  })
}
