/**
 * This module is to define the configuration.
 *
 * @module config
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
*/

'use strict'

const { discoverPlayers, discoverCoordinators, getIp, getIpStephan } = require('./Discovery.js')

const debug = require('debug')('nrcse:config')

module.exports = function (RED) {

  function sonosEventsConfigNode (config) {
    debug('method >>%s', 'sonosEventNode')
    RED.nodes.createNode(this, config)

    // TODO how to check whether changes?
    if (config.listenerHostname) {
      process.env.SONOS_LISTENER_HOST = config.listenerHostname
      debug('listener modified - new hostname >>%s', config.listenerHostname)
    }
    
    // TODO how to check whether changes?
    if (config.listenerPort) {
      process.env.SONOS_LISTENER_PORT = config.listenerPort
      debug('listener modified - new port >>%s', config.listenerPort)
    }
  }
  RED.nodes.registerType('sonosevents-config', sonosEventsConfigNode)

  //
  //                                      Discovery & Local IP address
  // .......................................................................................

  RED.httpNode.get('/nrcse/*', function (req, response) {
    switch (req.params[0]) {
    case 'discoverPlayers':
      discoverPlayers()
        .then((playerList) => {
          response.json(playerList)
        })
        .catch((error) => {
          debug('error discovery >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
      break
      
    case 'discoverCoordinators':
      discoverCoordinators()
        .then((playerList) => {
          response.json(playerList)
        })
        .catch((error) => {
          debug('error discovery >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
      break
    
    case 'getIp':
      getIp(0)
        .then((ipList) => {
          console.log(JSON.stringify(ipList))
          response.json(ipList)
        })
        .catch((error) => {
          debug('error getiI >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
            
      break
      
    case 'getIpStephan':
      getIpStephan()
        .then((ipList) => {
          console.log(JSON.stringify(ipList))
          response.json(ipList)
        })
        .catch((error) => {
          // eslint-disable-next-line max-len
          debug('error stephan getIp >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
                
      break
       
    }   
  })

}