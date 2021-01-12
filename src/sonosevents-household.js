/**
 * This module handles all household related events.
 *
 * @module household
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-04
*/

'use strict'

const { improvedZoneData } = require('./Helper.js')
const { SonosDevice } = require('@svrooij/sonos/lib')
const debug = require('debug')('nrcse:household')

module.exports = function (RED) {

  /** Create event node notification based on configuration and send messages
   * @param  {object} config current node configuration data
  */
  
  function sonosEventsHouseHoldNode (config) {
    debug('method >>%s', 'sonosEventsHouseholdNode')
    RED.nodes.createNode(this, config)
   
    // clear node status, get data from dialog
    const node = this
    node.status({})

    const subscriptions = {
      zoneGroupTopologyRaw: config.zoneGroupTopologyRaw,
      allGroups: config.allGroups,
      alarmClockRaw: config.alarmClockRaw,
      contentDirectoryRaw: config.contentDirectoryRaw
    }

    // create new player from input such as 192.168.178.35
    const player = new SonosDevice(config.playerHostname)

    /// async wrapper, status and error handling
    asyncSubscribeToMultipleEvents(node, subscriptions, player)
      .then((success) => {
        node.status({ fill: 'green', shape: 'ring', text: 'connected' })
        node.debug(`success >>${JSON.stringify(success)}`)  
      })
      .catch((error) => {
        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' })
        node.debug(`error subscribe>>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
      })
  
    // unsubscribe to all, when node is deleted (redeployed does delete)
    node.on('close', function (done) {
      cancelAllSubscriptions(player, subscriptions)
        .then(() => {
          debug('nodeOnClose >>all subscriptions canceled')
          done()
        })
        .catch(error => {
          debug(`nodeOnClose error during cancel subscriptions >>
            ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
          done(error)
        })
    })

    return true
  }

  RED.nodes.registerType('sonosevents-household', sonosEventsHouseHoldNode)

}

async function asyncSubscribeToMultipleEvents (node, subscriptions, player) {

  let errorCount = 0 // global to calc all errors
  const msgMaster = [null, null, null, null, null, null, null, null]

  // bind events
  if (subscriptions.zoneGroupTopologyRaw || subscriptions.allGroups) {
    await player.ZoneGroupTopologyService.Events.on('serviceEvent', sendMsgZoneGroup)
    debug('subscribed to ZoneGroupTopologyService')
  }

  if (subscriptions.alarmClockRaw) {
    await player.AlarmClockService.Events.on('serviceEvent', sendMsgAlarmClock)
    debug('subscribed to AlarmClockService')
  }

  if (subscriptions.contentDirectoryRaw) {
    await player.ContentDirectoryService.Events.on('serviceEvent', sendMsgContentDirectory)
    debug('subscribed to ContentDirectoryService')
  }

  return true

  // .............. sendMsg functions ...............
  // only output to requested output lines, prepare data
  // uses global node  
  async function sendMsgZoneGroup (raw) {
    debug('new ZoneGroupTopologyService event')
    let payload = {}
    let topic = ''
    let msgIndex = 0
    try {
      const topicPrefix =  `household/${player.host}/zoneGroupTopology/`
      const improved = await improvedZoneData(raw)
      
      if (subscriptions.zoneGroupTopologyRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }        
        node.send(msg)
      }
      msgIndex++ 

      if (subscriptions.allGroups && improvedZoneData.allGroups !== null) {
        const msg = msgMaster.slice()
        payload = improved.allGroups
        topic = topicPrefix + 'allGroups'
        msg[msgIndex] = { payload, raw, topic }        
        node.send(msg)
      }
      msgIndex++ 
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing ZoneGroupTopology event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgAlarmClock (raw) {
    debug('new AlarmClockService event')
    let payload = {}
    let topic = ''
    let msgIndex = 4
    try {
      const topicPrefix = `household/${player.host}}/alarmClock/`
      
      if (subscriptions.avTransportRaw) {
        payload = raw
        topic = topicPrefix + 'raw'
        const msg = msgMaster.slice()
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AlarmClockService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgContentDirectory (raw) {
    debug('new ContentDirectoryService event >>')
    let payload = {}
    let topic = ''
    let msgIndex = 6
    try {
      const topicPrefix = `household/${player.host}/ContentDirectory/`
      
      if (subscriptions.contentDirectoryRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing ContentDirectoryService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
}

async function cancelAllSubscriptions (player) {

  // TODO check whether only for those with subscription or like this
  await player.ZoneGroupTopologyService.Events.removeAllListeners('serviceEvent')    
  await player.AlarmClockService.Events.removeAllListeners('serviceEvent')
  await player.ContentDirectoryService.Events.removeAllListeners('serviceEvent')

}
