/**
 * Collection of SONOS commands.
 *
 * @module Commands
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
*/

'use strict'

const PACKAGE_PREFIX = 'nrcse: '

const { isTruthyStringNotEmpty, isTruthy, isTruthyProperty, decodeHtmlEntity,
} = require('./Helper.js')

const parser = require('fast-xml-parser')

const debug = require('debug')('nrcse:Sonos-Commands')

module.exports = {

  /** Get array of all groups. Each group consist of an array of players <playerGroupData>[]  
   * Coordinator is always in position 0. Group array may have size 1 (standalone)
   * @param  {object} player sonos-ts player
   * 
   * @returns {promise<playerGroupData[]>} array of arrays with playerGroupData
   *          First group member is coordinator.
   *
   * @throws {error} GetZoneGroupState
   * @throws {error} 
   */
  getGroupsAllFast: async function (anyPlayer) {
    debug('method >>%s', 'getGroupsAllFast')
    
    // get the data from SONOS player and transform to JavaScript Objects
    const householdPlayers = await anyPlayer.GetZoneGroupState()
    
    // select only ZoneGroupState not the other attributes and check
    if (!isTruthyProperty(householdPlayers, ['ZoneGroupState'])) {
      throw new Error(`${PACKAGE_PREFIX} property ZoneGroupState is missing`)
    }
    const decoded = await decodeHtmlEntity(householdPlayers.ZoneGroupState)
    const attributeNamePrefix = '_'
    const options = { ignoreAttributes: false, attributeNamePrefix }
    const groups = await parser.parse(decoded, options) 
    if (!isTruthy(groups)) {
      throw new Error(`${PACKAGE_PREFIX} response form parse xml is invalid.`)
    }
    if (!isTruthyProperty(groups, ['ZoneGroupState', 'ZoneGroups', 'ZoneGroup'])) {
      throw new Error(`${PACKAGE_PREFIX} response form parse xml: properties missing.`)
    }

    // convert single item to array: all groups array and all members array
    let groupsArray
    if (Array.isArray(groups.ZoneGroupState.ZoneGroups.ZoneGroup)) {
      groupsArray = groups.ZoneGroupState.ZoneGroups.ZoneGroup.slice()
    } else {
      groupsArray = [groups.ZoneGroupState.ZoneGroups.ZoneGroup] //convert to single item array
    }
    groupsArray = groupsArray.map(group => {
      if (!Array.isArray(group.ZoneGroupMember)) group.ZoneGroupMember = [group.ZoneGroupMember]
      return group
    })
    // result is groupsArray is array<groupDataRaw> and always arrays (not single item)

    // sort all groups that coordinator is in position 0 and select properties
    // see typeDef playerGroupData
    const groupsArraySorted = [] // result to be returned
    let groupSorted // keeps the group members, now sorted
    let coordinatorUuid = ''
    let groupId = ''
    let playerName = ''
    let uuid = ''
    let invisible = ''
    let channelMapSet = ''
    let url // type URL JavaScript build in
    for (let iGroup = 0; iGroup < groupsArray.length; iGroup++) {
      groupSorted = []
      coordinatorUuid = groupsArray[iGroup]._Coordinator
      groupId = groupsArray[iGroup]._ID
      // first push coordinator, other properties will be updated later!
      groupSorted.push({ groupId, 'uuid': coordinatorUuid })
      
      for (let iMember = 0; iMember < groupsArray[iGroup].ZoneGroupMember.length; iMember++) {
        url = new URL(groupsArray[iGroup].ZoneGroupMember[iMember]._Location)
        url.pathname = '' // clean up
        uuid = groupsArray[iGroup].ZoneGroupMember[iMember]._UUID  
        // my naming is playerName instead of the SONOS ZoneName
        playerName = groupsArray[iGroup].ZoneGroupMember[iMember]._ZoneName
        invisible = (groupsArray[iGroup].ZoneGroupMember[iMember]._Invisible === '1')
        channelMapSet = groupsArray[iGroup].ZoneGroupMember[iMember]._ChannelMapSet || ''      
        if (groupsArray[iGroup].ZoneGroupMember[iMember]._UUID !== coordinatorUuid) {
          // push new except coordinator
          groupSorted.push({ url, playerName, uuid, groupId, invisible, channelMapSet })
        } else {
          // update coordinator on position 0 with name
          groupSorted[0].url = url
          groupSorted[0].playerName = playerName
          groupSorted[0].invisible = invisible
          groupSorted[0].channelMapSet = channelMapSet
        }
      }
      groupSorted = groupSorted.filter((member) => member.invisible === false)
      groupsArraySorted.push(groupSorted)
    }
    return groupsArraySorted 
  },

  /** Extract group for a given player.
   * @param {string} playerUrlHostname hostname such as 192.168.178.37
   * @param {object} groupData from getGroupsAll
   * @param {string} [playerName = playerUrlHostname] SONOS-Playername such as Kitchen 
   * 
   * @returns {promise<members[]>}  first group member is coordinator. 
   *
   * @throws {error} 
   */
  extractGroup: async function (playerUrlHostname, allGroupsData, playerName) {
    debug('method >>%s', 'getGroup')
    
    const searchByPlayerName = isTruthyStringNotEmpty(playerName)

    // find player in group bei playerName or playerUrlOrigin
    // find our players group in all groups- either by name or hostname
    let foundGroupIndex = -1 // indicator for player NOT found
    let visible
    let groupId
    let usedPlayerHostname = ''
    for (let iGroup = 0; iGroup < allGroupsData.length; iGroup++) {
      for (let iMember = 0; iMember < allGroupsData[iGroup].length; iMember++) {
        visible = !allGroupsData[iGroup][iMember].invisible
        groupId = allGroupsData[iGroup][iMember].groupId
        if (searchByPlayerName) {
          // we compare playerName (string) such as Küche
          if (allGroupsData[iGroup][iMember].playerName === playerName && visible) {
            foundGroupIndex = iGroup
            usedPlayerHostname = allGroupsData[iGroup][iMember].url.hostname
            break // inner loop
          }
        } else {
          // we compare by URL.hostname such as '192.168.178.35'
          if (allGroupsData[iGroup][iMember].url.hostname
            === playerUrlHostname && visible) {
            foundGroupIndex = iGroup
            usedPlayerHostname = allGroupsData[iGroup][iMember].url.hostname
            break // inner loop
          }
        }
      }
      if (foundGroupIndex >= 0) {
        break // break also outer loop
      }
    }
    if (foundGroupIndex === -1) {
      throw new Error(`${PACKAGE_PREFIX} could not find given player in any group`)
    }
    
    // remove all invisible players player (in stereopair there is one invisible)
    const members = allGroupsData[foundGroupIndex].filter((member) => (member.invisible === false))

    // find our player index in that group. At this position because we did filter!
    // that helps to figure out role: coordinator, joiner, independent
    const playerIndex = members.findIndex((member) => (member.url.hostname === usedPlayerHostname))

    return {
      groupId,
      playerIndex,
      'coordinatorIndex': 0,
      members
    }
  }
} 