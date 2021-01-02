'use strict'

/**
 * This module handles all household related events.
 *
 * @module household
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
*/

const { SonosDevice } = require('@svrooij/sonos/lib')

const { betterZoneData } = require('./Helper.js')

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
    asyncOnEvent(node, subscriptions, player)
      .then((success) => {
        node.status({ fill: 'green', shape: 'ring', text: 'connected' })
        node.debug(`success >>${JSON.stringify(success)}`)  
      })
      .catch((error) => {
        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' })
        node.debug(`error >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
      })
  
    // we need to unsubscribe, when node is deleted or redeployed
    node.on('close', function (done) {
      cancelAllSubscriptions(player, subscriptions)
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
  RED.nodes.registerType('sonosevents-household', sonosEventsHouseHoldNode)

  //
  //                                      Subscriptions
  // .......................................................................................
  async function asyncOnEvent (node, subscriptions, player) {
    
    // TODO ERROR HANDLING

    // ZoneGroupTopologyService
    if (subscriptions.topology) {
      player.ZoneGroupTopologyService.Events.on('serviceEvent', (raw) => {
        debug('new ZoneGroupTopologyService event >>', JSON.stringify(raw))
        const msg = [null, null, null, null, null]
        msg[0] = {
          'payload': betterZoneData(raw, player.host), raw,
          'topic': `household/${player.host}/zoneGroupTopology/topology`
        }        
        node.send(msg)
      })
      debug('subscribed to ZoneGroupTopologyService')
    }

    // AlarmClockService
    if (subscriptions.alarmList) {
      player.AlarmClockService.Events.on('serviceEvent', (raw) => {
        debug('new AlarmClockService event >>', JSON.stringify(raw))
        const msg = [null, null, null, null, null]
        msg[1] = {
          'payload': raw,
          'topic': `household/${player.host}/alarmClock/alarmList`
        }
        node.send(msg)
      })
      debug('subscribed to AlarmClockService')

      player.AlarmClockService.Events.on('error', (error) => {
        // eslint-disable-next-line max-len
        debug('error AlarmClockService on >>', JSON.stringify(error, Object.getOwnPropertyNames(error)))
      })

      player.AlarmClockService.Events.on('error', (error) => {
        // eslint-disable-next-line max-len
        debug('error AlarmClockService on >>', JSON.stringify(error, Object.getOwnPropertyNames(error)))
      })
    }

    // ContentDirectoryService
    if (subscriptions.contentMySonos
      || subscriptions.contentMusicLibrary
      || subscriptions.contentSonosPlaylists) {
      player.ContentDirectoryService.Events.on('serviceEvent', raw => {
        debug('new ContentDirectoryService event >>', JSON.stringify(raw))
        if (raw.FavoritesUpdateID && subscriptions.contentMySonos) {
          const msg = [null, null, null, null, null]
          msg[2] = {
            'payload': raw.FavoritesUpdateID, raw,
            'topic': `household/${player.host}/ContentDirectory/contentMySonos`
          }
          node.send(msg)
        }
        if (raw.ShareListUpdateID && subscriptions.contentMusicLibrary) {
          const msg = [null, null, null, null, null]
          msg[3] = {
            'payload': raw.ShareListUpdateID, raw,
            'topic': `household/${player.host}/ContentDirectory/contentMusicLibrary`
          }
          node.send(msg)
        }
        if (raw.SavedQueuesUpdateID && subscriptions.contentSonosPlaylists) {
          const msg = [null, null, null, null, null]
          msg[4] = {
            'payload': raw.SavedQueuesUpdateID, raw,
            'topic': `household/${player.host}/ContentDirectory/contentSonosPlaylists`
          }
          node.send(msg)
        }
        
      })
      debug('subscribed to ContentDirectoryService')

      player.ContentDirectoryService.Events.on('error', (error) => {
        // eslint-disable-next-line max-len
        debug('error ContentDirectoryService on >>', JSON.stringify(error, Object.getOwnPropertyNames(error)))
      })
    }
  
    return true
  }

  async function cancelAllSubscriptions (player) {

    // TODO check whether only for those with subscription or like this
    await player.ZoneGroupTopologyService.Events.removeAllListeners('serviceEvent')    
    await player.AlarmClockService.Events.removeAllListeners('serviceEvent')
    await player.ContentDirectoryService.Events.removeAllListeners('serviceEvent')

  }
}
