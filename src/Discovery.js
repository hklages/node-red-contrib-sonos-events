/**
 * Routines for Discovery
 *
 * @module Discovery
 * 
 * @author Henning Klages
 * 
 * @since 2021-01-02
*/

'use strict'

const { getGroupsAllFast } = require('./Commands.js')

const { SonosDeviceDiscovery, SonosDevice } = require('@svrooij/sonos/lib')

const { networkInterfaces } = require('os')

const debug = require('debug')('nrcse:Discovery')

module.exports = {

  discoverGroupsAll: async () => {
    // discover the first player. 
    const deviceDiscovery = new SonosDeviceDiscovery()
    debug('starting discovery')
    const firstPlayerData = await deviceDiscovery.SearchOne(5)
    debug('found one player found')
    const firstPlayer = new SonosDevice(firstPlayerData.host)
    const allGroups = await getGroupsAllFast(firstPlayer)
    return allGroups
  },
  
  discoverPlayers: async () => {
    // discover the first one an get all others because we need also the player names
    // and thats very reliable -deterministic. Discovering 10 player might be time consuming
    // Sonos player knew best the topology
    const deviceDiscovery = new SonosDeviceDiscovery()
    debug('starting discovery')
    const firstPlayerData = await deviceDiscovery.SearchOne(5)
    debug('first player found')
    const firstPlayer = new SonosDevice(firstPlayerData.host)
    const allGroups = await getGroupsAllFast(firstPlayer)

    const flatList = [].concat.apply([], allGroups)
    debug('got more players, in total >>%s', flatList.length)
    const reducedList = flatList.map((item) => {
      return {
        'label': item.playerName,
        'value': item.url.hostname
      }
    })
    return reducedList
  },

  discoverCoordinators: async function () {
    // discover the first one an get all coordinators
    // and thats very reliable -deterministic. Discovering 10 player might be time consuming
    // Sonos player knew best the topology
    const deviceDiscovery = new SonosDeviceDiscovery()
    debug('start discovery for first player')
    const firstPlayerData = await deviceDiscovery.SearchOne(3)
    debug('first player found')
    const firstPlayer = new SonosDevice(firstPlayerData.host)
    const allGroups = await getGroupsAllFast(firstPlayer)
    const coordinatorArray = allGroups.map((group) => {
      return group[0]
    })
    const reducedList = coordinatorArray.map((item) => {
      return {
        'label': item.playerName,
        'value': item.url.hostname
      }
    })
    return reducedList
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

  getHostIpV230: async () => {
    const ifaces = networkInterfaces()

    let interfaces = Object.keys(ifaces).filter((k) => k !== 'lo0')
    if (process.env.SONOS_LISTENER_INTERFACE) {
      interfaces = interfaces.filter((i) => i === process.env.SONOS_LISTENER_INTERFACE)
    } else {
      // Remove unwanted interfaces on windows
      interfaces = interfaces.filter((i) => i.indexOf('vEthernet') === -1
        && i.indexOf('tun') === -1)
    }
    if (interfaces === undefined || interfaces.length === 0) {
      throw new Error('No network interfaces found')
    }

    let address

    interfaces.every((inf) => {
      const currentInterface = ifaces[inf]
      if (currentInterface === undefined) return true
      const info = currentInterface.find((i) => i.family === 'IPv4' && i.internal === false)
      if (info !== undefined) {
        address = info.address
        return false
      }
      return true
    })

    if (address !== undefined) return address
    throw new Error('No non-internal ipv4 addresses found')
  }
} 