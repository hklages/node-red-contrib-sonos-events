## node-red-contrib-sonos-events

[![Dependencies](https://david-dm.org/hklages/node-red-contrib-sonos-events.svg)](https://david-dm.org/hklages/node-red-contrib-sonos-events)
[![npm](https://img.shields.io/npm/dt/node-red-contrib-sonos-events.svg)](https://www.npmjs.com/package/node-red-contrib-sonos-events)
[![npm](https://img.shields.io/npm/v/node-red-contrib-sonos-events.svg)](https://www.npmjs.com/package/node-red-contrib-sonos-events)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://GitHub.com/Naereen/StrapDown.js/graphs/commit-activity)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/hklages/node-red-contrib-sonos-plus/master/LICENSE)
[![Donation](https://img.shields.io/badge/donation-cappuccino-orange)](https://www.buymeacoffee.com/hklages)

A single [Node-RED](https://nodered.org/) node to receive events from any [SONOS](https://www.sonos.com/) player in your local network.

Works well with [Home Assistant](https://www.home-assistant.io/), [RedMatic](https://github.com/rdmtc/RedMatic/blob/master/README.en.md) and with the sister package [node-red-contrib-sonos-plus](https://www.npmjs.com/package/node-red-contrib-sonos-plus), executing SONOS commands.

This package is in no way connected to or supported by Sonos Incorporation.

### FUNCTIONALITY

You can subscribe to many kinds of changes such as new tracks, tv on, playbackstate, volume, mute, group member changes and more.

Explore the full scope in the [wiki](https://github.com/hklages/node-red-contrib-sonos-plus/wiki/A.4-Events-aka-Notifications).

### QUICKSTART - DEBUG - SUPPORT

Read the [Quickstart](https://github.com/hklages/node-red-contrib-sonos-plus/wiki/A.4-Events-aka-Notifications#quickstart) and the examples in Node-RED "Import", "Examples".

Set the ENV variable DEBUG for debugging (example DEBUG=nrcsp:discovery). Usage is described [here](https://www.npmjs.com/package/debug). Prefix: nrcsp: and available keywords: selection|config|commands|extensions|helper|discovery|).

Open a GitHub issue (preferred method) or send an email to nrcsplus@gmail.com (English/German).

### NEWS

- discovery of player (selection node) and listener IP (config node) should now work in more environments

### Installation

Install directly from your Node-RED's setting palette.

The status of the event listener ist at `http://<hostname>:<port>/status`. Default port is 6329.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Credentials

[Stephan](https://github.com/svrooij)

[svrooij node-sonos-ts](https://github.com/svrooij/node-sonos-ts/blob/master/README.md)
