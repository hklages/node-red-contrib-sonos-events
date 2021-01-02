'use strict'

/**
 * Collection of general purpose methods.
 *
 * @module Helpers
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
*/

const debug = require('debug')('nrcse:Helper')

module.exports = {

  betterAvTransportData: (raw) => {
    debug('method >>%s', 'transformAvTransportData')

    const content = {} 
    let contentCategory = null // for those cases AVTransportURI is not given
    if (module.exports.isValidProperty(raw, ['AVTransportURI'])) {
      content.avTransportUri = raw.AVTransportURI
      debug('avTransportURI >>%s', content.avTransportUri)
      contentCategory = module.exports.getContentCategory(content.avTransportUri)
      debug('contentCategory >>%s', contentCategory)
    }

    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'Title'])) {
      content.title = raw.CurrentTrackMetaData.Title
      debug('title >>%s', content.title)
    }
    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'Artist'])) {
      content.artist = raw.CurrentTrackMetaData.Artist
    }

    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'Album'])) {
      content.album =raw.CurrentTrackMetaData.Album
    }
    if (module.exports.isValidProperty(raw, ['CurrentTrackMetaData', 'AlbumArtUri'])) {
      content.artUri = raw.CurrentTrackMetaData.AlbumArtUri
    }
    
    let playbackstate
    if (module.exports.isValidProperty(raw, ['TransportState'])) {
      playbackstate = raw.TransportState.toLowerCase()
    }

    // TODO What is with Enqueued data= those of the initial command to play the playlist, ....
 
    return { content, contentCategory, playbackstate }
  },

  betterGroupRenderingData: (data) => {
    debug('method >>%s', 'transformGroupRenderingData')
    const better = {}
    if (module.exports.isValidProperty(data, ['GroupMute'])) {
      better.groupMuteState = (data.GroupMute ? 'on' : 'Off')
      debug('groupMuteState >>%s', better.groupMuteState)
    }
    if (module.exports.isValidProperty(data, ['GroupVolume'])) {
      better.groupVolume = data.GroupVolume
      debug('groupVolume >>%s', better.groupVolume)
    }
    return better
  },

  betterZoneData: (raw, playerHostname) => {
    debug('method >>%s', 'transformZoneData')
    // TODO async an throw exception when no player found
    const better = {}
    if (module.exports.isValidProperty(raw, ['ZoneGroupState'])) {
      const allGroupArray = raw.ZoneGroupState
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
      // TODO return error if -1

      better.groupName = allGroupArray[foundGroupIndex].name
      better.coordinatorName = allGroupArray[foundGroupIndex].coordinator.name
      better.coordinatorHostname = allGroupArray[foundGroupIndex].coordinator.host
      better.groupSize = allGroupArray[foundGroupIndex].members.length
      better.groupMemberNames = allGroupArray[foundGroupIndex].members.map((member) => {
        return member.name // as this name comes from sonos-ts 
      })
    }
    return better 
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
  getContentCategory: (avTransportUri) => {
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