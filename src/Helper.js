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

  // improve the incoming raw data and provide additional data
  // TODO check one instead of many
  improvedServiceData: async (serviceName, raw) => {
    switch (serviceName) {
    case 'AudioInService':
      return module.exports.improvedAudioIn(raw)
    case 'AlarmClockService':
      return raw
    case 'AVTransportService':
      return module.exports.improvedAVTransport(raw)
    case 'ConnectionManagerService':
      return raw
    case 'ContentDirectoryService':
      return raw
    case 'DevicePropertiesService':
      return module.exports.improvedDeviceProperties(raw)
    case 'GroupManagementService':
      return module.exports.improvedGroupManagement(raw)
    case 'GroupRenderingControlService':
      return module.exports.improvedGroupRendering(raw)
    case 'MusicServicesService':
      return raw
    case 'QueueService':
      return raw
    case 'RenderingControlService':
      return module.exports.improvedRenderingControl(raw)
    case 'SystemPropertiesService':
      return raw
    case 'VirtualLineInService':
      return raw
    case 'ZoneGroupTopologyService':
      return module.exports.improvedZoneGroupTopology(raw)
    }
  },
  
  improvedAudioIn: async function (raw) {
    debug('method >>%s', 'improvedAudioIn')
    
    const improved = { 'playing': null, raw }

    if (module.exports.isValidProperty(raw, ['Playing'])) {
      improved.playing = raw.Playing
    }

    return improved
  },

  improvedAVTransport: async (raw) => {
    debug('method >>%s', 'improvedAvTransportData')

    const improved = { 'basics': {}, 'content': {}, 'playbackstate': null, raw }

    // bundle basics
    let atLeastOneBasics = false
    if (module.exports.isValidProperty(raw, ['AVTransportURI'])) {
      improved.basics.uri = raw.AVTransportURI
      // eslint-disable-next-line max-len
      improved.basics.processingUnit = module.exports.getProcessingUnit(improved.basics.uri)
      atLeastOneBasics = true
    }
    if (module.exports.isValidProperty(raw, ['CurrentTransportActions'])) {
      improved.basics.actions = raw.CurrentTransportActions // Stop,Next, ...
      atLeastOneBasics = true
    }
    if (module.exports.isValidProperty(raw, ['CurrentValidPlayModes'])) {
      improved.basics.validPlayModes = raw.CurrentValidPlayModes 
      atLeastOneBasics = true
    }
    if (module.exports.isValidProperty(raw, ['CurrentPlayMode'])) {
      improved.basics.playMode = raw.CurrentPlayMode // queue play mode
      atLeastOneBasics = true
    }
    // ... destroy object if no items found
    if(!atLeastOneBasics) improved.basics = null

    // bundle content
    improved.content = {} 
    let atLeastOneContent = false
    // ... Enqueued is the original command - has impact on AVTransport and Track, .. 
    if (module.exports.isValidProperty(raw, ['EnqueuedTransportURIMetaData', 'UpnpClass'])) {
      improved.content.enqueuedUpnp = raw.EnqueuedTransportURIMetaData.UpnpClass
      atLeastOneContent = true
    }
    if (module.exports.isValidProperty(raw, ['EnqueuedTransportURIMetaData', 'Title'])) {
      improved.content.enqueuedTitle = raw.EnqueuedTransportURIMetaData.Title
      atLeastOneContent = true
    }
    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'Title'])) {
      improved.content.title = raw.CurrentTrackMetaData.Title
      atLeastOneContent = true
    }
    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'Artist'])) {
      improved.content.artist = raw.CurrentTrackMetaData.Artist
      atLeastOneContent = true
    }

    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'Album'])) {
      improved.content.album = raw.CurrentTrackMetaData.Album
      atLeastOneContent = true
    }
    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'AlbumArtUri'])) {
      improved.content.artUri = raw.CurrentTrackMetaData.AlbumArtUri
      atLeastOneContent = true
    }  
    // ... destroy object if no items found
    if(!atLeastOneContent) improved.content = null

    // single item playback state
    if (module.exports.isValidProperty(raw, ['TransportState'])) {
      improved.playbackstate = raw.TransportState.toLowerCase()
    }
 
    return improved
  },

  improvedDeviceProperties: async (raw) => {
    debug('method >>%s', 'improvedDeviceProperties')
    
    const improved = { raw }

    improved.micEnabled = null
    if (module.exports.isValidProperty(raw, ['MicEnabled'])) {
      improved.micEnabled = (raw.MicEnabled === 1)
    }

    return improved
  },

  improvedGroupManagement: async (raw) => {
    debug('method >>%s', 'improvedGroupManagementService')
    
    const improved = { 'localGroupUuid': null, raw }

    if (module.exports.isValidProperty(raw, ['LocalGroupUUID'])) {
      improved.localGroupUuid = raw.LocalGroupUUID
    }

    return improved
  },

  improvedGroupRendering: async (raw) => {
    debug('method >>%s', 'improvedGroupRenderingData')
    
    const improved = { 'groupMutestate': null, 'groupVolume': null,  raw }

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

  improvedRenderingControl: async (raw) => {
    debug('method >>%s', 'improvedRenderingControl')
    
    const improved = { 'mutestate': null, 'volume': null,  raw }
    
    if (module.exports.isValidProperty(raw, ['Mute', 'Master'])) {
      improved.mutestate = (raw.Mute.Master? 'on' : 'off')
    }
    
    if (module.exports.isValidProperty(raw, ['Volume', 'Master'])) {
      improved.volume = String(raw.Volume.Master)
    }

    return improved
  },

  improvedZoneGroupTopology: async (raw) => {
    debug('method >>%s', 'improvedZoneData')
    
    const improved = { 'allGroups': null, raw }

    if (module.exports.isValidProperty(raw, ['ZoneGroupState'])) {
      improved.allGroups = raw.ZoneGroupState
    }

    return improved 
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