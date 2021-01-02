'use strict'

/**
 * This module handles all player related events.
 *
 * @module player
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
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
    asyncOnEvent(node, subscriptions, player)
      .then((success) => {
        node.status({ fill: 'green', shape: 'ring', text: 'connected' })
        node.debug(`success >>${JSON.stringify(success)}`)  
      })
      .catch((error) => {
        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' })
        node.debug(`error >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
      })
    
    // we need to unsubscribe, when node is deleted or redeployed
    node.on('close', function (done) {
      cancelAllSubscriptions(player, subscriptions)
        .then(() => {
          node.log('nodeOnClose >>subscriptions canceled')
          done()
        })
        .catch(error => {
          node.log('nodeOnClose error>>'
            + JSON.stringify(error, Object.getOwnPropertyNames(error)))
          done(error)
        })
    })

  }

  RED.nodes.registerType('sonosevents-player', sonosEventsPlayerNode)

  //
  //                                      Subscriptions
  // .......................................................................................

  async function asyncOnEvent (node, subscriptions, player) {
    
    // TODO ERROR HANDLING
    // RenderingControlService 
    if (subscriptions.volume) {
      player.Events.on(SonosEvents.Volume, (payload) => {
        debug('new volume event')
        const msg = [null, null, null, null]
        payload = String(payload)
        msg[0] = { payload,  'topic': `player/${player.host}/renderingControl/volume` }
        node.send(msg)
      })
      debug('subscribed to volume')
    }
    
    if (subscriptions.mutestate) {
      player.Events.on(SonosEvents.Mute, (payload) => {
        debug('new mute state event')
        const msg = [null, null, null, null]
        payload = (payload ? 'on' : 'off')
        msg[0] = { payload, 'topic': `player/${player.host}/renderingControl/mutestate` }
        node.send(msg)
      })
      debug('subscribed to mutestate')
    }

    // GroupManagementService
    if (subscriptions.localGroupUuid) {
      player.GroupManagementService.Events.on('serviceEvent', (raw) => {
        debug('new GroupManagementService event')
        const msg = [null, null, null, null]
        msg[1] = {
          'payload': raw.LocalGroupUUID, raw,
          'topic': `player/${player.host}/groupManagement/localGroupUuid`
        }
        node.send(msg)
      })
      debug('subscribed to GroupManagementService')
    }

    // AudioInService
    // TODO check whether device supports it!
    if (subscriptions.lineInConnected) {
      player.AudioInService.Events.on('serviceEvent', (raw) => {
        debug('new AudioInService event')
        const msg = [null, null, null, null]
        let payload = 'not available'
        if (isValidProperty(raw, ['LineInConnected'])) {
          payload = (raw.LineInConnected ? 'yes' : 'no')
        }
        msg[2] = { payload, raw, 'topic': `player/${player.host}/audioInService/lineInConnected` }
        node.send(msg)
      })
      debug('subscribed to AudioInService')
    }

    // DevicePropertiesService
    if (subscriptions.micEnabled) {
      player.DevicePropertiesService.Events.on('serviceEvent', (raw) => {
        debug('new DevicePropertiesService event')
        const msg = [null, null, null, null]
        let payload = 'not available'
        if (isValidProperty(raw, ['MicEnabled'])) {
          payload = (raw.MicEnabled === 1 ? 'on' : 'off')
        }
        msg[3] = { payload, raw, 'topic': `player/${player.host}/deviceProperties/micState` }
        node.send(msg)
      })
      debug('subscribed to DevicePropertiesService')
    }

    return true
  }

  async function cancelAllSubscriptions (player) {
    
    // TODO check whether only for those with subscription or like this
    await player.RenderingControlService.Events.removeAllListeners('serviceEvent')
    await player.GroupManagementService.Events.removeAllListeners('serviceEvent')
    await player.DevicePropertiesService.Events.removeAllListeners('serviceEvent')
    await player.AudioInService.Events.removeAllListeners('serviceEvent')
    
  }
}
