
/**
 * Node create a selection of events.
 *
 * @module selection
 * 
 * @author Henning Klages
 * 
 * @since 
*/

'use strict'
const {
  improvedGroupManagementService, improvedAudiIn, improvedAvTransportData,
  improvedGroupRenderingData, improvedDeviceProperties, improvedRenderingControl,
  improvedZoneData } = require('./Helper')
  
const { SonosDevice } = require('@svrooij/sonos/lib')
const debug = require('debug')('nrcse:selection')

module.exports = function (RED) {

  /** Create event node notification based on configuration and send messages
   * @param  {object} config current node configuration data
  */
  
  function sonosEventsSelectionNode (config) {
    debug('method >>%s', 'sonosEventsSelectionNode')
    RED.nodes.createNode(this, config)
   
    // clear node status, get data from dialog
    const node = this
    node.status({})

    const subscriptions = config.events

    // create new player from input such as 192.168.178.37
    const player = new SonosDevice(config.playerHostname)

    // async wrapper, status and error handling
    asyncSubscribeToMultipleEvents(node, subscriptions, player)
      .then((success) => { // success, when handler is successfully established
        node.status({ fill: 'green', shape: 'ring', text: 'connected' })
        node.debug(`success >>${JSON.stringify(success)}`)
      })
      .catch((error) => {
        node.status({ fill: 'red', shape: 'ring', text: 'disconnected' })
        node.debug(`error subscribe>>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
      })
 
    // unsubscribe to all, when node is deleted (redeployed does delete)
    node.on('close', function (done) {
      cancelAllSubscriptions(player, subscriptions)
        .then(() => {
          debug('nodeOnClose >>all subscriptions canceled')
          done()
        })
        .catch(error => {
          debug(`nodeOnClose error during cancel subscriptions >>
            ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
          done(error)
        })
    })

    return true
  }

  RED.nodes.registerType('sonosevents-selection', sonosEventsSelectionNode)

}

