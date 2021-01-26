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

const { discoverPlayers, discoverCoordinators, discoverGroupsAll,
  getRightCcuIp, getHostIpV230, getMultipleIps
} = require('./Discovery.js')

const { isTruthyPropertyStringNotEmpty } = require('./Helper.js')

const { SonosEventListener } = require('@svrooij/sonos/lib')

const debug = require('debug')('nrcse:config')

module.exports = function (RED) {

  function sonosEventsConfigNode (config) {
    debug('method >>%s', 'sonosEventNode')
    RED.nodes.createNode(this, config)
    
    const update = {}
    if (isTruthyPropertyStringNotEmpty(config, ['listenerHostname'])) {
      update.newHost = config.listenerHostname
      debug('listener host provided - using host >>%s', config.listenerHostname)
    } else {
      update.newHost = undefined
      debug('listener host not provided - using default host')
    }

    if (isTruthyPropertyStringNotEmpty(config, ['listenerPort'])) {
      update.newPort = Number(config.listenerPort)
      debug('port provided - using port >>%s', Number(config.listenerPort))
    } else {
      update.newPort = undefined
      debug('listener port not provided - using default port 6329')
    }
    SonosEventListener.DefaultInstance.UpdateSettings(update)
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
      
    case 'discoverGroups':
      discoverGroupsAll()
        .then((playerList) => {
          response.json(playerList)
        })
        .catch((error) => {
          debug('error discovery >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
      break
    case 'getIp':
      getRightCcuIp(0)
        .then((ipList) => {
          response.json(ipList)
        })
        .catch((error) => {
          debug('error getIp >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
      break
      
    case 'getMultipleIps':
      getMultipleIps()
        .then((ipList) => {
          response.json(ipList)
        })
        .catch((error) => {
          debug('error getIp >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
      break

    case 'getIpStephan':
      getHostIpV230()
        .then((ipList) => {
          response.json(ipList)
        })
        .catch((error) => {
          // eslint-disable-next-line max-len
          debug('error stephan getIp >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
      break
       
    case 'getEnvListenerHost': {
      const hostname = process.env.SONOS_LISTENER_HOST 
      response.json(`listener hostname >>${hostname}`)
      break
    }
      
    case 'getEnvListenerPort': { 
      const port = process.env.SONOS_LISTENER_PORT
      response.json(`listener port >>${port}`)
      break
    }
      
    default:
      // eslint-disable-next-line max-len
      response.json('available nrcse endpoints: discoverPlayers, discoverCoordinators, discoverGroups, getIp, getMultipleIps, getEnvListenerHost, getEnvListenerPort    ')
      
    }   
  })
}