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
const {
  isValidProperty, improvedServiceData }
  = require('./Helper')
  
const { SonosDevice } = require('@svrooij/sonos/lib')
// TODO check please
//const { AVTransportService } = require('@svrooij/sonos/lib/services')
const debug = require('debug')('nrcse:selection')

module.exports = function (RED) {

  /** Create event node notification based on configuration and send messages
   * @param  {object} config current node configuration data
  */
  
  function sonosEventsSelectionNode (config) {
    debug('method >>%s', 'sonosEventsSelectionNode')
    RED.nodes.createNode(this, config)
   
    // clear node status, get data from dialog
    const node = this
    node.status({})

    // create new player from input such as 192.168.178.37
    const player = new SonosDevice(config.playerHostname)

    const subscriptions = config.events
    // for each service create the required events with corresponding output index
    const eventsByServices = {}
    // TODO define . as general delimiter!
    for (let i = 0; i < subscriptions.length; i++) {
      const [serviceName, eventName] = subscriptions[i].fullName.split('.')
      if (!isValidProperty(eventsByServices, [serviceName])) {
        eventsByServices[serviceName] = {}
      }
      eventsByServices[serviceName][eventName] = i
    }

    // subscribe in async wrapper with status and error handling
    asyncSubscribeToMultipleEvents(node, player, eventsByServices)
      .then((success) => { // success, when handler is successfully established
        node.status({ fill: 'green', shape: 'ring', text: 'connected' })
        node.debug(`success >>${JSON.stringify(success)}`)
      })
      .catch((error) => {
        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' })
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

    return true
  }

  RED.nodes.registerType('sonosevents-selection', sonosEventsSelectionNode)
}

async function asyncSubscribeToMultipleEvents (node, player, eventsByServices) {
    
  // global definition
  let errorCount = 0 

  // get all services
  const serviceArray = Object.keys(eventsByServices)

  // get number of events = number of outputs
  const outputs = serviceArray.reduce(function (acc, current) {
    return acc + Object.keys(eventsByServices[current]).length
  }, 0)

  serviceArray.forEach(async function (serviceName) {
    await player[serviceName].Events.on('serviceEvent',
      sendServiceMsgs.bind(this, serviceName, eventsByServices[serviceName], outputs))
    debug('subscribed to >>%s', serviceName)
  })
  
  return true

  // .............. sendMsg functions ...............
  // only output to requested output lines, prepare data
  // uses globally declared objects node, msgArray

  async function sendServiceMsgs (serviceName, mapEventToOutput, outputs, raw) {
    debug('new event >>', serviceName)
   
    try {
      // define msg s
      const topicPrefix = `${player.host}/${serviceName}/`
      const improved = await improvedServiceData(serviceName, raw)
      
      const eventNames = Object.keys(mapEventToOutput)
      eventNames.forEach(eventName => {
        if (isValidProperty(mapEventToOutput, [eventName])) {
          const msg = new Array(outputs).fill(null)
          const payload = improved[eventName]
          const topic = topicPrefix + eventName
          msg[mapEventToOutput[eventName]] = { payload, topic }
          node.send(msg)
        }  
      })
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AVTransport event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

}

async function cancelAllSubscriptions (player, eventsByServices) {
  
  // TODO How to unsubscribe only those created by this node (not impacting nodes with same ip)
  const serviceArray = Object.keys(eventsByServices)
  serviceArray.forEach(async function (serviceName) {
    await player[serviceName].Events.removeAllListeners('serviceEvent')
    debug('unsubscribed to >>%s', serviceName)
  })
}