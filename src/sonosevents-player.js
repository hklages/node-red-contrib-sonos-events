'use strict'

/**
 * This module handles all player related events.
 *
 * @module player
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-04
*/

const { SonosDevice, SonosEvents } = require('@svrooij/sonos/lib')
const { isValidProperty } = require('./Helper')

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
      mutestate: config.mutestate,
      volume: config.volume,
      localGroupUuid: config.localGroupUuid,
      lineInConnected: config.lineInConnected,
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
  if (subscriptions.volume) {
    await player.Events.on(SonosEvents.Volume, sendMsgVolume)
    debug('subscribed to volume')
  }
  
  if (subscriptions.mutestate) {
    await player.Events.on(SonosEvents.Mute, sendMsgMutestate)
    debug('subscribed to mutestate')
  }

  if (subscriptions.localGroupUuid) {
    await player.GroupManagementService.Events.on('serviceEvent', sendMsgGroupManagement)
    debug('subscribed to GroupManagementService')
  }

  // TODO check whether device supports it!
  if (subscriptions.lineInConnected) {
    await player.AudioInService.Events.on('serviceEvent', sendMsgAudioInService)
    debug('subscribed to AudioInService')
  }
  // TODO check whether device supports it!
  if (subscriptions.micEnabled) {
    await player.DevicePropertiesService.Events.on('serviceEvent', sendMsgDeviceProperties)
    debug('subscribed to DevicePropertiesService')
  }

  return true

  // .............. sendMsg functions ...............
  async function sendMsgVolume (raw) {
    try {
      debug('new volume event')
      const payload = String(raw)
      const topic = `player/${player.host}/renderingControl/volume`
      const msg = msgMaster.slice()
      msg[0] = { payload, raw, topic }
      node.send(msg)
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing volume event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
  
  async function sendMsgMutestate (raw) {
    try {
      debug('new mute state event')
      const payload = (raw ? 'on' : 'off')
      const topic =  `player/${player.host}/renderingControl/mutestate`
      const msg = msgMaster.slice()
      msg[1] = { payload, raw, topic }
      node.send(msg)
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing mute state event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgGroupManagement (raw) {
    try { 
      debug('new GroupManagementService event')
      const payload = raw.LocalGroupUUID
      const topic = `player/${player.host}/groupManagement/localGroupUuid`
      const msg = msgMaster.slice()
      msg[2] = { payload, raw, topic }        
      node.send(msg)
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing GroupManagementService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
    
  async function sendMsgAudioInService (raw) {
    try {
      debug('new AudioInService event')
      let payload = 'not available'
      if (isValidProperty(raw, ['LineInConnected'])) {
        payload = (raw.LineInConnected ? 'yes' : 'no')
      }
      const topic =  `player/${player.host}/audioInService/lineInConnected`
      const msg = msgMaster.slice()
      msg[3] = { payload, raw, topic }        
      node.send(msg)
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AudioInService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
  
  async function sendMsgDeviceProperties (raw) {
    try {
      debug('new DevicePropertiesService event')
      let payload = 'not available'
      if (isValidProperty(raw, ['MicEnabled'])) {
        payload = (raw.MicEnabled === 1 ? 'on' : 'off')
      }
      const topic =  `player/${player.host}/deviceProperties/micState`
      const msg = msgMaster.slice()
      msg[4] = { payload, raw, topic }        
      node.send(msg)
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
