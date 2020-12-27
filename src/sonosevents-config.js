'use strict'

const debug = require('debug')('nrcse:config')

module.exports = function (RED) {

  function sonosEventsConfigNode (config) {
    debug('method >>%s', 'sonosEventNode')
    RED.nodes.createNode(this, config)

    if (config.listenerHostname) {
      process.env.SONOS_LISTENER_HOST = config.listenerHostname
      debug('listener modified - new hostname >>%s', config.listenerHostname)
    }
    
    if (config.listenerPort) {
      process.env.SONOS_LISTENER_PORT = config.listenerPort
      debug('listener modified - new port >>%s', config.listenerPort)
    }
  }
  RED.nodes.registerType('sonosevents-config', sonosEventsConfigNode)
}