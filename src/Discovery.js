/**
 * Collection of methods to handle the discovery of player. 
 * Method: UDP SSD broadcast port 1900.
 * Part of SONOS-plus.
 *
 * @module Discovery
 * 
 * @author Henning Klages
 * 
 * @since 2023-01-05
 * 
*/

'use strict'
const { PACKAGE_PREFIX } = require('./Globals.js')

const { getGroupsAll: getGroupsAll } = require('./Commands.js')

const { SonosDevice } = require('@svrooij/sonos/lib')
const SonosPlayerDiscovery   = require('./Discovery-base-hk.js')

const debug = require('debug')(`${PACKAGE_PREFIX}discovery`)

module.exports = {
  
  // copy from SONOS-plus 2023-01-05

  /** Does an async discovery of SONOS player and returns list of objects
   * with properties label and value including the IP address = host.
   * 
   * 
   * @returns {Promise<object>} {'label', value}
   * 
   * @throws {error} all methods
   * 
   * Hint: discover the first one and retrieves all other player from that player.
   * Thats very reliable -deterministic. 
   * Discovering 10 player or more might be time consuming in some networks.
   */
  discoverAllPlayerWithHost: async () => {
    debug('method:%s', 'discoverAllPlayerWithHost')
    
    const deviceDiscovery = new SonosPlayerDiscovery()
    const firstPlayerIpv4 = await deviceDiscovery.discoverOnePlayer()
    debug('first player found')
    const firstPlayer = new SonosDevice(firstPlayerIpv4)
    const allGroups = await getGroupsAll(firstPlayer)
    const flatList = [].concat.apply([], allGroups)
    debug('got more players, in total >>%s', flatList.length)

    const reducedList = flatList.map((item) => {
      return {
        'label': `${item.urlObject.hostname} for ${item.playerName}`,
        'value': item.urlObject.hostname
      }
    })
    return reducedList
  }
    
}