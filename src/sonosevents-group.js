
/**
 * This module handles all group related events.
 *
 * @module group
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-04
*/

'use strict'

const { improvedAvTransportData, improvedGroupRenderingData }
  = require('./Helper.js')

const { SonosDevice } = require('@svrooij/sonos/lib')
const debug = require('debug')('nrcse:group')

module.exports = function (RED) {

  /** Create event node notification based on configuration and send messages
   * @param  {object} config current node configuration data
  */
  
  function sonosEventsGroupsNode (config) {
    debug('method >>%s', 'sonosEventsGroupNode')
    RED.nodes.createNode(this, config)
   
    // clear node status, get data from dialog
    const node = this
    node.status({})

    const subscriptions = {
      avTransportRaw: config.avTransportRaw,
      basics: config.basics,
      content: config.content,
      playbackstate: config.playbackstate,
      groupRenderingControlRaw: config.groupRenderingControlRaw,
      groupMutestate: config.groupMutestate,
      groupVolume: config.groupVolume
    }

    // create new player from input such as 192.168.178.37
    const coordinator = new SonosDevice(config.playerHostname)

    // async wrapper, status and error handling
    asyncSubscribeToMultipleEvents(node, subscriptions, coordinator)
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
      cancelAllSubscriptions(coordinator, subscriptions)
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

  RED.nodes.registerType('sonosevents-group', sonosEventsGroupsNode)

}

async function asyncSubscribeToMultipleEvents (node, subscriptions, coordinator) {
    
  let errorCount = 0 // global and command. be aware!
  const msgMaster = [null, null, null, null, null, null, null, null]

  // bind events
  if (subscriptions.avTransportRaw
    || subscriptions.basics
    || subscriptions.content 
    || subscriptions.playbackstate) {
    coordinator.AVTransportService.Events.on('serviceEvent', sendMsgsAVTransport)
    debug('subscribed to AVTransportService')
  }

  // eslint-disable-next-line max-len
  if (subscriptions.groupRenderingControlRaw || subscriptions.groupVolume || subscriptions.groupMutestate) {
    // eslint-disable-next-line max-len
    coordinator.GroupRenderingControlService.Events.on('serviceEvent', sendMsgsGroupRenderingControl)
    debug('subscribed to GroupRenderingControlService')
  }

  return true

  // .............. sendMsg functions ...............
  // only output to requested output lines, prepare data
  // uses global node
  async function sendMsgsAVTransport (raw) {
    debug('new AVTransportService event')
    let payload = {}
    let topic = ''
    let msgIndex = 0
    try {
      // define msg s
      const topicPrefix = `group/${coordinator.host}/AVTransportService/`
      const improved = await improvedAvTransportData(raw)
      
      if (subscriptions.avTransportRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++
      
      if (subscriptions.basics && improved.basics !== null) {
        const msg = msgMaster.slice()
        payload = improved.basics
        topic = topicPrefix + 'basics'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)  
      }
      msgIndex++
      
      if (subscriptions.content && improved.content !== null) {
        const msg = msgMaster.slice()
        payload = improved.content
        topic = topicPrefix + 'content'
        msg[msgIndex] = { payload, raw, topic, 'properties': Object.keys(raw) }
        node.send(msg)
      }
      msgIndex++
      
      if (subscriptions.playbackstate && subscriptions.playbackstate !== null) {
        const msg = msgMaster.slice()
        payload = improved.playbackstate
        topic = topicPrefix + 'playbackstate'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++
      
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AVTransport event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  // only output to requested output lines, prepare data
  // uses global node
  async function sendMsgsGroupRenderingControl (raw) {
    debug('new GroupRenderingControlService event')
    let payload = {}
    let topic = ''
    let msgIndex = 5
    try {
      const topicPrefix = `group/${coordinator.host}/groupRenderingControl/`
      const improved = await improvedGroupRenderingData(raw) 

      if (subscriptions.groupRenderingControlRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'Raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.groupVolume && improved.groupVolume !== null) {
        const msg = msgMaster.slice()
        payload = improved.groupVolume
        topic = topicPrefix + 'groupVolume'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++
      
      if (subscriptions.groupMutestate && improved.groupMutestate !== null) {
        const msg = msgMaster.slice()
        payload = improved.groupMutestate
        topic = topicPrefix + 'groupMutestate'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing GroupRenderingControlService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
}

async function cancelAllSubscriptions (coordinator) {
  
  // TODO verify that it is OK to cancel all although there might not be a subscription
  await coordinator.AVTransportService.Events.removeAllListeners('serviceEvent')
  await coordinator.GroupRenderingControlService.Events.removeAllListeners('serviceEvent')

}