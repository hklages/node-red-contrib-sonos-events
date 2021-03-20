/**
 * Collection of SONOS commands.
 *
 * @module Commands
 * 
 * @author Henning Klages
 * 
 * @since 2021-03-04
 * 
 * extracted from sonos-plus
*/

'use strict'

const { PACKAGE_PREFIX } = require('./Globals.js')

const { parseZoneGroupToArray
} = require('./Extensions.js')

const { isTruthyStringNotEmpty,  isTruthyProperty, decodeHtmlEntity, 
} = require('./Helper.js')

const parser = require('fast-xml-parser')

const debug = require('debug')(`${PACKAGE_PREFIX}:commands`)

module.exports = {

  /** Get array of all groups. Each group consist of an array of players <playerGroupData>[]
   * Coordinator is always in position 0. Group array may have size 1 (standalone)
   * @param {object} player sonos-ts player
   * 
   * @returns {promise<playerGroupData[]>} array of arrays with playerGroupData
   *          First group member is coordinator.
   *
   * @throws {error} 'property ZoneGroupState is missing', 'response form parse xml is invalid'
   * @throws {error} all methods
   * 
   */
  getGroupsAll: async (anyTsPlayer) => {
    debug('method:%s', 'getGroupsAll')
    
    // get all groups
    const householdGroups = await anyTsPlayer.ZoneGroupTopologyService.GetZoneGroupState({})   
    if (!isTruthyProperty(householdGroups, ['ZoneGroupState'])) {
      throw new Error(`${PACKAGE_PREFIX} property ZoneGroupState is missing`)
    }
    
    return await parseZoneGroupToArray(householdGroups.ZoneGroupState) 
  },

  /** Extract group for a given player. playerName - if isTruthyStringNotEmpty- 
   * is overruling playerUrlHost
   * @param {string} playerUrlHost (wikipedia) host such as 192.168.178.37
   * @param {object} allGroupsData from getGroupsAll
   * @param {string} [playerName] SONOS-Playername such as Kitchen 
   * 
   * @returns {promise<object>} returns object:
   * { groupId, playerIndex, coordinatorIndex, members[]<playerGroupData> } 
   *
   * @throws {error} 'could not find given player in any group'
   * @throws {error} all methods
   */
  extractGroup: async (playerUrlHost, allGroupsData, playerName) => {
    debug('method:%s', 'extractGroup')
    
    // this ensures that playerName overrules given playerUrlHostname
    const searchByPlayerName = isTruthyStringNotEmpty(playerName)

    // find player in group bei playerUrlHostname or playerName
    // playerName overrules playerUrlHostname
    let foundGroupIndex = -1 // indicator for player NOT found
    let visible
    let groupId
    let usedPlayerUrlHost = ''
    for (let iGroup = 0; iGroup < allGroupsData.length; iGroup++) {
      for (let iMember = 0; iMember < allGroupsData[iGroup].length; iMember++) {
        visible = !allGroupsData[iGroup][iMember].invisible
        groupId = allGroupsData[iGroup][iMember].groupId
        if (searchByPlayerName) {
          // we compare playerName (string) such as Küche
          if (allGroupsData[iGroup][iMember].playerName === playerName && visible) {
            foundGroupIndex = iGroup
            usedPlayerUrlHost = allGroupsData[iGroup][iMember].urlObject.hostname
            break // inner loop
          }
        } else {
          // we compare by URL hostname such as '192.168.178.35'
          if (allGroupsData[iGroup][iMember].urlObject.hostname === playerUrlHost && visible) {
            foundGroupIndex = iGroup
            usedPlayerUrlHost = allGroupsData[iGroup][iMember].urlObject.hostname
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
    const playerIndex
      = members.findIndex((member) => (member.urlObject.hostname === usedPlayerUrlHost))

    return {
      groupId,
      playerIndex,
      'coordinatorIndex': 0,
      members
    }
  },

  /** Parse outcome of GetZoneGroupState and create an array of all groups in household. 
   * Each group consist of an array of players <playerGroupData>
   * Coordinator is always in position 0. Group array may have size 1 (standalone)
   * @param {string} zoneGroupState the xml data from GetZoneGroupState
   * 
   * @returns {promise<playerGroupData[]>} array of arrays with playerGroupData
   *          First group member is coordinator.
   *
   * @throws {error} 'response form parse xml is invalid', 'parameter package name is missing',
   * 'parameter zoneGroupState is missing`
   * @throws {error} all methods
   * 
   * CAUTION: to be on the safe side: playerName uses String (see parse*Value)
   * CAUTION: we use arrayMode false and do it manually
   */
  parseZoneGroupToArray: async (zoneGroupState) => { 
    // validate method parameter
    if (!isTruthyStringNotEmpty(zoneGroupState)) {
      throw new Error('parameter zoneGroupState is missing')
    }
    
    const decoded = await decodeHtmlEntity(zoneGroupState)
    const groupState = await parser.parse(decoded, {
      'arrayMode': false,
      'ignoreAttributes': false,
      'attributeNamePrefix': '_',
      'parseNodeValue': false,
      'parseAttributeValue': false
    }) 
    if (!isTruthyProperty(groupState, ['ZoneGroupState', 'ZoneGroups', 'ZoneGroup'])) {
      throw new Error(`${PACKAGE_PREFIX} response form parse xml: properties missing.`)
    }
    
    // The following section is because of fast-xml-parser with 'arrayMode' = false
    // if only ONE group then convert it to array with one member
    let groupsAlwaysArray
    if (Array.isArray(groupState.ZoneGroupState.ZoneGroups.ZoneGroup)) {
      groupsAlwaysArray = groupState.ZoneGroupState.ZoneGroups.ZoneGroup.slice()
    } else {
      groupsAlwaysArray = [groupState.ZoneGroupState.ZoneGroups.ZoneGroup] 
    }
    // if a group has only ONE member then convert it to array with one member
    groupsAlwaysArray = groupsAlwaysArray.map(group => {
      if (!Array.isArray(group.ZoneGroupMember)) group.ZoneGroupMember = [group.ZoneGroupMember]
      return group
    })
    //result is groupsArray is array<groupDataRaw> and always arrays (not single item)

    // sort all groups that coordinator is in position 0 and select properties
    // see typeDef playerGroupData. 
    const groupsArraySorted = [] // result to be returned
    let groupSorted // keeps the group members, now sorted
    let coordinatorUuid = ''
    let groupId = ''
    let playerName = ''
    let uuid = ''
    let invisible = ''
    let channelMapSet = ''
    let urlObject // player JavaScript build-in URL
    for (let iGroup = 0; iGroup < groupsAlwaysArray.length; iGroup++) {
      groupSorted = []
      coordinatorUuid = groupsAlwaysArray[iGroup]._Coordinator
      groupId = groupsAlwaysArray[iGroup]._ID
      // first push coordinator, other properties will be updated later!
      groupSorted.push({ groupId, 'uuid': coordinatorUuid })
      
      for (let iMember = 0; iMember < groupsAlwaysArray[iGroup].ZoneGroupMember.length; iMember++) {
        urlObject = new URL(groupsAlwaysArray[iGroup].ZoneGroupMember[iMember]._Location)
        urlObject.pathname = '' // clean up
        uuid = groupsAlwaysArray[iGroup].ZoneGroupMember[iMember]._UUID  
        // my naming is playerName instead of the SONOS ZoneName
        playerName = String(groupsAlwaysArray[iGroup].ZoneGroupMember[iMember]._ZoneName) // safety
        invisible = (groupsAlwaysArray[iGroup].ZoneGroupMember[iMember]._Invisible === '1')
        // eslint-disable-next-line max-len
        channelMapSet = groupsAlwaysArray[iGroup].ZoneGroupMember[iMember]._ChannelMapSet || ''      
        if (groupsAlwaysArray[iGroup].ZoneGroupMember[iMember]._UUID !== coordinatorUuid) {
          // push new except coordinator
          groupSorted.push({ urlObject, playerName, uuid, groupId, invisible, channelMapSet })
        } else {
          // update coordinator on position 0 with name
          groupSorted[0].urlObject = urlObject
          groupSorted[0].playerName = playerName
          groupSorted[0].invisible = invisible
          groupSorted[0].channelMapSet = channelMapSet
        }
      }
      groupSorted = groupSorted.filter((member) => member.invisible === false)
      groupsArraySorted.push(groupSorted)
    }
    return groupsArraySorted
  }
} 