async function asyncSubscribeToMultipleEvents (node, subscriptions, player) {
    
  let errorCount = 0 // global and command. be aware!
  const msgArray = []
  const msgMaster = []

  // extract services, remove duplicates and subscribe
  let services = subscriptions.map((item) => item.name.split('.')[0])
  services = services.filter((c, index) => {
    return services.indexOf(c) === index
  })
 
  if (services.includes('AudioInService')) {
    await player.AudioInService.Events.on('serviceEvent', sendMsgAudioInService)
    debug('subscribed to AudioInService')
  }
  if (services.includes('AlarmClockService')) {
    await player.AlarmClockService.Events.on('serviceEvent', sendMsgAlarmClock)
    debug('subscribed to AlarmClockService')
  }
  if (services.includes('AVTransportService')) {
    await player.AVTransportService.Events.on('serviceEvent', sendMsgsAVTransport.bind(this, 7))
    debug('subscribed to AVTransportService')
  }
  if (services.includes('ConnectionManagerService')) {
    await player.ConnectionManagerService.Events.on('serviceEvent', sendMsgsConnectionManager)
    debug('subscribed to ConnectionManagerService')
  }
  if (services.includes('ContentDirectoryService')) {
    await player.ContentDirectoryService.Events.on('serviceEvent', sendMsgContentDirectory)
    debug('subscribed to ContentDirectoryService')
  }
  if (services.includes('DevicePropertiesService')) {
    await player.DevicePropertiesService.Events.on('serviceEvent', sendMsgDeviceProperties)
    debug('subscribed to DevicePropertiesService')
  }
  if (services.includes('GroupManagementService')) {
    await player.GroupManagementService.Events.on('serviceEvent', sendMsgGroupManagement)
    debug('subscribed to GroupManagementService')
  }
  if (services.includes('GroupRenderingControlService')) {
    // eslint-disable-next-line max-len
    await player.GroupRenderingControlService.Events.on('serviceEvent', sendMsgsGroupRenderingControl)
    debug('subscribed to GroupRenderingControlService')
  }
  if (services.includes('MusicServicesService')) {
    await player.MusicServicesService.Events.on('serviceEvent', sendRaw)
    debug('subscribed to MusicServicesService')
  }
  if (services.includes('QueueService')) {
    await player.QueueService.Events.on('serviceEvent', sendRaw)
    debug('subscribed to QueueService')
  }
  if (services.includes('RenderingControlService')) {
    await player.RenderingControlService.Events.on('serviceEvent', sendMsgRenderingControl)
    debug('subscribed to RenderingControlService')
  }
  if (services.includes('SystemPropertiesService')) {
    await player.SystemPropertiesService.Events.on('serviceEvent', sendRaw)
    debug('subscribed to SystemPropertiesService')
  }
  if (services.includes('VirtualLineInService')) {
    await player.VirtualLineInService.Events.on('serviceEvent', sendRaw)
    debug('subscribed to VirtualLineInService')
  }
  if (services.includes('ZoneGroupTopologyService')) {
    await player.ZoneGroupTopologyService.Events.on('serviceEvent', sendMsgZoneGroup)
    debug('subscribed to ZoneGroupTopologyService')
  }
  
  return true

  // .............. sendMsg functions ...............
  // only output to requested output lines, prepare data
  // uses global node
  async function sendMsgsAVTransport (index, raw) {
    debug('new AVTransportService event')
    console.log('raw >>>' + JSON.stringify(raw))
    console.log('index should be 7 >>>' + JSON.stringify(index))
    
    let payload = {}
    let topic = ''
    let msgIndex = 0
    try {
      // define msg s
      const topicPrefix = `group/${player.host}/AVTransportService/`
      const improved = await improvedAvTransportData(raw)
      
      if (subscriptions.avTransportRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++
      
      if (subscriptions.basics && improved.basics !== null) {
        const msg = msgMaster.slice()
        payload = improved.basics
        topic = topicPrefix + 'basics'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)  
      }
      msgIndex++
      
      if (subscriptions.content && improved.content !== null) {
        const msg = msgMaster.slice()
        payload = improved.content
        topic = topicPrefix + 'content'
        msg[msgIndex] = { payload, raw, topic, 'properties': Object.keys(raw) }
        node.send(msg)
      }
      msgIndex++
      
      if (subscriptions.playbackstate && subscriptions.playbackstate !== null) {
        const msg = msgMaster.slice()
        payload = improved.playbackstate
        topic = topicPrefix + 'playbackstate'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++
      
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AVTransport event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  // only output to requested output lines, prepare data
  // uses global node
  async function sendMsgsGroupRenderingControl (raw) {
    debug('new GroupRenderingControlService event')
    let payload = {}
    let topic = ''
    let msgIndex = 5
    try {
      const topicPrefix = `group/${player.host}/groupRenderingControl/`
      const improved = await improvedGroupRenderingData(raw) 

      if (subscriptions.groupRenderingControlRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.groupVolume && improved.groupVolume !== null) {
        const msg = msgMaster.slice()
        payload = improved.groupVolume
        topic = topicPrefix + 'groupVolume'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++
      
      if (subscriptions.groupMutestate && improved.groupMutestate !== null) {
        const msg = msgMaster.slice()
        payload = improved.groupMutestate
        topic = topicPrefix + 'groupMutestate'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing GroupRenderingControlService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
  
  async function sendMsgsConnectionManager (raw) {
    debug('new sendMsgsConnectionManager event')
    
    const msgIndex = 0

    try {
      // define msg s
      const msg = msgArray.slice()
      const payload = raw
      const topic = 'connection manager'
      msg[msgIndex] = { payload, topic }
      node.send(msg)
      
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing ConnectionManagerService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  // only output to requested output lines, prepare data
  // uses global node
  async function sendRaw (raw) {
    debug('new multiple event')
    
    const msgIndex = 1
   
    try {
      const msg = msgArray.slice()
      const payload = raw
      const topic = 'multiple'
      msg[msgIndex] = { payload, topic }
      node.send(msg)

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing different event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
  async function sendMsgZoneGroup (raw) {
    debug('new ZoneGroupTopologyService event')
    let payload = {}
    let topic = ''
    let msgIndex = 0
    try {
      const topicPrefix =  `household/${player.host}/zoneGroupTopology/`
      const improved = await improvedZoneData(raw)
      
      if (subscriptions.zoneGroupTopologyRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }        
        node.send(msg)
      }
      msgIndex++ 

      if (subscriptions.allGroups && improvedZoneData.allGroups !== null) {
        const msg = msgMaster.slice()
        payload = improved.allGroups
        topic = topicPrefix + 'allGroups'
        msg[msgIndex] = { payload, raw, topic }        
        node.send(msg)
      }
      msgIndex++ 
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing ZoneGroupTopology event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgAlarmClock (raw) {
    debug('new AlarmClockService event')
    let payload = {}
    let topic = ''
    let msgIndex = 4
    try {
      const topicPrefix = `household/${player.host}}/alarmClock/`
      
      if (subscriptions.avTransportRaw) {
        payload = raw
        topic = topicPrefix + 'raw'
        const msg = msgMaster.slice()
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AlarmClockService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgContentDirectory (raw) {
    debug('new ContentDirectoryService event >>')
    let payload = {}
    let topic = ''
    let msgIndex = 6
    try {
      const topicPrefix = `household/${player.host}/ContentDirectory/`
      
      if (subscriptions.contentDirectoryRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing ContentDirectoryService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
  async function sendMsgRenderingControl (raw) {
    debug('new RenderingControl event')
    let payload = {}
    let topic = ''
    let msgIndex = 0
    try {
      const topicPrefix = `player/${player.host}/renderingControl/`
      const improved = await improvedRenderingControl(raw)
      
      if (subscriptions.renderingControlRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.volume && improved.volume !== null) {
        const msg = msgMaster.slice()
        payload = improved.volume
        topic = topicPrefix + 'volume'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.mutestate && improved.mutestate !== null) {
        const msg = msgMaster.slice()
        payload = improved.mutestate
        topic = topicPrefix + 'mutestate'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing volume event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }

  async function sendMsgGroupManagement (raw) {
    debug('new GroupManagementService event')
    let payload = {}
    let topic = ''
    let msgIndex = 5
    try { 
      const topicPrefix = `group/${player.host}/groupManagementService/`
      const improved = await improvedGroupManagementService(raw) 

      if (subscriptions.groupManagementRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.localGroupUuid && improved.localGroupUuid !== null) {
        const msg = msgMaster.slice()
        payload = improved.localGroupUuid
        topic = topicPrefix + 'localGroupUuid'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++
      
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing GroupManagementService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
    
  async function sendMsgAudioInService (raw) {
    debug('new AudioInService event')
    let payload = {}
    let topic = ''
    let msgIndex = 8
    try {
      const topicPrefix = `group/${player.host}/audioIn/`
      const improved = await improvedAudiIn(raw) 

      if (subscriptions.audioInServiceRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.playing && improved.playing !== null) {
        const msg = msgMaster.slice()
        payload = improved.playing
        topic = topicPrefix + 'playing'
        msg[msgIndex] = { payload, raw, topic }
        node.send(msg)
      }
      msgIndex++
      
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing AudioInService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
  
  async function sendMsgDeviceProperties (raw) {
    debug('new DevicePropertiesService event')
    let payload = {}
    let topic = ''
    let msgIndex = 10
    try {
      const topicPrefix = `group/${player.host}/deviceProperties/`
      const improved = await improvedDeviceProperties(raw) 
      
      if (subscriptions.devicePropertiesRaw) {
        const msg = msgMaster.slice()
        payload = raw
        topic = topicPrefix + 'raw'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++

      if (subscriptions.micEnabled && improved.micEnabled !== null) {
        const msg = msgMaster.slice()
        payload = improved.micEnabled
        topic = topicPrefix + 'micEnabled'
        msg[msgIndex] = { payload, topic }
        node.send(msg)
      }
      msgIndex++
     
    } catch (error) {
      errorCount++
      node.status({ fill: 'yellow', shape: 'ring', text: `error count ${errorCount}` })
      // eslint-disable-next-line max-len
      node.debug(`error processing DevicePropertiesService event >>${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
    }
  }
}

async function cancelAllSubscriptions (player) {
  
  // TODO verify that it is OK to cancel all although there might not be a subscription
  // TODO How to unsubscribe only those created by this node (not impacting nodes with same ip)
  await player.VirtualLineInService.Events.removeAllListeners('serviceEvent')
  await player.ConnectionManagerService.Events.removeAllListeners('serviceEvent')
  await player.QueueService.Events.removeAllListeners('serviceEvent')
  await player.SystemPropertiesService.Events.removeAllListeners('serviceEvent')
  await player.MusicServicesService.Events.removeAllListeners('serviceEvent')
}