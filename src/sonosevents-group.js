/* eslint-disable max-len */
'use strict'

/**
 * This module handles all group related events.
 *
 * @module group
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
*/

const { betterAvTransportData, betterGroupRenderingData, isValidProperty, } = require('./Helper.js')

const { SonosDevice } = require('@svrooij/sonos/lib')

const debug = require('debug')('nrcse:group')

module.exports = function (RED) {

  /** Create event node notification based on configuration and send messages
   * @param  {object} config current node configuration data
   */
  function sonosEventsGroupsNode (config) {
    debug('method >>%s', 'sonosEventsGroupNode')
    RED.nodes.createNode(this, config)
   
    // clear node status, get data from dialog
    const node = this
    node.status({})

    const subscriptions = {
      content: config.content,
      contentCategory: config.contentCategory,
      playbackstate: config.playbackstate,
      groupMuteState: config.groupMuteState,
      groupVolume: config.groupVolume,
      ignoreTransition: config.ignoreTransition,
      ignoreZpstr: config.ignoreZpstr
    }

    // create new player from input such as 192.168.178.37
    const coordinator = new SonosDevice(config.playerHostname)

    //TODO in dialog should be mentioned that coordinator!

    // async wrapper, status and error handling
    asyncOnEvent(node, subscriptions, coordinator)
      .then((success) => { // success, when handler is successfully established
        node.status({ fill: 'green', shape: 'ring', text: 'connected' })
        node.debug(`success >>${JSON.stringify(success)}`)  
      })
      .catch((error) => {
        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' })
        node.debug(`error >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
      })
 
    // we need to unsubscribe, when node is deleted or redeployed
    node.on('close', function (done) {
      cancelAllSubscriptions(coordinator, subscriptions)
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

  RED.nodes.registerType('sonosevents-group', sonosEventsGroupsNode)

  //
  //                                      Subscriptions
  // .......................................................................................

  async function asyncOnEvent (node, subscriptions, coordinator) {
    
    // TODO verify that node.done() makes sense
    if (subscriptions.content  || subscriptions.contentCategory || subscriptions.playbackstate) {
      coordinator.AVTransportService.Events.on('serviceEvent', (raw) => {
        debug('new AVTransportService arrived')
        
        // Check playback state TRANSITION
        if (isValidProperty(raw, ['TransportState'])) {
          if (raw.TransportState === 'TRANSITIONING' && subscriptions.ignoreTransition) {
            debug('no output send as TRANSITION detected') 
            return true
          }  
        }
      
        //Check Album, title Artist ZPSTR string
        ['Title', 'Album', 'Artist'].forEach(topic => {
          let item
          if (isValidProperty(raw, ['CurrentTrackMetaData', topic])) {
            item = raw.CurrentTrackMetaData[topic]
            if (typeof item === 'string' & item.startsWith('ZPSTR_')) {
              debug('no output send as ZPSTR_ detected in >>>%s', topic) 
              return true
            }  
          }
        })

        if (subscriptions.content) {
          const msg = [null, null]
          // eslint-disable-next-line max-len
          msg[0] = { 'payload': betterAvTransportData(raw).content, raw, 'topic': `group/${coordinator.host}/avTransport/content`, 'properties': Object.keys(raw) }
          node.send(msg)
        }
        if (subscriptions.contentCategory && betterAvTransportData(raw).contentCategory) {
          const msg = [null, null]
          msg[0] = { 'payload': betterAvTransportData(raw).contentCategory, raw, 'topic': `group/${coordinator.host}/avTransport/contentCategory` }
          node.send(msg)   
        }
        if (subscriptions.playbackstate) {
          const msg = [null, null]
          // eslint-disable-next-line max-len
          msg[0] = { 'payload': betterAvTransportData(raw).playbackstate, raw, 'topic': `group/${coordinator.host}/avTransport/playbackstate` }
          node.send(msg)
        }
      })
      debug('subscribed to AVTransportService')  
    }

    if (subscriptions.groupVolume || subscriptions.groupVolume) {
      coordinator.GroupRenderingControlService.Events.on('serviceEvent', (raw) => {
        debug('new GroupRenderingControlService arrived')
        if (subscriptions.groupMuteState) {
          const msg = [null, null]
          // eslint-disable-next-line max-len
          msg[1] = { 'payload': betterGroupRenderingData(raw).groupVolume, raw, 'topic': `group/${coordinator.host}/groupRenderingControl/groupVolume` }
          node.send(msg)  
        }
        if (subscriptions.groupVolume) {
          const msg = [null, null]
          // eslint-disable-next-line max-len
          msg[1] = { 'payload': betterGroupRenderingData(raw).groupMuteState, raw, 'topic': `group/${coordinator.host}/groupRenderingControl/groupMuteState` }
          node.send(msg)  
        }
      })
      debug('subscribed to GroupRenderingControlService')
    }
    return true
  }

  async function cancelAllSubscriptions (coordinator) {
    
    // TODO verify that it is OK to cancel all although there might not be a subscription
    await coordinator.AVTransportService.Events.removeAllListeners('serviceEvent')
    await coordinator.GroupRenderingControlService.Events.removeAllListeners('serviceEvent')

  }
}
