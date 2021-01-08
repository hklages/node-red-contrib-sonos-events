/**
 * Routines for Discovery
 *
 * @module Discovery
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
*/

'use strict'

const { getGroupsAllFast } = require('./Sonos-Commands.js')

const { SonosDeviceDiscovery, SonosDevice } = require('@svrooij/sonos/lib')

const debug = require('debug')('nrcse:Discovery')

module.exports = {

  discoverAllPlayer: async () => {
    // discover the first one an get all others because we need also the player names
    // and thats very reliable -deterministic. Discovering 10 player might be time consuming
    // Sonos player knew best the topology
    const deviceDiscovery = new SonosDeviceDiscovery()
    debug('starting discovery')
    const firstPlayerData = await deviceDiscovery.SearchOne(5)
    debug('first player found')
    const firstPlayer = new SonosDevice(firstPlayerData.host)
    const allGroups = await getGroupsAllFast(firstPlayer)

    const flatList = [].concat.apply([], allGroups)
    debug('got more players, in total >>%s', flatList.length)
    const reducedList = flatList.map((item) => {
      return {
        'label': item.playerName,
        'value': item.url.hostname
      }
    })
    return reducedList
  },

  discoverAllCoordinators: async function () {
    // discover the first one an get all coordinators
    // and thats very reliable -deterministic. Discovering 10 player might be time consuming
    // Sonos player knew best the topology
    const deviceDiscovery = new SonosDeviceDiscovery()
    const firstPlayerData = await deviceDiscovery.SearchOne(5)
    debug('first player found')
    const firstPlayer = new SonosDevice(firstPlayerData.host)
    const allGroups = await getGroupsAllFast(firstPlayer)
    const coordinatorArray = allGroups.map((group) => {
      return group[0]
    })
    const reducedList = coordinatorArray.map((item) => {
      return {
        'label': item.playerName,
        'value': item.url.hostname
      }
    })
    return reducedList
  }
} 