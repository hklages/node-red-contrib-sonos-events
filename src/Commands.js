/**
 * Collection of SONOS commands.
 *
 * @module Commands
 * 
 * @author Henning Klages
 * 
 * extracted from sonos-plus
*/

'use strict'

const { PACKAGE_PREFIX } = require('./Globals.js')

const { parseZoneGroupToArray
} = require('./Extensions.js')

const {  isTruthyProperty, 
} = require('./Helper.js')

const debug = require('debug')(`${PACKAGE_PREFIX}:commands`)

module.exports = {

  /** Get array of all groups. Each group consist of an array of players <playerGroupData>[]
   * Coordinator is always in position 0. Group array may have size 1 (standalone)
   * @param {object} player sonos-ts player
   * @param {boolean} removeHidden removes all hidden players  
   * 
   * @returns {promise<playerGroupData[]>} array of arrays with playerGroupData
   *          First group member is coordinator
   *
   * @throws {error} 'property ZoneGroupState is missing'
   * @throws {error} all methods
   */
  getGroupsAll: async (anyTsPlayer, removeHidden) => {
    debug('method:%s', 'getGroupsAll')
  
    // Get all groups
    const householdGroups = await anyTsPlayer.ZoneGroupTopologyService.GetZoneGroupState({})   
    if (!isTruthyProperty(householdGroups, ['ZoneGroupState'])) {
      throw new Error(`${PACKAGE_PREFIX} property ZoneGroupState is missing`)
    }
  
    return await parseZoneGroupToArray(householdGroups.ZoneGroupState, removeHidden) 
  }
} 