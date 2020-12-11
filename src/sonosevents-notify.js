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

    const configNode = RED.nodes.getNode(config.confignode)    
    const player = new SonosDevice(configNode.ipaddress)
    console.log(`ip address: ${configNode.ipaddress}`)
    
    player.AVTransportService.Events.on(ServiceEvents.Data, data => {
      node.send({ payload: data, topic: 'AVTransport' })
    })

    player.Events.on(SonosEvents.Mute, mute => {
      node.send({ payload: mute, topic: 'mute' })
    })
  }

  RED.nodes.registerType('sonosevents-notify', SonosNotifyNode)
}
