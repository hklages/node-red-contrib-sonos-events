/**
 * Collection of general purpose methods.
 *
 * @module Helpers
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
*/

'use strict'

const debug = require('debug')('nrcse:Helper')

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

    if (module.exports.isValidProperty(raw, ['LineInConnected'])) {
      improved.lineInConnected = raw.LineInConnected
    }

    return improved
  },

  filterAndImproveAlarmClock: async (raw) => {
    debug('method >>%s', 'filterAndImproveAlarmClock')
    
    const improved = { 'alarmListVersion': null }

    if (module.exports.isValidProperty(raw, ['AlarmListVersion'])) {
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
    if (module.exports.isValidProperty(raw, ['AVTransportURI'])) {
      basics.uri = raw.AVTransportURI
      // eslint-disable-next-line max-len
      basics.processingUnit = module.exports.getProcessingUnit(basics.uri)
      filterBasics = false
    }
    if (module.exports.isValidProperty(raw, ['CurrentTransportActions'])) {
      basics.validActions = raw.CurrentTransportActions // Stop,Next, ...
      filterBasics = false
    }
    if (module.exports.isValidProperty(raw, ['CurrentValidPlayModes'])) {
      basics.validPlayModes = raw.CurrentValidPlayModes 
      filterBasics = false
    }
    if (module.exports.isValidProperty(raw, ['CurrentPlayMode'])) {
      basics.playMode = raw.CurrentPlayMode // queue play mode
      filterBasics = false
    }
    // ... items found, dont filter
    if (!filterBasics) improved.basics = Object.assign({}, basics) 

    // bundle content
    let filterContent = true
    const content = {} 
    // ... Enqueued is the original command - has impact on AVTransport and Track, .. 
    if (module.exports.isValidProperty(raw, ['EnqueuedTransportURIMetaData', 'UpnpClass'])) {
      content.enqueuedUpnp = raw.EnqueuedTransportURIMetaData.UpnpClass
      filterContent = false
    }
    if (module.exports.isValidProperty(raw, ['EnqueuedTransportURIMetaData', 'Title'])) {
      content.enqueuedTitle = raw.EnqueuedTransportURIMetaData.Title
      filterContent = false
    }
    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'Title'])) {
      content.title = raw.CurrentTrackMetaData.Title
      filterContent = false
    }
    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'Artist'])) {
      content.artist = raw.CurrentTrackMetaData.Artist
      filterContent = false
    }
    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'Album'])) {
      content.album = raw.CurrentTrackMetaData.Album
      filterContent = false
    }
    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'AlbumArtUri'])) {
      content.artUri = raw.CurrentTrackMetaData.AlbumArtUri
      filterContent = false
    }  
    // ... added this without atLeastOneContent as it is helpful but not necessary
    if (module.exports.isValidProperty(raw, ['TransportState'])) {
      content.playbackstate = raw.TransportState.toLowerCase()
    }
    // ... destroy object if no items found
    if(!filterContent) improved.content = Object.assign({}, content) 

    // single item playback state
    if (module.exports.isValidProperty(raw, ['TransportState'])) {
      improved.playbackstate = raw.TransportState.toLowerCase()
    }
 
    return improved
  },

  filterAndImproveConnectionManager: async function (raw) {
    debug('method >>%s', 'filterAndImproveConnectionManager')
    
    const improved = { 'currentConnectionIds': null }

    if (module.exports.isValidProperty(raw, ['CurrentConnectionIDs'])) {
      improved.currentConnectionIds = raw.CurrentConnectionIDs
    }

    return improved
  },

  filterAndImproveContentDirectory: async function (raw) {
    debug('method >>%s', 'filterAndImproveContentDirectory')
    
    const improved = { 'mySonosUpdateId': null }

    if (module.exports.isValidProperty(raw, ['FavoritesUpdateID'])) {
      improved.mySonosUpdateId = raw.FavoritesUpdateID
    }

    return improved
  },

  filterAndImproveDeviceProperties: async (raw) => {
    debug('method >>%s', 'filterAndImproveDeviceProperties')
    
    const improved = { 'micEnabled': null, 'invisible': null }

    if (module.exports.isValidProperty(raw, ['MicEnabled'])) {
      improved.micEnabled = (raw.MicEnabled === 1)
    }

    if (module.exports.isValidProperty(raw, ['Invisible'])) {
      improved.invisible = raw.Invisible
    }

    return improved
  },

  filterAndImproveGroupManagement: async (raw) => {
    debug('method >>%s', 'filterAndImproveGroupManagement')
    
    const improved = { 'localGroupUuid': null }

    if (module.exports.isValidProperty(raw, ['LocalGroupUUID'])) {
      improved.localGroupUuid = raw.LocalGroupUUID
    }

    return improved
  },

  filterAndImproveGroupRendering: async (raw) => {
    debug('method >>%s', 'filterAndImproveGroupRendering')
    
    const improved = { 'groupMutestate': null, 'groupVolume': null }

    if (module.exports.isValidProperty(raw, ['GroupMute'])) {
      improved.groupMutestate = (raw.GroupMute ? 'on' : 'off')
      debug('groupMuteState >>%s', improved.groupMutestate)
    }

    if (module.exports.isValidProperty(raw, ['GroupVolume'])) {
      improved.groupVolume = String(raw.GroupVolume)
      debug('groupVolume >>%s', improved.groupVolume)
    }
    
    return improved
  },

  filterAndMusicServices: async (raw) => {
    debug('method >>%s', 'filterAndMusicServices')
    
    const improved = { 'serviceListVersion': null }

    if (module.exports.isValidProperty(raw, ['ServiceListVersion'])) {
      improved.serviceListVersion = raw.ServiceListVersion 
    }

    return improved
  },

  filterAndImproveQueue: async (raw) => {
    debug('method >>%s', 'filterAndImproveQueue')
    
    const improved = { 'updateId': null }

    if (module.exports.isValidProperty(raw, ['UpdateID'])) {
      improved.updateId = raw.UpdateID 
    }

    return improved
  },

  filterAndImproveRenderingControl: async (raw) => {
    debug('method >>%s', 'filterAndImproveRenderingControl')
    
    const improved = { 'mutestate': null, 'volume': null }
    
    if (module.exports.isValidProperty(raw, ['Mute', 'Master'])) {
      improved.mutestate = (raw.Mute.Master? 'on' : 'off')
    }
    
    if (module.exports.isValidProperty(raw, ['Volume', 'Master'])) {
      improved.volume = String(raw.Volume.Master)
    }

    return improved
  },

  filterAndImproveSystemProperties: async (raw) => {
    debug('method >>%s', 'filterAndImproveSystemProperties')
    
    const improved = { 'updateId': null }

    if (module.exports.isValidProperty(raw, ['UpdateID'])) {
      improved.updateId = raw.UpdateID 
    }

    return improved
  },

  filterAndImproveZoneGroupTopology: async (raw) => {
    debug('method >>%s', 'filterAndImproveZoneGroupTopology')
    
    const improved = { 'allGroups': null }

    if (module.exports.isValidProperty(raw, ['ZoneGroupState'])) {
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
   * members is {url, playerName, uuid, invisible, channelMapSet, groupName }
   * 
   * @throws {error} 
   */

  // TODO: zoneGroupId and invisible are missing! So alos invisible are shown

  transformGroupsAll: async (eventData) => {
    const groupsArraySorted = [] // result to be returned
    let groupSorted // keeps the group members, now sorted
    let coordinatorUuid = ''
    let invisible = ''
    let groupName = ''
    let groupId = ''
    let playerName = ''
    let uuid = ''
    let channelMapSet = ''
    let url // type URL JavaScript build in
    for (let iGroup = 0; iGroup < eventData.length; iGroup++) {
      groupSorted = []
      coordinatorUuid = eventData[iGroup].coordinator.uuid
      groupName = eventData[iGroup].name
      groupId = '' // currently not available

      // first push coordinator (index 0) - data will be completed later
      groupSorted.push({ 'uuid': coordinatorUuid, groupId, groupName })
      
      for (let iMember = 0; iMember < eventData[iGroup].members.length; iMember++) {
        // eslint-disable-next-line max-len
        url = new URL(`http://${eventData[iGroup].members[iMember].host}:${eventData[iGroup].members[iMember].port}`)
        url.pathname = '' // clean up
        uuid = eventData[iGroup].members[iMember].uuid
        // my naming is playerName instead of the SONOS ZoneName
        playerName = eventData[iGroup].members[iMember].name
        invisible = false
        channelMapSet = ''
        // eslint-disable-next-line max-len
        if (module.exports.isValidPropertyNotEmptyString(
          eventData[iGroup].members[iMember], ['ChannelMapSet'])
        ) {
          channelMapSet = `${eventData[iGroup].members[iMember].ChannelMapSet.LF}:LF,LF; 
          + ${eventData[iGroup].members[iMember].ChannelMapSet.RF}:RF,RF`
        }
            
        if (eventData[iGroup].members[iMember].uuid !== coordinatorUuid) {
          // push new except coordinator
          groupSorted.push({ url, playerName, uuid, invisible, channelMapSet, groupId, groupName })
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

  /** Returns the internal content category of a AVTransportURI. 
   * 
   * @param  {string} avTransportUri such as "x-rincon-queue:RINCON_5CAAFD00223601400#0" 
   * from AVTransport, Media Data, property CurrentURI or event AVTransportURI
   * 
   * @returns {string} any of stream, queue, tv, joiner, lineIn, app
   * 
   * @throws nothing
   */
  getProcessingUnit: (avTransportUri) => {
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

  //                        HELPER GENERAL (NRCSP SHARE)
  //                   ..................................
  //
  
  encodeHtmlEntity: (htmlData) => {
    // htmlData string, not null, not undefined
    // works with empty string
    return String(htmlData).replace(/[<>"'&]/g, singleChar => {
      switch (singleChar) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case '\'': return '&apos;'
      case '&': return '&amp;'
      }
    })
  },
   
  /** Decodes some HTML special characters such as &lt; and others. 
   * @param  {string} htmlData the string to be decode
   * 
   * @returns {string} decodes string
   * 
   * @throws nothing
   * 
   * @since 2021-01-12
   */
  decodeHtmlEntity: (htmlData) => {
    // htmlData string, not null, not undefined
    // works with empty string
    // should throw error if (not string) or null or undefined
    return String(htmlData).replace(/(&lt;|&gt;|&apos;|&quot;|&amp;)/g, substring => {
      switch (substring) {
      case '&lt;': return '<'
      case '&gt;': return '>'
      case '&apos;': return '\''
      case '&quot;': return '"'
      case '&amp;': return '&'
      }
    })
  },
      
  /** Validates whether property is safely accessible and "truthy". Empty string allowed.
   * truthy means not undefined, null, NaN, infinite - see method isTruthy.
   * @param  {object} nestedObj object
   * @param  {array<string>} path property chain- must not be empty
   * 
   * @returns {boolean} property is accessible
   * 
   * @throws nothing
   */
  isValidProperty: (nestedObj, pathArray) => {
    const property = pathArray.reduce(
      (obj, key) => (obj && obj[key] !== 'undefined' ? obj[key] : undefined),
      nestedObj
    )
    return module.exports.isTruthy(property)
  },

  /** Validates whether property is safely accessible and "truthy". Empty string NOT allowed.
   * truthy means not undefined, null, NaN, infinite - see method isTruthy.
   * 
   * @param  {object} nestedObj object
   * @param  {array<string>} path path property chain- must not be empty
   * 
   * @returns {boolean} property is accessible and not empty string
   * 
   * @throws nothing
   */
  isValidPropertyNotEmptyString: (nestedObj, pathArray) => {
    const property = pathArray.reduce(
      (obj, key) => (obj && obj[key] !== 'undefined' ? obj[key] : undefined),
      nestedObj
    )
    return module.exports.isTruthyAndNotEmptyString(property)
  },

  /** Validates whether an const/variable is "valid". Empty string allowed!
   * Empty object/array allowed. NOT allowed: undefined or null or NaN or Infinite.
   *  
   * @param  {object|array|number|string|boolean} input const, variable
   * 
   * @returns {boolean} 
   * false: let input; let input = null; let input = undefined; let input = NaN; 
   * false: let input = 1.0 divide by 0; let input = -1.0 divide 0
   * true: let input = '', let input = {}, let input = [], let input = true
   * 
   * @throws nothing
   */
  isTruthy: input => {
    return !(typeof input === 'undefined' || input === null
      //this avoids NaN, positive, negative Infinite
      || (typeof input === 'number' && !Number.isFinite(input)))
  },

  /** Validates whether an constant/variable is "valid". Empty string NOT allowed!
   * Empty object/array allowed. NOT allowed: undefined or null or NaN or Infinite.
   * 
   * @param  {object|array|number|string|boolean} input const, variable
   * 
   * @returns {boolean} 
   * false: let input = ''
   * false: let input; let input = null; let input = undefined; let input = NaN; 
   * false: let input = 1.0 divide by 0; let input = -1.0 divide 0
   * true: let input = {}, let input = [], let input = true
   * 
   * @throws nothing
   */
  isTruthyAndNotEmptyString: input => {
    return !(typeof input === 'undefined' || input === null
      //this avoids NaN, positive, negative Infinite, not empty string
      || (typeof input === 'number' && !Number.isFinite(input)) || input === '')
  },

  /** Gets the property value specified by path. Use isValidProperty before!
   * 
   * @param  {object} nestedObj object
   * @param  {array<string>} path path property chain- must not be empty
   * 
   * @returns {any} value of that property
   * 
   * @throws nothing
   */
  // Source: https://dev.to/flexdinesh/accessing-nested-objects-in-javascript--9m4
  // pass in your object structure as array elements
  // const name = getNestedProperty(user, ['personalInfo', 'name']);
  // to access nested array, just pass in array index as an element the path array.
  // const city = getNestedProperty(user, ['personalInfo', 'addresses', 0, 'city']);
  // this will return the city from the first address item.
  getNestedProperty: (nestedObj, pathArray) => {
    return pathArray.reduce((obj, key) => obj[key], nestedObj)
  }
} 