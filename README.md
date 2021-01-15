## node-red-contrib-sonos-plus

[![Dependencies](https://david-dm.org/hklages/node-red-contrib-sonos-events.svg)](https://david-dm.org/hklages/node-red-contrib-sonos-events)
[![npm](https://img.shields.io/npm/dt/node-red-contrib-sonos-events.svg)](https://www.npmjs.com/package/node-red-contrib-sonos-events)
[![npm](https://img.shields.io/npm/v/node-red-contrib-sonos-events.svg)](https://www.npmjs.com/package/node-red-contrib-sonos-events)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/hklages/node-red-contrib-sonos-plus/master/LICENSE)
[![Donation](https://img.shields.io/badge/donation-cappuccino-orange)](https://www.buymeacoffee.com/hklages)

----- CAUTION: 2020-12 & 2021-01 A LOT OF FLOW BREAKING CHANGES WILL BE IMPLEMENTED - NO SUPPORT DURING THIS TIME --------

A set of [Node-RED](https://nodered.org/) nodes to receive events from [SONOS](https://www.sonos.com/) player in your local network.

Subscribe to a growing list of event types to get notifications about changes related to tracks, playback state, volume, mute state, group volume, group mute state, topology, ...
Reduce traffic and load by subscribing only to specific players and groups.

Works (strives for well) with [RedMatic](https://github.com/rdmtc/RedMatic/blob/master/README.en.md).

This package is in no way connected to or supported by Sonos Incorporation.

### SUPPORT

Either open a github issue (preferred method) or send an email to nrcsplus@gmail.com

### NEWS

- 3 nodes for household, group, player

### Installation

Install directly from your Node-RED's setting palette.

The status of the event listener ist at `http://<hostname>:<port>/status`
Port default is 6329.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Credentials

[Stephan](https://github.com/svrooij)

[sonos Typescript team](https://github.com/svrooij/node-sonos-ts/blob/master/README.md) for the API.
