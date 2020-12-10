module.exports = function (RED) {
  'use strict'

  let node = {} // used for sending node.error, node.debug

  function SonosEventNode (config) {
    RED.nodes.createNode(this, config)

    node = this
    node.ipaddress = config.ipaddress
  }

  RED.nodes.registerType('sonosevents-config', SonosEventNode)
}