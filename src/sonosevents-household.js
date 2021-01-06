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
      topology: config.topology,
      alarmList: config.alarmList,
      contentMySonos: config.contentMySonos,
      contentMusicLibrary: config.contentMusicLibrary,
      contentSonosPlaylists: config.contentSonosPlaylists
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
  if (subscriptions.topology) {
    await player.ZoneGroupTopologyService.Events.on('serviceEvent', sendMsgZoneGroup)
    debug('subscribed to ZoneGroupTopologyService')
  }
  if (subscriptions.alarmList) {
    await player.AlarmClockService.Events.on('serviceEvent', sendMsgAlarmClock)
    debug('subscribed to AlarmClockService')
  }
  if (subscriptions.contentMySonos
    || subscriptions.contentMusicLibrary
    || subscriptions.contentSonosPlaylists) {
    await player.ContentDirectoryService.Events.on('serviceEvent', sendMsgContentDirectory)
    debug('subscribed to ContentDirectoryService')
  }

  return true

  // .............. sendMsg functions ...............
  async function sendMsgZoneGroup (raw) {
    try {
      debug('new ZoneGroupTopologyService event >>', JSON.stringify(raw))
      const payload = await improvedZoneData(raw, player.host)
      const topic =  `household/${player.host}/zoneGroupTopology/topology`
      const msg = msgMaster.slice()
      msg[0] = { payload, raw, topic }        
      node.send(msg)
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing ZoneGroupTopology event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgAlarmClock (raw) {
    try {
      debug('new AlarmClockService event >>', JSON.stringify(raw))
      const alarms = await player.AlarmClockService.ListAndParseAlarms()
      const payload = raw
      const topic = `household/${player.host}/alarmClock/alarmList`
      const msg = msgMaster.slice()
      msg[1] = { payload, alarms, topic }
      node.send(msg)  
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AlarmClockService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgContentDirectory (raw) {
    let payload
    let topic
    try {
      debug('new ContentDirectoryService event >>', JSON.stringify(raw))
      const topicPrefix = `household/${player.host}/ContentDirectory/`
      if (raw.FavoritesUpdateID && subscriptions.contentMySonos) {
        const msg = msgMaster.slice()
        // TODO check existence
        payload = raw.FavoritesUpdateID
        topic = topicPrefix + 'contentMySonos'
        msg[2] = { payload, raw, topic }
        node.send(msg)
      }
      if (raw.ShareListUpdateID && subscriptions.contentMusicLibrary) {
        const msg = msgMaster.slice()
        payload = raw.ShareListUpdateID
        topic = topicPrefix + 'contentMusicLibrary'
        msg[3] = { payload, raw, topic }
        node.send(msg)
      }
      if (raw.SavedQueuesUpdateID && subscriptions.contentSonosPlaylists) {
        const msg = msgMaster.slice()
        payload = raw.SavedQueuesUpdateID
        topic = topicPrefix + 'contentSonosPlaylists'
        msg[4] = { payload, raw, topic }
        node.send(msg)
      }
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
