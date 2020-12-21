'use strict'

const debug = require('debug')('nrcse:config')

module.exports = function (RED) {

  let node = {} // used for sending node.error, node.debug

  function sonosEventNode (config) {
    debug('method >>%s', 'sonosEventNode')
    RED.nodes.createNode(this, config)

    node = this
    node.listenerHostname = config.listenerHostname
    node.listenerPort = config.listenerPort

    // set env variable - if changed, needs a restart!
    process.env.SONOS_LISTENER_HOST = node.listenerHostname
    process.env.SONOS_LISTENER_PORT = node.listenerPort

    // TODO this is not working - maybe because node.JS is already started!
    process.env.DEBUG = 'nrcse:*'
  }

  RED.nodes.registerType('sonosevents-config', sonosEventNode)
}