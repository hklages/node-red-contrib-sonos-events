'use strict'

/**
 * This module is to define the configuration.
 *
 * @module config
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
*/

const { discoverAllPlayer } = require('./Discovery.js')

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

  //
  //                                      Discovery
  // .......................................................................................

  // Endpoint to get list of available players
  RED.httpNode.get('/nrcse/searchDevices', function (req, response) {
      
    discoverAllPlayer()
      .then((playerList) => {
        response.json(playerList)
      })
      .catch((error) => {
        // TODO use special strigify option
        debug('error discovery >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
      })
  })
}