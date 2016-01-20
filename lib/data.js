'use strict'

const D = require('derived')

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
      dev[k] = data
    }
  }
  return [key, dev]
})

source.derived('folders', function (_, data) {

})

source.derived('deviceByFolderId', function (_, data) {

})

module.exports = {
  myID: null,
  devices: source.devices, // by id
  folders: source.folders, // by id
  deviceByFolderId: source.deviceByFolderId,

  refetch: () => ready.then(fetchData)
}

ready
.then(() => st.system.status())
.then(status => {
  /* store our deviceID */
  module.exports.myID = status.myID
})
.then(fetchData)
.catch(e => console.log('init', e, e.stack))

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
        if (dids.indexOf(d.deviceID) !== -1) {
          dataSource[d.deviceID].folders.push(f)
        }
      })
    })
  })
}
