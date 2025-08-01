## Changelog

All notable changes to this project are documented in this file.

### [1.2.6] 2025-07-31

#### Changed

- update dependencies

### [1.2.5] 2024-06-15

#### Changed

- roll back dependency ts-sonos to version 2.5.0

### [1.2.4] 2024-05-01

#### Changed

- dependency update beta-11

### [1.2.3] 2024-04-16

#### Changed

- dependency update

### [1.2.2] 2024-04-16

#### Changed

- dependency update

### [1.2.1]2023-07-23

#### Changed

- bug fix discovery

### [1.2.0] 2023-01-06

#### Changed

- New algorithm to discover player

- Updated dependencies

### [1.1.0] 2022-07-03

#### Added

- DNS names for SONOS-Player are now allowed

#### Changed

- update dependencies

### [1.0.2] 2021-09-24

#### Changed

- update dependencies

### [1.0.1] 2021-04-29

#### Changed

- Discovery for player and lister with httpAdmin

- using Services.ServiceEvent

- update dependencies

### [1.0.0] 2021-03-20

#### Changed

- modified internal isTruthy suite

- property Invisible is now in group and device properties

- config node: no ENV variable for listener anymore and validating input for port and hostname

- changed property processingUnit to processingType

- using Helper from sonos-plus

- update dependencies

- in GroupsMembers - url renamed to urlObject - same as in sonos -plus

- Using Mocha, chai for testing, html encode async

### [0.4.2] 2021-01-22

#### Changed

- color of node

- bug fix: node name is now stored

### [0.4.1] 2021-01-22

#### Added

- Examples

### [0.4.0] 2021-01-20

#### Changed

- using different algorithm to get the local ip - should work on CCU and more devices

- added more events

- topology group now with array as array - thats easier to process then array of object

- some properties are renamed

- update documentation Wiki

- update dev dependencies

### [0.3.2] 2021-01-18

#### Changed

- dependencies node-sonos-ts 2.3.0

- additional endpoints

- update documentation

### [0.3.1] 2021-01-18

#### Changed

- now delete ENV variable if config text field is empty

- now select ip address in config node

- some bug fixing

### [0.3.0] 2021-01-17

#### Changed

- one node for all events per player - all others nodes are "gone"S

- new algorithm to find ip address for listener

- code optimization

### [0.2.0] 2021-01-15

#### Changed

- new node "selection"- on node of everything

- test getIp via http

### [0.1.0] 2021-01-14

#### Changed

- new group to explore new interface

- updated eslint dependencies

- test getIp via http, renaming to discovery

### [0.0.20/21] 2021-01-12

#### Changed

- group now with new events/outputs

- player with new events/ outputs

- household with new events/outputs

### [0.0.17/18/19] 2021-01-10

#### Changed

- httpNode group and endpoint

### [0.0.16] 2021-01-10

#### Changed

- httpNode instead of Admin

- added CurrentTransportActions, Playmode to AVTransport

### [0.0.15] 2021-01-08

#### Changed

- split content and AVTransport

- devDependency update

### [0.0.14] 2021-01-08

#### Changed

- more content

- devDependency update

### [0.0.13] 2021-01-04

#### Changed

- discovery for coordinators

- bugfix groupVolume/groupMute mixed up

### [0.0.12] 2021-01-04

#### Changed

- 8 outputs for every node (some for future use)

- bug fixing

- help and link to wiki

- code restructuring

### [0.0.11] 2021-01-02

#### Changed

- group mute state bug - now lowercase instead of mixed

- output for any value - not bundled

- search with httpAdmin instead of node

### [0.0.10] 2021-01-02

#### Changed

- Three nodes types for household, group, player
