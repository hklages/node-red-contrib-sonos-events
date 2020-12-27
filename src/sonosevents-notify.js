'use strict'

/**
 * The basic module to handle all notification for a player and its group.
 *
 * @module Helpers
 * 
 * @author Henning Klages
 * 
 * @since 2020-12-21
*/

const { SonosEvents } = require('@svrooij/sonos/lib')
const SonosDevice = require('@svrooij/sonos').SonosDevice
const ServiceEvents = require('@svrooij/sonos').ServiceEvents
const SonosDeviceDiscovery = require('@svrooij/sonos').SonosDeviceDiscovery
const parser = require('fast-xml-parser')
const { DecodeAndParseXml } = require('@svrooij/sonos/lib/helpers/xml-helper')

const { transformAvTransportData, transformZoneData, decodeHtml
} = require('./Helper.js')

const debug = require('debug')('nrcse:notifiy')

module.exports = function (RED) {

  /** Create event node base on configuration and send messages
   * @param  {object} config current node configuration data
   */
  function sonosNotifyNode (config) {
    debug('method >>%s', 'sonosNotifyNode')
    RED.nodes.createNode(this, config)
   
    // clear node status, get data from dialog
    const node = this
    node.status({})
    const subscriptions = {
      topology: config.topologyEvent,
      track: config.trackEvent,
      groupMute: config.groupMuteEvent,
      volume: config.volumeEvent,
      groupVolume: config.groupVolumeEvent
    }

    // create new player from input such as 192.168.178.35
    const player = new SonosDevice(config.playerHostname)
    player.LoadDeviceData()
    
    // for group action we always need the coordinator
    // the coordinator may change over the time
    // TODO How to maintain these changes
    // player.LoadDeviceData()
    //   .then(success => {
    //     // TODO extract the coordinator for given player
    //     console.log(JSON.stringify(success))
    //     console.log('coordinator>' + player.coordinator)
    //   })
    //   .catch(console.error)
    const coordinator = new SonosDevice('192.168.178.37') // Küche

    if (subscriptions.topology) {
      player.ZoneGroupTopologyService.Events.on(ServiceEvents.Data, data => { 
        node.send(
          [
            // TODO replace with name
            { payload: transformZoneData(data, '192.168.178.35'), topic: 'zoneGroup' }, 
            null,
            null
          ]
        )
      })
      this.status({ fill: 'green', shape: 'ring', text: 'connected' })
      node.log('subscribed to ZoneGroupTopology')
    }

    // group events - subscription to coordinator
    if (subscriptions.track) {
      coordinator.AVTransportService.Events.on(ServiceEvents.Data, data => {
        node.send(
          [
            null, 
            { payload: transformAvTransportData(data), topic: 'avTransport' },
            null
          ]
        )
      })
      this.status({ fill: 'green', shape: 'ring', text: 'connected' })
      node.log('subscribed to AVTransport')
    }
    if (subscriptions.groupMute || subscriptions.groupVolume) {
      coordinator.GroupRenderingControlService.Events.on(ServiceEvents.Data, data => {
        node.send(
          [
            null, 
            { payload: data, topic: 'groupRendering' },
            null
          ]
        )
      })
      this.status({ fill: 'green', shape: 'ring', text: 'connected' })
      node.log('subscribed to GroupMute/GroupVolume')
    }
    
    // // player events - subscribe to player
    if (subscriptions.volume) {
      player.Events.on(SonosEvents.Volume, mute => {
        node.send(
          [
            null,
            null,
            { payload: mute, topic: 'volume' },
          ]
        )
      })
      node.log('subscribed to Volume')
      node.status({ fill: 'green', shape: 'ring', text: 'connected' })
    }

    node.on('close', function (done) {
      cancelSubscriptions(player, coordinator, subscriptions, function () {
        done()
      })
        .then(() => {
          node.log('node-on-close ok.')
        })
        .catch(error => {
          node.log('node-on-close error>>'
            + JSON.stringify(error, Object.getOwnPropertyNames(error)))
        })
    })

  }

  RED.nodes.registerType('sonosevents-notify', sonosNotifyNode)

  async function cancelSubscriptions (player, coordinator, subscriptions, callback) {
    // topology: config.topologyEvent,
    // track: config.trackEvent,
    // groupMute: config.groupMuteEvent,
    // volume: config.volumeEvent

    if (subscriptions.topology) {
      await player.ZoneGroupTopologyService.Events.removeAllListeners(ServiceEvents.Data)
    }
    if (subscriptions.track) {
      await coordinator.AVTransportService.Events.removeAllListeners(ServiceEvents.Data) 
    }
    if (subscriptions.groupMute) {
      // eslint-disable-next-line max-len
      await coordinator.GroupRenderingControlService.Events.removeAllListeners(ServiceEvents.Data)
    }
    
    if (subscriptions.volume) {
      await player.RenderingControlService.Events.removeAllListeners(ServiceEvents.Data)
    }
    callback()
  }

  // Build API to auto detect IP Addresses
  RED.httpNode.get('/nrcse/searchDevices', function (req, response) {
      
    //TODO remove or complete 
    discoverAllPlayer()
      .then((success) => {
        response.json(success.ZoneGroupState.ZoneGroups.ZoneGroup)
        
        // response.json(
        //   [
        //     { 'label': 'Küche', 'value': '192.168.178.37' },
        //     { 'label': 'Wohnzimmer', 'value': '192.168.178.36' },
        //     { 'label': 'Bad', 'value': '192.168.178.35' }
        //   ]
        // )
      })
      .catch((error) => {
        // TODO use special strigify option
        debug(JSON.stringify(error))
      })
  })

  async function discoverAllPlayer () {
    // discover the first one an get all others because we need also the player names
    // and thats very reliable -determinstic. Discovering 10 player might be time consuming
    // Sonos player knews best the topology
    const deviceDiscovery = new SonosDeviceDiscovery()
    const firstPlayerData = await deviceDiscovery.SearchOne(1)
    const firstPlayer = new SonosDevice(firstPlayerData.host)
    const allZones = await firstPlayer.GetZoneGroupState()
    // TODO should also be async to return error codes
    const decoded = decodeHtml(allZones.ZoneGroupState)
    const attributeNamePrefix = '_'
    const options = { ignoreAttributes: false, attributeNamePrefix }
    // TODO we have to make single entries to array for groups and members!!!!!!!
    const finaldecoded = await parser.parse(decoded, options)
    //const finaldecoded = DecodeAndParseXml(allZones.ZoneGroupState)
    return finaldecoded
  }

}
