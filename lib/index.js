'use strict'

module.exports = {
  action: require('./actions'),
  event: require('./events'),
  data: require('./data')
}

require('./syncthing').ready.then(() => require('./client').reload())
