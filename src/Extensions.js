/**
 * Collection of extensions related to events.
 *
 * @module Extensions
 * 
 * @author Henning Klages
 * 
 * parseZoneGroupToArray copied from sonos-plus
*/

'use strict'

const { PACKAGE_PREFIX } = require('./Globals.js')

const { isTruthyPropertyStringNotEmpty, isTruthyProperty, isTruthyStringNotEmpty, decodeHtmlEntity
} = require('./Helper.js')

const { XMLParser } = require('fast-xml-parser')

const { networkInterfaces } = require('os')

const debug = require('debug')(`${PACKAGE_PREFIX}:extensions`)

module.exports = {

  //                        IMPROVE AND FILTER DATA
  //                   ..................................
  //
  // for all improved* routines
  // null means filtered
  // otherwise an improved value

  filterAndImproveServiceData: async (serviceName, raw) => {
    switch (serviceName) {
    case 'AudioInService':
      return module.exports.filterAndImproveAudioIn(raw)
    case 'AlarmClockService':
      return module.exports.filterAndImproveAlarmClock(raw)
    case 'AVTransportService':
      return module.exports.filterAndImproveAVTransport(raw)
    case 'ConnectionManagerService':
      return module.exports.filterAndImproveConnectionManager(raw)
    case 'ContentDirectoryService':
      return module.exports.filterAndImproveContentDirectory(raw)
    case 'DevicePropertiesService':
      return module.exports.filterAndImproveDeviceProperties(raw)
    case 'GroupManagementService':
      return module.exports.filterAndImproveGroupManagement(raw)
    case 'GroupRenderingControlService':
      return module.exports.filterAndImproveGroupRendering(raw)
    case 'MusicServicesService':
      return module.exports.filterAndMusicServices(raw)
    case 'QueueService':
      return module.exports.filterAndImproveQueue(raw)
    case 'RenderingControlService':
      return module.exports.filterAndImproveRenderingControl(raw)
    case 'SystemPropertiesService':
      return module.exports.filterAndImproveSystemProperties(raw)
    case 'ZoneGroupTopologyService':
      return module.exports.filterAndImproveZoneGroupTopology(raw)
    }
  },

  filterAndImproveAudioIn: async function (raw) {
    debug('method >>%s', 'filterAndImproveAudioIn')
    
    const improved = { 'lineInConnected': null }

    if (isTruthyProperty(raw, ['LineInConnected'])) {
      improved.lineInConnected = raw.LineInConnected
    }

    return improved
  },

  filterAndImproveAlarmClock: async (raw) => {
    debug('method >>%s', 'filterAndImproveAlarmClock')
    
    const improved = { 'alarmListVersion': null }

    if (isTruthyProperty(raw, ['AlarmListVersion'])) {
      improved.alarmListVersion = raw.AlarmListVersion 
    }

    return improved
  },

  filterAndImproveAVTransport: async (raw) => {
    debug('method >>%s', 'filterAndImproveAVTransport')

    // filter on for all as default
    const improved = { 'basics': null, 'content': null, 'playbackstate': null, }
   
    // bundle basics
    let filterBasics = true
    const basics = {}
    if (isTruthyProperty(raw, ['AVTransportURI'])) {
      basics.uri = raw.AVTransportURI
      // eslint-disable-next-line max-len
      basics.processingType  = module.exports.getProcessingTypeFromUri(basics.uri)
      filterBasics = false
    }
    if (isTruthyProperty(raw, ['CurrentTransportActions'])) {
      basics.validActions = raw.CurrentTransportActions // Stop,Next, ...
      filterBasics = false
    }
    if (isTruthyProperty(raw, ['CurrentValidPlayModes'])) {
      basics.validPlayModes = raw.CurrentValidPlayModes 
      filterBasics = false
    }
    if (isTruthyProperty(raw, ['CurrentPlayMode'])) {
      basics.playMode = raw.CurrentPlayMode // queue play mode
      filterBasics = false
    }
    // ... items found, don't filter
    if (!filterBasics) improved.basics = Object.assign({}, basics) 

    // bundle content
    let filterContent = true
    const content = {} 
    // ... Enqueued is the original command - has impact on AVTransport and Track, .. 
    if (isTruthyProperty(raw, ['EnqueuedTransportURIMetaData', 'UpnpClass'])) {
      content.enqueuedUpnp = raw.EnqueuedTransportURIMetaData.UpnpClass
      filterContent = false
    }
    if (isTruthyProperty(raw, ['EnqueuedTransportURIMetaData', 'Title'])) {
      content.enqueuedTitle = raw.EnqueuedTransportURIMetaData.Title
      filterContent = false
    }
    if (isTruthyProperty(raw, ['CurrentTrackMetaData', 'Title'])) {
      content.title = raw.CurrentTrackMetaData.Title
      filterContent = false
    }
    if (isTruthyProperty(raw, ['CurrentTrackMetaData', 'Artist'])) {
      content.artist = raw.CurrentTrackMetaData.Artist
      filterContent = false
    }
    if (isTruthyProperty(raw, ['CurrentTrackMetaData', 'Album'])) {
      content.album = raw.CurrentTrackMetaData.Album
      filterContent = false
    }
    if (isTruthyProperty(raw, ['CurrentTrackMetaData', 'AlbumArtUri'])) {
      content.artUri = raw.CurrentTrackMetaData.AlbumArtUri
      filterContent = false
    }  
    // ... added this without atLeastOneContent as it is helpful but not necessary
    if (isTruthyProperty(raw, ['TransportState'])) {
      content.playbackstate = raw.TransportState.toLowerCase()
    }
    // ... destroy object if no items found
    if(!filterContent) improved.content = Object.assign({}, content) 

    // single item playback state
    if (isTruthyProperty(raw, ['TransportState'])) {
      improved.playbackstate = raw.TransportState.toLowerCase()
    }
 
    return improved
  },

  filterAndImproveConnectionManager: async function (raw) {
    debug('method >>%s', 'filterAndImproveConnectionManager')
    
    const improved = { 'currentConnectionIds': null }

    if (isTruthyProperty(raw, ['CurrentConnectionIDs'])) {
      improved.currentConnectionIds = raw.CurrentConnectionIDs
    }

    return improved
  },

  filterAndImproveContentDirectory: async function (raw) {
    debug('method >>%s', 'filterAndImproveContentDirectory')
    
    const improved = { 'mySonosUpdateId': null }

    if (isTruthyProperty(raw, ['FavoritesUpdateID'])) {
      improved.mySonosUpdateId = raw.FavoritesUpdateID
    }

    return improved
  },

  filterAndImproveDeviceProperties: async (raw) => {
    debug('method >>%s', 'filterAndImproveDeviceProperties')
    
    const improved = { 'micEnabled': null, 'invisible': null }

    if (isTruthyProperty(raw, ['MicEnabled'])) {
      improved.micEnabled = (raw.MicEnabled === 1)
    }

    if (isTruthyProperty(raw, ['Invisible'])) {
      improved.invisible = raw.Invisible
    }

    return improved
  },

  filterAndImproveGroupManagement: async (raw) => {
    debug('method >>%s', 'filterAndImproveGroupManagement')
    
    const improved = { 'localGroupUuid': null }

    if (isTruthyProperty(raw, ['LocalGroupUUID'])) {
      improved.localGroupUuid = raw.LocalGroupUUID
    }

    return improved
  },

  filterAndImproveGroupRendering: async (raw) => {
    debug('method >>%s', 'filterAndImproveGroupRendering')
    
    const improved = { 'groupMutestate': null, 'groupVolume': null }

    if (isTruthyProperty(raw, ['GroupMute'])) {
      improved.groupMutestate = (raw.GroupMute ? 'on' : 'off')
      debug('groupMuteState >>%s', improved.groupMutestate)
    }

    if (isTruthyProperty(raw, ['GroupVolume'])) {
      improved.groupVolume = String(raw.GroupVolume)
      debug('groupVolume >>%s', improved.groupVolume)
    }
    
    return improved
  },

  filterAndMusicServices: async (raw) => {
    debug('method >>%s', 'filterAndMusicServices')
    
    const improved = { 'serviceListVersion': null }

    if (isTruthyProperty(raw, ['ServiceListVersion'])) {
      improved.serviceListVersion = raw.ServiceListVersion 
    }

    return improved
  },

  filterAndImproveQueue: async (raw) => {
    debug('method >>%s', 'filterAndImproveQueue')
    
    const improved = { 'updateId': null }

    if (isTruthyProperty(raw, ['UpdateID'])) {
      improved.updateId = raw.UpdateID 
    }

    return improved
  },

  filterAndImproveRenderingControl: async (raw) => {
    debug('method >>%s', 'filterAndImproveRenderingControl')
    
    const improved = { 'mutestate': null, 'volume': null }
    
    if (isTruthyProperty(raw, ['Mute', 'Master'])) {
      improved.mutestate = (raw.Mute.Master? 'on' : 'off')
    }
    
    if (isTruthyProperty(raw, ['Volume', 'Master'])) {
      improved.volume = String(raw.Volume.Master)
    }

    return improved
  },

  filterAndImproveSystemProperties: async (raw) => {
    debug('method >>%s', 'filterAndImproveSystemProperties')
    
    const improved = { 'updateId': null }

    if (isTruthyProperty(raw, ['UpdateID'])) {
      improved.updateId = raw.UpdateID 
    }

    return improved
  },

  filterAndImproveZoneGroupTopology: async (raw) => {
    debug('method >>%s', 'filterAndImproveZoneGroupTopology')
    
    const improved = { 'allGroups': null }

    if (isTruthyProperty(raw, ['ZoneGroupState'])) {
      improved.allGroups = await module.exports.transformGroupsAll(raw.ZoneGroupState)
    }

    return improved 
  },

  //                        HELPER IMPROVE DATA
  //                   ..................................
  //
  /** Transform ZoneTopology Event Data to an array of arrays of members. 
   * Coordinator is always at position 0
   * @param {object} eventData Array of Object, {name  , coordinator, members}
   * coordinator = member = {name, host, port, uuid, ...}
   * members is array of member
   * 
   * @returns {promise<members[]>}  Array of Array of members 
   * members is {urlObject, playerName, uuid, invisible, channelMapSet, groupName }
   * 
   * @throws {error} 
   * 
   * It is not possible to use my parsingGroup... as Stefan already did the parsing
   */

  transformGroupsAll: async (eventData) => {
    const groupsArraySorted = [] // result to be returned
    let groupSorted // keeps the group members, now sorted
    let coordinatorUuid = ''
    let groupId = ''
    let groupName = ''
    let playerName = ''
    let uuid = ''
    let invisible = ''
    let channelMapSet = ''
    let urlObject // type URL JavaScript build in
    for (let iGroup = 0; iGroup < eventData.length; iGroup++) {
      groupSorted = []
      coordinatorUuid = eventData[iGroup].coordinator.uuid
      groupName = eventData[iGroup].name
      groupId = '' // currently not available

      // first push coordinator (index 0) - data will be completed later
      groupSorted.push({ 'uuid': coordinatorUuid, groupId, groupName })
      
      for (let iMember = 0; iMember < eventData[iGroup].members.length; iMember++) {
        // eslint-disable-next-line max-len
        urlObject = new URL(`http://${eventData[iGroup].members[iMember].host}:${eventData[iGroup].members[iMember].port}`)
        urlObject.pathname = '' // clean up
        uuid = eventData[iGroup].members[iMember].uuid
        // my naming is playerName instead of the SONOS ZoneName
        playerName = eventData[iGroup].members[iMember].name
        invisible = eventData[iGroup].members[iMember].Invisible
        channelMapSet = ''
        if (isTruthyPropertyStringNotEmpty(
          eventData[iGroup].members[iMember], ['ChannelMapSet'])
        ) {
          channelMapSet = `${eventData[iGroup].members[iMember].ChannelMapSet.LF}:LF,LF; 
          + ${eventData[iGroup].members[iMember].ChannelMapSet.RF}:RF,RF`
        }
            
        if (eventData[iGroup].members[iMember].uuid !== coordinatorUuid) {
          // push new except coordinator
          // eslint-disable-next-line max-len
          groupSorted.push({ url: urlObject, playerName, uuid, invisible, channelMapSet, groupId, groupName })
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
  }, 

  /** Returns the internal content category of a AVTransportURI. 
   * 
   * @param  {string} avTransportUri such as "x-rincon-queue:RINCON_5CAAFD00223601400#0" 
   * from AVTransport, Media Data, property CurrentURI or event AVTransportURI
   * 
   * @returns {string} any of stream, queue, tv, joiner, lineIn, app
   * 
   * @throws nothing
   */
  getProcessingTypeFromUri: (avTransportUri) => {
    debug('method >>%s', 'internalSource')

    // TODO arg is string and not empty
    let source = 'stream' // default
    if (avTransportUri.startsWith('x-rincon-queue:')) {
      source = 'queue'
    } else if (avTransportUri.startsWith('x-sonos-htastream:')) {
      source = 'tv'
    } else if (avTransportUri.startsWith('x-rincon:RINCON')) {
      source = 'joiner'
    } else if (avTransportUri.startsWith('x-rincon-stream:')) {
      source = 'lineIn'
    } else if (avTransportUri.startsWith('x-sonos-vli:')) {
      source = 'app'
    }
      
    return source
  },

  /** Parse outcome of GetZoneGroupState and create an array of all groups in household. 
   * Each group consist of an array of player <playerGroupData>.
   * Coordinator is always in position 0. Group array may have size 1 (standalone).
   * Hidden players (example stereopair) are removed, if removeHiden = true (default).
   * @param {string} zoneGroupState the xml data from GetZoneGroupState
   * @param {boolean} removeHidden removes all hidden payers  
   * 
   * @returns {promise<playerGroupData[]>} array of arrays with playerGroupData
   *          First group member is coordinator
   *
   * @throws {error} 'response form parse xml is invalid', 'parameter package name is missing',
   * 'parameter zoneGroupState is missing`
   * @throws {error} all methods
   * 
   * CAUTION: To be on the safe side: playerName uses String (see parse*Value)
   * CAUTION: We use arrayMode false and do it manually
   */
  parseZoneGroupToArray: async (zoneGroupState, removeHidden = true) => { 
    debug('method:%s', 'parseZoneGroupToArray')
    // Validate method parameter
    if (!isTruthyStringNotEmpty(zoneGroupState)) {
      throw new Error('parameter zoneGroupState is missing')
    }
    
    const decoded = await decodeHtmlEntity(zoneGroupState)
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '_',
      parseAttributeValue: false,
      parseTagValue: false,
      arrayMode: false,
      processEntities: false
    })
    const groupState = await parser.parse(decoded) 
    
    // The following section is because of fast-xml-parser with 'arrayMode' = false
    // If only ONE group then convert it to array of groups with one member
    let groupsAlwaysArray
    if (isTruthyProperty(groupState, ['ZoneGroupState', 'ZoneGroups', 'ZoneGroup'])) {
      // This is the standard case for new firmware!
      if (Array.isArray(groupState.ZoneGroupState.ZoneGroups.ZoneGroup)) {
        groupsAlwaysArray = groupState.ZoneGroupState.ZoneGroups.ZoneGroup.slice()
      } else {
        groupsAlwaysArray = [groupState.ZoneGroupState.ZoneGroups.ZoneGroup] 
      }
      // If a group has only ONE member then convert it to array with one member
      groupsAlwaysArray = groupsAlwaysArray.map(group => {
        if (!Array.isArray(group.ZoneGroupMember)) group.ZoneGroupMember = [group.ZoneGroupMember]
        return group
      })
    } else {
      // Try this for very old firmware version, where ZoneGroupState is missing
      if (isTruthyProperty(groupState, ['ZoneGroups', 'ZoneGroup'])) {
        if (Array.isArray(groupState.ZoneGroups.ZoneGroup)) {
          groupsAlwaysArray = groupState.ZoneGroups.ZoneGroup.slice()
        } else {
          groupsAlwaysArray = [groupState.ZoneGroups.ZoneGroup] 
        }
        // If a group has only ONE member then convert it to array with one member
        groupsAlwaysArray = groupsAlwaysArray.map(group => {
          if (!Array.isArray(group.ZoneGroupMember)) group.ZoneGroupMember = [group.ZoneGroupMember]
          return group
        })
      } else {
        throw new Error(`${PACKAGE_PREFIX} response form parse xml: properties missing.`)
      }
    }
    // Result is groupsAlwaysArray is array<groupDataRaw> and always arrays (not single item)

    // Sort all groups that coordinator is in position 0 and select properties
    // See typeDef playerGroupData. 
    const groupsArraySorted = [] // result to be returned
    for (const group of groupsAlwaysArray) {
      let groupSorted = []
      const coordinatorUuid = group._Coordinator
      const groupId = group._ID
      // First push coordinator, its other properties will be updated later!
      groupSorted.push({ groupId, 'uuid': coordinatorUuid })
      const iCoord = 0 // used for later access
      
      for (const member of group.ZoneGroupMember) {
        const urlObject = new URL(member._Location)
        urlObject.pathname = '' // clean up
        const uuid = member._UUID  
        // My naming is playerName instead of the SONOS ZoneName
        const playerName = String(member._ZoneName) // safety
        const invisible = (member._Invisible === '1')
        const channelMapSet = member._ChannelMapSet || ''      
        if (member._UUID !== coordinatorUuid) {
          // Push new joiner 
          groupSorted.push({ urlObject, playerName, uuid, groupId, invisible, channelMapSet })
        } else {
          // Update coordinator
          groupSorted[iCoord].urlObject = urlObject
          groupSorted[iCoord].playerName = playerName
          groupSorted[iCoord].invisible = invisible
          groupSorted[iCoord].channelMapSet = channelMapSet
        }
      }
      if (removeHidden) { // Removes all hidden player
        groupSorted = groupSorted.filter((member) => member.invisible === false)   
      }
      // Invisible player form a group with 1 - remove that. Should not happen
      if (groupSorted.length !== 0) groupsArraySorted.push(groupSorted)
    }
    return groupsArraySorted
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

    // find player in group bei playerName or playerUrlHostname
    // playerName - if valid - overrules playerUrlHostname!
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

  getRightCcuIp: async (idx) => {

    const addresses = []
    const interfaces = networkInterfaces()
    let name
    let ifaces
    let iface
  
    for (name in interfaces) {
      // eslint-disable-next-line no-prototype-builtins
      if(interfaces.hasOwnProperty(name)) {
        ifaces = interfaces[name]
        if(!/(loopback|vmware|internal)/gi.test(name)) {
          for (let i = 0; i < ifaces.length; i++) {
            iface = ifaces[i]
            if (iface.family === 'IPv4' &&  !iface.internal && iface.address !== '127.0.0.1') {
              addresses.push(iface.address)
            }
          }
        }
      }
    }
  
    // If an index is passed only return it.
    if(idx >= 0)
      return addresses[idx]
    return addresses
  },

  getMultipleIps: async () => {
    
    const addresses = []
    let name
    let ifaces
    let iface
    const interfaces = networkInterfaces()
    for (name in interfaces) {
      // eslint-disable-next-line no-prototype-builtins
      if(interfaces.hasOwnProperty(name)) {
        ifaces = interfaces[name]
        if(!/(loopback|internal)/gi.test(name)) {
          for (let i = 0; i < ifaces.length; i++) {
            iface = ifaces[i]
            if (iface.family === 'IPv4' &&  !iface.internal && iface.address !== '127.0.0.1') {
              addresses.push(iface.address)
            }
          }
        }
      }
    }
    return addresses
  },

} 