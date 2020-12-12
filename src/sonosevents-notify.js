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
   
    const node = this
   
    // clear node status
    node.status({})

    // create new player from input such as 192.168.178.35 -Küche 
    const playerHostname = config.playerHostname.split('::')[0]

    const player = new SonosDevice(playerHostname)
    const coordinator = new SonosDevice('192.168.178.37')
    
    // player.GetZoneGroupState()
    //   .then(success => {
    //     console.log(success.ZoneGroupState.ZoneGroups.ZoneGroup)
    //   })
    //   .catch(console.error)

    // household events - Zone
    player.ZoneGroupTopologyService.Events.on(ServiceEvents.Data, data => { 
      node.send(
        [
          { payload: data, topic: 'ZoneGroup' }, 
          null,
          null
        ]
      )
    })

    // group events - groupMute groupVolume but als AVTransport
    coordinator.AVTransportService.Events.on(ServiceEvents.Data, data => {
      node.send(
        [
          null, 
          { payload: data, topic: 'AVTransport' },
          null
        ]
      )
    })

    // player events - volume, mute
    player.Events.on(SonosEvents.Mute, mute => {
      node.send(
        [
          null,
          null,
          { payload: mute, topic: 'mute' },
        ]
      )
    })

    player.AVTransportService.Events.on(ServiceEvents.Data, data => {
      node.send(
        [
          null, 
          null,
          { payload: data, topic: 'AVTransport' }
        ]
      )
    })

  }

  RED.nodes.registerType('sonosevents-notify', SonosNotifyNode)
}
