/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Node create a selection of events.
 *
 * @module selection
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-16
*/

'use strict'

const { PACKAGE_PREFIX, REGEX_IP, REGEX_DNS } = require('./Globals.js')

const { isTruthyProperty } = require('./Helper')

const { filterAndImproveServiceData } = require('./Extensions')
  
const { SonosDevice, SonosEventListener, ServiceEvents } = require('@svrooij/sonos/lib')

const request = require('axios').default

const Dns = require('dns')
const dnsPromises = Dns.promises

const debug = require('debug')(`${PACKAGE_PREFIX}:selection`)

module.exports = function (RED) {

  /** Create event node notification based on configuration and send messages
   * @param  {object} config current node configuration data
  */
  
  function sonosEventsSelectionNode (config) {
    debug('method >>%s', 'sonosEventsSelectionNode')
    RED.nodes.createNode(this, config)
   
    // clear node status, get data from dialog
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const node = this
    node.status({})
    let ipv4Address
      
    // async wrap to make it possible to use await dnsPromise
    (async function () {
      if (REGEX_IP.test(config.playerHostname)) {
        ipv4Address = config.playerHostname // pure ip address
      } else if (REGEX_DNS.test(config.playerHostname)) { // DNS name to be resolved
        const ipv4Array = await dnsPromises.resolve4(config.playerHostname) 
        // dnsPromise returns an array with all data
        ipv4Address = ipv4Array[0] // converted to ip address
      } else {
        debug(`${PACKAGE_PREFIX} ipv4//DNS name >>${config.playerHostname} invalid syntax`)
        node.status({ fill: 'red', shape: 'ring', text: 'ipv4/DNS name has invalid syntax' })
        return
      }
      // ipv4Address is a pure ipv4 address and ready to use

      // create new player from input such as 192.168.178.37
      const player = new SonosDevice(ipv4Address)

      // for each service create the required events with corresponding output index
      const subscriptions = config.events
      const eventsByServices = {}
      //  . as general delimiter!
      for (let i = 0; i < subscriptions.length; i++) {
        const [serviceName, eventName] = subscriptions[i].fullName.split('.')
        if (!isTruthyProperty(eventsByServices, [serviceName])) {
          eventsByServices[serviceName] = {}
        }
        eventsByServices[serviceName][eventName] = i
      }

      // subscribe and handle errors direct
      subscribeToMultipleEvents(node, player, eventsByServices)
        .then((port) => { // success, when handler is successfully established
          node.status({ fill: 'green', shape: 'ring', text: `connected: ${port}` })
          node.debug(`port >>${JSON.stringify(port)}`)
        })
        .catch((error) => {
          node.status({ fill: 'red', shape: 'ring', text: 'disconnected: ' + error.message })
          node.debug(`error subscribe>>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
        })
      
      // unsubscribe to all, when node is deleted (redeployed does delete)
      node.on('close', function (done) {
        cancelAllSubscriptions(player, eventsByServices)
          .then(() => {
            debug('nodeOnClose >>all subscriptions canceled')
            done()
          })
          .catch(error => {
            debug(`nodeOnClose error during cancel subscriptions >>
            ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
            done(error)
          })
      })
 
    })() // end of async wrapper for DNS
      .catch((err) => {
        debug('Could not resolve DNS name - error message >>%',
          JSON.stringify(err, Object.getOwnPropertyNames(err)))
        node.status({
          fill: 'red', shape: 'ring',
          text: 'Could not resolve DNS name >>' + config.playerHostname
        })
      })
    
    return true
  }

  RED.nodes.registerType('sonosevents-selection', sonosEventsSelectionNode)
}

/** Subscribe to multiple services, filter properties and send messages for a given player.
 * @param {object} node current node
 * @param {object} player sonos-ts player object
 * @param {object} eventsByServices such as 
 *                  "RenderingControlService":{"raw":0}} 0 stands for output index
 *
 * @returns {promise<string>} host:port OK
 * 
 * @throws errors isTruthyPropertyStringNotEmpty, isTruthyProperty
 */
async function subscribeToMultipleEvents (node, player, eventsByServices) {
  debug('method >>%s', 'asyncSubscribeToMultipleEvents')
  // general definition for this node
  let errorCount = 0 
  const serviceArray = Object.keys(eventsByServices)

  // get number of events = number of outputs
  const outputs = serviceArray.reduce(function (acc, current) {
    return acc + Object.keys(eventsByServices[current]).length
  }, 0)

  // validate ip (with time out) and get the device capabilities
  let capabilities = []
  let response
  try {
    response = await request.get(`http://${player.host}:${player.port}/info`, { timeout: 4000 })  
  } catch (error) {
    debug('invalid player - http request >>%s', JSON.stringify(error.message))
    // TODO check ECONNREFUSED
    throw new Error('invalid player - error or timed out')
  }
  if (isTruthyProperty(response, ['data', 'device', 'capabilities'])) {
    capabilities = response.data.device.capabilities
  } else {
    throw new Error('invalid player - missing capabilities)')
  }

  // do events "DevicePropertiesService.micEnabled", "AudioInService.lineInConnected"
  // match capabilities: VOICE, LINE_IN, (HT_PLAYBACK to be implemented)
  if (isTruthyProperty(eventsByServices, ['DevicePropertiesService', 'micEnabled'])
      && !capabilities.includes('VOICE')) {
    throw new Error('micEnabled not possible')
  }
  if (isTruthyProperty(eventsByServices, ['AudioInService', 'lineInConnected'])
    && !capabilities.includes('LINE_IN')) {
    throw new Error('lineInConnected not possible')
  }
  
  // what port, host ...
  debug('event listener status >>%s',
    JSON.stringify(SonosEventListener.DefaultInstance.GetStatus()))
  
  // subscribe to the specified services/events
  serviceArray.forEach(async function (serviceName) {
    // const response = await ... does not provide any relevant information
    await player[serviceName].Events.on(ServiceEvents.ServiceEvent,
      sendServiceMsgs.bind(this, serviceName, eventsByServices[serviceName], outputs))
    debug('subscribed to >>%s', serviceName)
  })
  
  return SonosEventListener.DefaultInstance.GetStatus().port

  // .............. sendMsg functions ...............
  // only output to requested output lines, prepare data
  // uses globally declared objects node, msgArray

  async function sendServiceMsgs (serviceName, mapEventToOutput, outputs, raw) {
    debug('new event >>', serviceName)
   
    try {
      // define msg s
      const topicPrefix = `${player.host}/${serviceName}/`
      const improved = await filterAndImproveServiceData(serviceName, raw)
      
      const eventNames = Object.keys(mapEventToOutput)
      eventNames.forEach(eventName => {
        if (isTruthyProperty(mapEventToOutput, [eventName])) {
          const msg = new Array(outputs).fill(null)
          const topic = topicPrefix + eventName
          if (eventName === 'raw') {
            // raw means no event filter, original data
            msg[mapEventToOutput[eventName]] = { 'payload': raw, topic }
            node.send(msg)
          } else {
            // we have to remove null events
            if (improved[eventName] !== null) {
              const payload = improved[eventName]   
              msg[mapEventToOutput[eventName]] = { payload, topic, raw }
              node.send(msg)
            }
          }
        }  
      })
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      node.debug(`error processing AVTransport event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
}

async function cancelAllSubscriptions (player, eventsByServices) {
  
  const serviceArray = Object.keys(eventsByServices)
  serviceArray.forEach(async function (serviceName) {
    await player[serviceName].Events.removeAllListeners(ServiceEvents.ServiceEvent)
    debug('unsubscribed to >>%s', serviceName)
  })
}