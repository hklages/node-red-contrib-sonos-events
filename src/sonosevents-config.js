module.exports = function (RED) {
  'use strict'

  let node = {} // used for sending node.error, node.debug

  function SonosEventNode (config) {
    RED.nodes.createNode(this, config)

    node = this
    node.listenerHostname = config.listenerHostname
    node.listenerPort = config.listenerPort
  }

  RED.nodes.registerType('sonosevents-config', SonosEventNode)
}