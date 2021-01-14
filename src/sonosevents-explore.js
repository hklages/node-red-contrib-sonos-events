
/**
 * Node to explore new functionality.
 *
 * @module explore
 * 
 * @author Henning Klages
 * 
 * @since 
*/

'use strict'

const { SonosDevice } = require('@svrooij/sonos/lib')
const debug = require('debug')('nrcse:explore')

module.exports = function (RED) {

  /** Create event node notification based on configuration and send messages
   * @param  {object} config current node configuration data
  */
  
  function sonosEventsExploreNode (config) {
    debug('method >>%s', 'sonosEventsGroupNode')
    RED.nodes.createNode(this, config)
   
    // clear node status, get data from dialog
    const node = this
    node.status({})

    const subscriptions = {
      basics: config.basics,
    }

    // create new player from input such as 192.168.178.37
    const player = new SonosDevice(config.playerHostname)

    // async wrapper, status and error handling
    asyncSubscribeToMultipleEvents(node, subscriptions, player)
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
      cancelAllSubscriptions(player, subscriptions)
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

  RED.nodes.registerType('sonosevents-explore', sonosEventsExploreNode)

}

async function asyncSubscribeToMultipleEvents (node, subscriptions, player) {
    
  let errorCount = 0 // global and command. be aware!
  const msgMaster = [null, null]

  // bind events
  player.ConnectionManagerService.Events.on('serviceEvent', sendMsgsConnectionManager)
  debug('subscribed to ConnectionManagerService')
  player.VirtualLineInService.Events.on('serviceEvent', sendRaw)
  debug('subscribed to VirtualLineInService')

  player.MusicServicesService.Events.on('serviceEvent', sendRaw)
  debug('subscribed to MusicServicesService')

  player.SystemPropertiesService.Events.on('serviceEvent', sendRaw)
  debug('subscribed to SystemPropertiesService')

  player.QueueService.Events.on('serviceEvent', sendRaw)
  debug('subscribed to QueueService')
  
  return true

  // .............. sendMsg functions ...............
  // only output to requested output lines, prepare data
  // uses global node
  async function sendMsgsConnectionManager (raw) {
    debug('new sendMsgsConnectionManager event')
    
    const msgIndex = 0

    try {
      // define msg s
      const msg = msgMaster.slice()
      const payload = raw
      const topic = 'connection manager'
      msg[msgIndex] = { payload, topic }
      node.send(msg)
      
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing ConnectionManagerService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  // only output to requested output lines, prepare data
  // uses global node
  async function sendRaw (raw) {
    debug('new multiple event')
    
    const msgIndex = 1
   
    try {
      const msg = msgMaster.slice()
      const payload = raw
      const topic = 'multiple'
      msg[msgIndex] = { payload, topic }
      node.send(msg)

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing different event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
}

async function cancelAllSubscriptions (coordinator) {
  
  // TODO verify that it is OK to cancel all although there might not be a subscription
  await coordinator.VirtualLineInService.Events.removeAllListeners('serviceEvent')
  await coordinator.ConnectionManagerService.Events.removeAllListeners('serviceEvent')
  await coordinator.QueueService.Events.removeAllListeners('serviceEvent')
  await coordinator.SystemPropertiesService.Events.removeAllListeners('serviceEvent')
  await coordinator.MusicServicesService.Events.removeAllListeners('serviceEvent')
}