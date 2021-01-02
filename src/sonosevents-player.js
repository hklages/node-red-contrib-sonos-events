'use strict'

/**
 * This module handles all player related events.
 *
 * @module player
 * 
 * @author Henning Klages
 * 
 * @since 2020-12-31
*/

const { SonosDevice } = require('@svrooij/sonos/lib')

const debug = require('debug')('nrcse:notify')

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
      mute: config.mute,
      volume: config.volume,
      localGroupUuid: config.localGroupUuid,
      groupCoordinatorIsLocal: config.groupCoordinatorIsLocal,
      lineInConnected: config.lineInConnected
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
    
    node.on('close', function (done) {
      cancelAllSubscriptions(player, subscriptions, done)
        .then(() => {
          node.log('node-on-close -subscriptions canceled.')
        })
        .catch(error => {
          node.log('node-on-close error>>'
                + JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
    })

  }

  RED.nodes.registerType('sonosevents-player', sonosEventsPlayerNode)

  //
  //                                      Subscriptions
  // .......................................................................................

  async function asyncOnEvent (node, subscriptions, player) {
    
    // TODO all ifs and then filtering!
    player.RenderingControlService.Events.on('serviceEvent', (data) => {
      debug('new RenderingControlService event arrived')
      const msg = [null, null, null, null]
      msg[0] = { 'payload': data, 'topic': `player/${player.host}/renderingControl` }
      node.send(msg)
    })
    debug('subscribed to RenderingControlService')
    
    player.GroupManagementService.Events.on('serviceEvent', (data) => {
      debug('new GroupManagementService event arrived')
      const msg = [null, null, null, null]
      msg[1] = { 'payload': data, 'topic': `player/${player.host}/groupManagement` }
      node.send(msg)
    })
    debug('subscribed to GroupManagementService')

    // TODO check hier wheter device supports it!
    player.DevicePropertiesService.Events.on('serviceEvent', (data) => {
      debug('new DevicePropertiesService event arrived')
      const msg = [null, null, null, null]
      msg[2] = { 'payload': data, 'topic': `player/${player.host}/deviceProperties` }
      node.send(msg)
    })
    debug('subscribed to DevicePropertiesService')

    // TODO check whether device supports it!
    player.AudioInService.Events.on('serviceEvent', (data) => {
      debug('new AudioInService event arrived')
      const msg = [null, null, null, null]
      msg[3] = { 'payload': data, 'topic': `player/${player.host}/audioInService` }
      node.send(msg)
    })
    debug('subscribed to AudioInService')

    return true
  }

  async function cancelAllSubscriptions (player, subscriptions, callback) {
    
    // TODO check whether only for those with subscription or like this
    await player.RenderingControlService.Events.removeAllListeners('serviceEvent')
    await player.GroupManagementService.Events.removeAllListeners('serviceEvent')
    await player.DevicePropertiesService.Events.removeAllListeners('serviceEvent')
    await player.AudioInService.Events.removeAllListeners('serviceEvent')
    
    callback()
  }
}
