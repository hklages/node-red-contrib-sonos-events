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
  getRightCcuIp, getIpStephan, getMultipleIps
} = require('./Discovery.js')

const { isValidPropertyNotEmptyString } = require('./Helper.js')

const debug = require('debug')('nrcse:config')

module.exports = function (RED) {

  function sonosEventsConfigNode (config) {
    debug('method >>%s', 'sonosEventNode')
    RED.nodes.createNode(this, config)

    if (isValidPropertyNotEmptyString(config, ['listenerHostname'])) {
      process.env.SONOS_LISTENER_HOST = config.listenerHostname
      debug('listener modified - new hostname >>%s', config.listenerHostname)
    } else {
      delete process.env.SONOS_LISTENER_HOST
      debug('ENV SONOS_LISTENER_HOST deleted')
    }
    
    if (isValidPropertyNotEmptyString(config, ['listenerPort'])) {
      process.env.SONOS_LISTENER_PORT = config.listenerPort
      debug('listener modified - new port >>%s', config.listenerPort)
    } else {
      delete process.env.SONOS_LISTENER_PORT
      debug('ENV SONOS_LISTENER_PORT deleted')
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
      
    case 'getMultipeIps':
      getMultipleIps()
        .then((ipList) => {
          response.json(ipList)
        })
        .catch((error) => {
          debug('error getIp >>%s', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
      break

    case 'getIpStephan':
      getIpStephan()
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
      response.json('endpoint is not defined')
      
    }   
  })
}