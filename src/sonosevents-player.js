/**
 * This module handles all player related events.
 *
 * @module player
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-04
*/

'use strict'

const { SonosDevice } = require('@svrooij/sonos/lib')
const {
  improvedGroupManagementService, improvedAudiIn,
  improvedDeviceProperties, improvedRenderingControl } = require('./Helper')

const debug = require('debug')('nrcse:player')

module.exports = function (RED) {

  /** Create event node notification based on configuration and send messages
   * @param  {object} config current node configuration data
  */
  
  function sonosEventsPlayerNode (config) {
    debug('method >>%s', 'sonosEventsPlayerNode')
    RED.nodes.createNode(this, config)
   
    // clear node status, get data from dialog
    const node = this
    node.status({})

    // get data from dialog
    const subscriptions = {
      renderingControlRaw: config.renderingControlRaw,
      mutestate: config.mutestate,
      volume: config.volume,
      groupManagementRaw: config.groupManagementRaw,
      localGroupUuid: config.localGroupUuid,
      audioInServiceRaw: config.audioInServiceRaw,
      playing: config.playing,
      devicePropertiesRaw: config.devicePropertiesRaw,
      micEnabled: config.micEnabled
    }

    // create new player from input such as 192.168.178.35
    const player = new SonosDevice(config.playerHostname)

    // async wrapper, status and error handling
    asyncSubscribeToMultipleEvents(node, subscriptions, player)
      .then((success) => {
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
          debug('nodeOnClose >>subscriptions canceled')
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

  RED.nodes.registerType('sonosevents-player', sonosEventsPlayerNode)

}

async function asyncSubscribeToMultipleEvents (node, subscriptions, player) {
    
  let errorCount = 0 // global to calc all errors
  const msgMaster = [null, null, null, null, null, null, null, null]

  // bind events
  if (subscriptions.renderingControlRaw || subscriptions.volume || subscriptions.mutestate) {
    await player.RenderingControlService.Events.on('serviceEvent', sendMsgRenderingControl)
    debug('subscribed to RenderingControlService')
  }
  
  if (subscriptions.localGroupUuid || subscriptions.groupManagementRaw) {
    await player.GroupManagementService.Events.on('serviceEvent', sendMsgGroupManagement)
    debug('subscribed to GroupManagementService')
  }

  // TODO check whether device supports it!
  if (subscriptions.audioInServiceRaw || subscriptions.playing) {
    await player.AudioInService.Events.on('serviceEvent', sendMsgAudioInService)
    debug('subscribed to AudioInService')
  }
  // TODO check whether device supports it!
  if (subscriptions.devicePropertiesRaw || subscriptions.micEnabled) {
    await player.DevicePropertiesService.Events.on('serviceEvent', sendMsgDeviceProperties)
    debug('subscribed to DevicePropertiesService')
  }

  return true

  // .............. sendMsg functions ...............
  // only output to requested output lines, prepare data
  // uses global node
  async function sendMsgRenderingControl (raw) {
    debug('new RenderingControl event')
    let payload = {}
    let topic = ''
    let msgIndex = 0
    try {
      const topicPrefix = `player/${player.host}/renderingControl/`
      const improved = await improvedRenderingControl(raw)
      
      if (subscriptions.renderingControlRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.volume && improved.volume !== null) {
        const msg = msgMaster.slice()
        payload = improved.volume
        topic = topicPrefix + 'volume'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.mutestate && improved.mutestate !== null) {
        const msg = msgMaster.slice()
        payload = improved.mutestate
        topic = topicPrefix + 'mutestate'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing volume event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgGroupManagement (raw) {
    debug('new GroupManagementService event')
    let payload = {}
    let topic = ''
    let msgIndex = 5
    try { 
      const topicPrefix = `group/${player.host}/groupManagementService/`
      const improved = await improvedGroupManagementService(raw) 

      if (subscriptions.groupManagementRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.localGroupUuid && improved.localGroupUuid !== null) {
        const msg = msgMaster.slice()
        payload = improved.localGroupUuid
        topic = topicPrefix + 'localGroupUuid'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++
      
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing GroupManagementService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
    
  async function sendMsgAudioInService (raw) {
    debug('new AudioInService event')
    let payload = {}
    let topic = ''
    let msgIndex = 8
    try {
      const topicPrefix = `group/${player.host}/audioIn/`
      const improved = await improvedAudiIn(raw) 

      if (subscriptions.audioInServiceRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.playing && improved.playing !== null) {
        const msg = msgMaster.slice()
        payload = improved.playing
        topic = topicPrefix + 'playing'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++
      
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AudioInService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
  
  async function sendMsgDeviceProperties (raw) {
    debug('new DevicePropertiesService event')
    let payload = {}
    let topic = ''
    let msgIndex = 10
    try {
      const topicPrefix = `group/${player.host}/deviceProperties/`
      const improved = await improvedDeviceProperties(raw) 
      
      if (subscriptions.devicePropertiesRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.micEnabled && improved.micEnabled !== null) {
        const msg = msgMaster.slice()
        payload = improved.micEnabled
        topic = topicPrefix + 'micEnabled'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++
     
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing DevicePropertiesService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
}

async function cancelAllSubscriptions (player) {
  
  // TODO check whether only for those with subscription or like this
  await player.RenderingControlService.Events.removeAllListeners('serviceEvent')
  await player.GroupManagementService.Events.removeAllListeners('serviceEvent')
  await player.DevicePropertiesService.Events.removeAllListeners('serviceEvent')
  await player.AudioInService.Events.removeAllListeners('serviceEvent')
  
}
