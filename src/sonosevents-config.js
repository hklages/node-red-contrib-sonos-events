/**
 * This module is is to update the config data from given user input
 * and provides a http server to access the back end.
 * 
 * Endpoints at <ip>:<port>/nrcse/
 * discoverAllPlayerWithHost - discover SONOS player via UDP SSDP broadcast
 * getIp, getMultipleIps - get server ip address from interface (my implementation)
 * getEnvListenerHost, getEnvListenerPort - ENV variables (usually empty)
 *
 * @module config
 * 
 * @author Henning Klages
 * 
 * @since 2023-01-05
*/

'use strict'

const { PACKAGE_PREFIX, TIMEOUT_PLAYER_DISCOVERY } = require('./Globals.js')

const { discoverAllPlayerWithHost } = require('./Discovery.js')

const { getRightCcuIp, getMultipleIps } = require('./Extensions.js')

const { isTruthyPropertyStringNotEmpty, isTruthyProperty } = require('./Helper.js')

const { SonosEventListener } = require('@svrooij/sonos/lib')

const debug = require('debug')(`${PACKAGE_PREFIX}:config`)

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
  //       HTTP Server to access backend: Discovery & Local IP address
  // .......................................................................................

  RED.httpAdmin.get('/nrcse/*', function (req, response) {

    switch (req.params[0]) {

    case 'discoverAllPlayerWithHost':
      debug('starting discovery')
      discoverAllPlayerWithHost()
        .then((playerList) => {
          debug('found player during discovery')
          response.json(playerList)
        })
        .catch((error) => {
          if (isTruthyProperty(error, ['message'])) {
            if (error.message === TIMEOUT_PLAYER_DISCOVERY) {
              debug('could not find any player')   
              response.json({ 'label': 'no player found', 'value': '' })
              return
            } 
          }
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
      response.json('available nrcse endpoints: discoverAllPlayerWithHost, getIp, getMultipleIps, getEnvListenerHost, getEnvListenerPort    ')
      
    }   
  })
}