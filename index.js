'use strict'

module.exports = {
  action: require('./lib/actions'),
  event: require('./lib/events'),
  data: require('./lib/data')
}

require('./lib/syncthing').ready.then(() => require('./lib/client').reload())
