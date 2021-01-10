
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

const { improvedAvTransportData, improvedGroupRenderingData, isValidProperty, }
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
      content: config.content,
      avTransport: config.avTransport,
      playbackstate: config.playbackstate,
      groupMuteState: config.groupMuteState,
      groupVolume: config.groupVolume,
      ignoreTransition: config.ignoreTransition,
      ignoreZpstr: config.ignoreZpstr
    }

    // create new player from input such as 192.168.178.37
    const coordinator = new SonosDevice(config.playerHostname)

    //TODO in dialog should be mentioned that coordinator!

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
  if (subscriptions.content || subscriptions.contentCategory || subscriptions.playbackstate) {
    coordinator.AVTransportService.Events.on('serviceEvent', sendMsgsAVTransport)
    debug('subscribed to AVTransportService')
  }

  if (subscriptions.groupVolume || subscriptions.groupVolume) {
    // eslint-disable-next-line max-len
    coordinator.GroupRenderingControlService.Events.on('serviceEvent', sendMsgsGroupRenderingControl)
    debug('subscribed to GroupRenderingControlService')
  }

  return true

  // .............. sendMsg functions ...............
  // TODO msg[0] ... msg[2] should use parameter! - bind?
  async function sendMsgsAVTransport (raw) {
    let payload
    let topic
    try {
      debug('new AVTransportService event')
      // Filter playback state TRANSITION if requested if requested
      if (isValidProperty(raw, ['TransportState'])) {
        if (raw.TransportState === 'TRANSITIONING' && subscriptions.ignoreTransition) {
          debug('no output send as TRANSITION detected')
          return true
        }
      }
  
      //Filter Check Album, title Artist with ZPSTR string        
      ['Title', 'Album', 'Artist'].forEach(topic => {
        let item
        if (isValidProperty(raw, ['CurrentTrackMetaData', topic])) {
          item = raw.CurrentTrackMetaData[topic]
          if (typeof item === 'string' & item.startsWith('ZPSTR_')) {
            debug('no output send as ZPSTR_ detected in >>%s', topic)
            return true
          }
        }
      })

      // define msg s
      const topicPrefix = `group/${coordinator.host}/AVTransportService/`
      // TODO check property improved.contentCategory exist als plabackstate also content
      const improved = await improvedAvTransportData(raw)
      payload = {}
      if (subscriptions.content) {
        const msg = msgMaster.slice()
        payload = improved.contentBundle
        topic = topicPrefix + 'content'
        msg[0] = { payload, raw, topic, 'properties': Object.keys(raw) }
        node.send(msg)
      }
      // check !==null for those cases AVTransportURI is not available
      if (subscriptions.avTransport && improved.basicsBundle.uri !== undefined) {
        const msg = msgMaster.slice()
        payload = improved.basicsBundle
        topic = topicPrefix + 'avTransport'
        msg[1] = { payload, raw, topic }
        node.send(msg)
      }
      if (subscriptions.playbackstate !== null) {
        const msg = msgMaster.slice()
        payload = improved.playbackstate
        topic = topicPrefix + 'playbackstate'
        msg[2] = { payload, raw, topic }
        node.send(msg)
      }
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AVTransport event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgsGroupRenderingControl (raw) {
    let payload
    let topic
    try {
      const topicPrefix = `group/${coordinator.host}/groupRenderingControl/`
      const improved = await improvedGroupRenderingData(raw) 
      if (subscriptions.groupVolume) {
        const msg = msgMaster.slice()
        payload = improved.groupVolume
        topic = topicPrefix + 'groupVolume'
        msg[3] = { payload, raw, topic }
        node.send(msg)
      }
      debug('new GroupRenderingControlService event')
      if (subscriptions.groupMuteState) {
        const msg = msgMaster.slice()
        payload = improved.groupMuteState
        topic = topicPrefix + 'groupMuteState'
        msg[4] = { payload, raw, topic }
        node.send(msg)
      }
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