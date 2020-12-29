'use strict'

/**
 * Collection of general purpose methods.
 *
 * @module Helpers
 * 
 * @author Henning Klages
 * 
 * @since 2020-12-20
*/

const debug = require('debug')('nrcse:Helper')

module.exports = {

  transformAvTransportData: (data) => {
    debug('method >>%s', 'transformAvTransportData')

    const transformed = { 'raw': data } // keep the original data

    if (module.exports.isValidProperty(data, ['AVTransportURI'])) {
      transformed.avTransportUri = data.AVTransportURI
      debug('avTransportURI >>%s', transformed.avTransportUri)
      transformed.internalSource = module.exports.internalSource(transformed.avTransportUri)
      debug('internalSource >>%s', transformed.internalSource)
    }

    if (module.exports.isValidProperty(data, ['CurrentTrackMetaData', 'Title'])) {
      transformed.title = data.CurrentTrackMetaData.Title
      debug('title >>%s', transformed.title)
    }
    if (module.exports.isValidProperty(data, ['CurrentTrackMetaData', 'Artist'])) {
      transformed.artist = data.CurrentTrackMetaData.Artist
    }

    if (module.exports.isValidProperty(data, ['CurrentTrackMetaData', 'Album'])) {
      transformed.album =data.CurrentTrackMetaData.Album
    }
    if (module.exports.isValidProperty(data, ['CurrentTrackMetaData', 'AlbumArtUri'])) {
      transformed.artUri = data.CurrentTrackMetaData.AlbumArtUri
    }
    
    if (module.exports.isValidProperty(data, ['TransportState'])) {
      transformed.playbackstate = data.TransportState.toLowerCase()
    }

    // AVTransport if exists overrules EnqueuedTransport...
    // TODO for what is this
    // transformed.upnpClass = ''
    // if (module.exports.isValidProperty(data, ['EnqueuedTransportURIMetaData', 'UpnpClass'])) {
    //   transformed.upnpClass = data.EnqueuedTransportURIMetaData.UpnpClass
    // }
    // if (module.exports.isValidProperty(data, ['AVTransportURIMetaData', 'UpnpClass'])) {
    //   transformed.upnpClass = data.AVTransportURIMetaData.UpnpClass
    // }
    // if (module.exports.isValidProperty(data, ['EnqueuedTransportURIMetaData', 'Title'])) {
    //   transformed.station = data.EnqueuedTransportURIMetaData.Title
    //   debug('station >>%s', transformed.station)
    // }
 
    return transformed
  },

  transformGroupRenderingData: (data) => {
    debug('method >>%s', 'transformGroupRenderingData')
    const transformed = { 'raw': data }
    if (module.exports.isValidProperty(data, ['GroupMute'])) {
      transformed.groupMute = (data.GroupMute ? 'on' : 'Off')
      debug('groupMute >>%s', transformed.groupMute)
    }
    return transformed
  },

  transformZoneData: (data, playerHostname) => {
    debug('method >>%s', 'transformZoneData')
    // TODO async an throw exeception when no player found
    const transformed = { 'raw': data }
    if (module.exports.isValidProperty(data, ['ZoneGroupState'])) {
      const allGroupArray = data.ZoneGroupState
      // Get group coordinator name and size
      let foundGroupIndex = -1
      for (let iGroups = 0; iGroups < allGroupArray.length; iGroups++) {
        for (let iMembers = 0; iMembers < allGroupArray[iGroups].members.length; iMembers++) {
          if (playerHostname === allGroupArray[iGroups].members[iMembers].host) { // host = hostname
            foundGroupIndex = iGroups
            break
          }
        }
        if (foundGroupIndex > -1) {
          break
        }
      }
      // TODO check existence
      transformed.groupName = allGroupArray[foundGroupIndex].name
      transformed.coordinatorName = allGroupArray[foundGroupIndex].coordinator.name
      transformed.coordinatorHostname = allGroupArray[foundGroupIndex].coordinator.host
      transformed.groupSize = allGroupArray[foundGroupIndex].members.length
      transformed.groupMemberNames = allGroupArray[foundGroupIndex].members.map((member) => {
        return member.name // as this name comes from sonos-ts 
      })
    }
    return transformed
  },

  /** Returns the internal source of a AVTransportURI. 
   * 
   * @param  {string} avTransportUri such as "x-rincon-queue:RINCON_5CAAFD00223601400#0" 
   * from AVTransport, Media Data, property CurrentURI or event AVTransportURI
   * 
   * @returns {string} any of stream, queue, tv, joiner, lineIn, app
   * 
   * @throws nothing
   */
  internalSource: (avTransportUri) => {
    debug('method >>%s', 'internalSource')

    // TODO arg is string and not empty
    let source = 'stream' // default
    if (avTransportUri.startsWith('x-rincon-queue:')) {
      source = 'queue'
    } else if (avTransportUri.startsWith('x-sonos-htastream:')) {
      source = 'tv'
    } else if (avTransportUri.startsWith('x-rincon:')) {
      source = 'joiner'
    } else if (avTransportUri.startsWith('x-rincon-stream:')) {
      source = 'lineIn'
    } else if (avTransportUri.startsWith('x-sonos-vli:')) {
      source = 'app'
    }
      
    return source
  },

  /** Decodes some HTML special characters such as &lt; and others. 
   * @param  {string} htmlData the string to be decode
   * 
   * @returns {string} decodes string
   * 
   * @throws nothing
   */
  decodeHtml: (htmlData) => {
    debug('method >>%s', 'decodeHtml')
    const decoded = String(htmlData).replace(/&lt;|&gt;|&amp;|&apos;|&quot;/g, (substring) => {
      switch (substring) {
      case '&lt;': return '<'
      case '&gt;': return '>'
      case '&amp;': return '&'
      case '&apos;': return '´'
      case '&quot;': return '"'
      }
    })
    
    return decoded
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