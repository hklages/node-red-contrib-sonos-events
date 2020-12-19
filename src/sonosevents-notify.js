const { SonosEvents } = require('@svrooij/sonos/lib')
const SonosDevice = require('@svrooij/sonos').SonosDevice
const ServiceEvents = require('@svrooij/sonos').ServiceEvents

module.exports = function (RED) {
  'use strict'

  /** Create event node base on configuration and send messages
   * @param  {object} config current node configuration data
   */
  function SonosNotifyNode (config) {
  
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

    // create new player from input such as 192.168.178.35 -Küche 
    const playerHostname = config.playerHostname.split('::')[0]
    const player = new SonosDevice(playerHostname)
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
    const coordinator = new SonosDevice('192.168.178.37') 
    
    // Household events - subscription to player
    if (subscriptions.topology) {
      player.ZoneGroupTopologyService.Events.on(ServiceEvents.Data, data => { 
        node.send(
          [
            { payload: data, topic: 'zoneGroup' }, 
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
            { payload: data, topic: 'avTransport' },
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

  RED.nodes.registerType('sonosevents-notify', SonosNotifyNode)

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
}
