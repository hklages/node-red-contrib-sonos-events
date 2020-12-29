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
const ServiceEvent  = require('@svrooij/sonos').ServiceEvents
const SonosDeviceDiscovery = require('@svrooij/sonos').SonosDeviceDiscovery

// TODO shall I use that - did not work
// const { DecodeAndParseXml } = require('@svrooij/sonos/lib/helpers/xml-helper')

const { transformAvTransportData, transformZoneData,
} = require('./Helper.js')

const { getGroupsAllFast, extractGroup
} = require('./Sonos-Commands.js')

const debug = require('debug')('nrcse:notifiy')

module.exports = function (RED) {

  /** Create event node notification based on configuration and send messages
   * @param  {object} config current node configuration data
   */
  function sonosEventsNotifyNode (config) {
    debug('method >>%s', 'sonosEventsNotifyNode')
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
    manageSubscriptionsAndEmit(node, subscriptions, player)
      .then((success) => {
        debug('success >>%s', JSON.stringify(success))  
        node.status({ fill: 'green', shape: 'ring', text: 'connected' })
      })
      .catch((error) => {
        node.status({ fill: 'red', shape: 'ring', text: 'not connected' })
        node.debug('error >>' + JSON.stringify(error, Object.getOwnPropertyNames(error)))
      })

  }
  RED.nodes.registerType('sonosevents-notify', sonosEventsNotifyNode)

  async function manageSubscriptionsAndEmit (node, subscriptions, player) {
    
    const allGroups = await getGroupsAllFast(player) 
    const  playersGroup = await extractGroup(player.host, allGroups) 
    const coordinatorUrl = playersGroup.members[playersGroup.coordinatorIndex].url

    // will be kept current!
    let coordinator = new SonosDevice(coordinatorUrl.hostname)
    let groupMemberNames = playersGroup.members.map((member) => {
      return member.playerName
    })
    debug('Group members >>%s', JSON.stringify(groupMemberNames))
    debug('Initial coordinatorUrl >>%s', coordinator.host)

    // household events - subscribe to player
    player.ZoneGroupTopologyService.Events.on(ServiceEvent.Data, data => { 
      debug('zone group received %s', subscriptions.topology)
      const transformed = transformZoneData(data, player.host)
      if (subscriptions.topology) {  
        node.send(
          [
            // eslint-disable-next-line max-len
            { 'payload': transformed, 'topic': 'household/ZoneGroupTopologyService' }, 
            null,
            null
          ]
        )  
      }

      // act if coordinator is different
      if (transformed.groupMemberNames[0] !== groupMemberNames[0]) {
        // new coordinator
        debug('new coordinator - modify group subscriptions >>%s', transformed.coordinatorHostname)
        coordinator = new SonosDevice(transformed.coordinatorHostname)
        groupMemberNames = transformed.groupMemberNames.slice()
        debug('new group name array >>%s', JSON.stringify(groupMemberNames))
        //cancelGroupSubscriptions()
        //  .then()
        //  .catch()

        // implementGroupSubscriptions()
        //   .then()
        //   .catch()
      }
    })
    debug('subscribed to ZoneGroupTopology')

    player.AlarmClockService.Events.on(ServiceEvent.data, data => {
      debug('alarm service received')
      node.send(
        [
          // eslint-disable-next-line max-len
          { 'payload': data, 'topic': 'household/AlarmClockService' }, 
          null,
          null
        ]
      )  
    })

    player.ContentDirectoryService.Events.on(ServiceEvent.Data, data => {
      debug('content directory service received')
      node.send(
        [
          // eslint-disable-next-line max-len
          { 'payload': data, 'topic': 'household/ContentDirectoryService' }, 
          null,
          null
        ]
      )  
    })

    // group events - subscribe coordinator
    await implementGroupSubscriptions(node, coordinator, subscriptions, groupMemberNames)

    // player events - subscribe to player
    if (subscriptions.volume) {
      player.Events.on(SonosEvents.Volume, mute => {
        node.send(
          [
            null,
            null,
            { 'payload': mute, 'topic': `player/${player.host}/volume` },
          ]
        )
      })
      debug('subscribed to Volume')
    }
    
    node.on('close', function (done) {
      cancelAllSubscriptions(player, coordinator, subscriptions, function () {
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

    return true
  }
  async function implementGroupSubscriptions (node, coordinator, subscriptions, groupMemberNames) {
    if (subscriptions.track) {
      coordinator.AVTransportService.Events.on(ServiceEvent.data, data => {
        node.send(
          [
            null, 
            // eslint-disable-next-line max-len
            { 'payload': transformAvTransportData(data), 'topic': `groups/${coordinator.host}/AVTransportService`, groupMemberNames },
            null
          ]
        )
      })
      debug('subscribed to group.AVTransport')
    }

    if (subscriptions.groupMute || subscriptions.groupVolume) {
      coordinator.GroupRenderingControlService.Events.on(ServiceEvent.Data, data => {
        node.send(
          [
            null, 
            // eslint-disable-next-line max-len
            { 'payload': data, 'topic': `groups/${coordinator.host}/GroupRenderingControlService`, groupMemberNames },
            null
          ]
        )
      })
      debug('subscribed to group.GroupRenderingControlSerivice')
    }
  }

  async function cancelAllSubscriptions (player, coordinator, subscriptions, callback) {
    // topology: config.topologyEvent,

    // track: config.trackEvent,
    // groupMute: config.groupMuteEvent,
    
    // volume: config.volumeEvent

    if (subscriptions.topology) {
      await player.ZoneGroupTopologyService.Events.removeAllListeners(ServiceEvent.Data)
    }
    
    await cancelGroupSubscriptions(coordinator, subscriptions)
    
    if (subscriptions.volume) {
      await player.RenderingControlService.Events.removeAllListeners(ServiceEvent.Data)
    }
    callback()
  }

  async function cancelGroupSubscriptions (coordinator, subscriptions) {
    if (subscriptions.track) {
      await coordinator.AVTransportService.Events.removeAllListeners(ServiceEvent.Data) 
    }
    // Caution: if there is another node wit a player in the same group that is also canceled
    if (subscriptions.groupMute || subscriptions.groupVolume) {
      // eslint-disable-next-line max-len
      await coordinator.GroupRenderingControlService.Events.removeAllListeners(ServiceEvent.Data)
    }
  }

  // API to get list of available players
  RED.httpNode.get('/nrcse/searchDevices', function (req, response) {
      
    discoverAllPlayer()
      .then((playerList) => {
        response.json(playerList)
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
    const allGroups = await getGroupsAllFast(firstPlayer)
    const flatList = [].concat.apply([], allGroups)
    const reducedList = flatList.map((item) => {
      return {
        'label': item.playerName,
        'value': item.url.hostname
      }
    })
    return reducedList
  }
}
