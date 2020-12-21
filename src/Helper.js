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

    const transformed = { 'raw': data } // keep the original data

    if (module.exports.isValidProperty(data, ['AVTransportURI'])) {
      transformed.avTransportUri = data.AVTransportURI
      debug('avTransportURI >>%s', transformed.avTransportUri)
      transformed.internalSource = module.exports.internalSource(transformed.avTransportUri)
      debug('internalSource >>%s', transformed.internalSource)
    }

    if (module.exports.isValidProperty(data, ['CurrentTrackMetaData', 'Title'])) {
      transformed.title = module.exports.decodeHtml(data.CurrentTrackMetaData.Title)
      debug('title >>%s', transformed.title)
    }
    if (module.exports.isValidProperty(data, ['CurrentTrackMetaData', 'Artist'])) {
      transformed.artist = module.exports.decodeHtml(data.CurrentTrackMetaData.Artist)
    }
    if (module.exports.isValidProperty(data, ['CurrentTrackMetaData', 'Album'])) {
      debug('album >>%s', data.CurrentTrackMetaData.Album)
      transformed.album = module.exports.decodeHtml(data.CurrentTrackMetaData.Album)
    }
    if (module.exports.isValidProperty(data, ['EnqueuedTransportURIMetaData', 'Title'])) {
      transformed.station = module.exports.decodeHtml(data.EnqueuedTransportURIMetaData.Title)
      debug('station >>%s', transformed.station)
    }
    if (module.exports.isValidProperty(data, ['TransportState'])) {
      transformed.playbackstate = data.TransportState.toLowerCase()
    }

    // AVTransport if exists overrules EnqueuedTransport...
    transformed.upnpClass = ''
    if (module.exports.isValidProperty(data, ['EnqueuedTransportURIMetaData', 'UpnpClass'])) {
      transformed.upnpClass = data.EnqueuedTransportURIMetaData.UpnpClass
    }
    if (module.exports.isValidProperty(data, ['AVTransportURIMetaData', 'UpnpClass'])) {
      transformed.upnpClass = data.AVTransportURIMetaData.UpnpClass
    }
 
    return transformed
  },

  transformGroupRenderingData: (data) => {
    const transformed = { 'raw': data }
    if (module.exports.isValidProperty(data, ['GroupMute'])) {
      transformed.groupMute = (data.GroupMute ? 'on' : 'Off')
      debug('groupMute >>%s', transformed.groupMute)
    }
    return transformed
  },

  transformZoneData: (data, playerIp) => {
    // TODO async an throw execption when no player found
    const transformed = { 'raw': data }
    if (module.exports.isValidProperty(data, ['ZoneGroupState'])) {
      const allGroupArray = data.ZoneGroupState
      // Get group coordinator name and size
      let foundGroupIndex = -1
      for (let iGroups = 0; iGroups < allGroupArray.length; iGroups++) {
        for (let iMembers = 0; iMembers < allGroupArray[iGroups].members.length; iMembers++) {
          if (playerIp === allGroupArray[iGroups].members[iMembers].host) {
            foundGroupIndex = iGroups
            break
          }
        }
        if (foundGroupIndex > -1) {
          break
        }
      }
      transformed.groupName = allGroupArray[foundGroupIndex].name  
      debug('zone >>%s', transformed.groupName)
    }
    return transformed
  },

  internalSource: (avTransportUri) => {
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

  decodeHtml: (htmlData) => {
    // TODO arg is string
    let decoded = htmlData
    if (htmlData.length >= '&lt;'.length) {
      decoded = htmlData.replace(/&lt;|&gt;|&amp;|&apos;|&quot;/g, substring => {
        switch (substring) {
        case '&lt;': return '<'
        case '&gt;': return '>'
        case '&amp;': return '&'
        case '&apos;': return '`'
        case '&quot;': return '"'
        }
      })
    } 
    
    return decoded
  },
      
  /** Validates whether property is safely accessible and "truthy". Empty string allowed.
   * truthy means not undefined, null, NaN, infinite - see method isTruthy.
   * 
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