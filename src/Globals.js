/**
 * Collection of constants being used in several modules.
 *
 * @module Globals
 * 
 * @author Henning Klages
 * 
 * 
 * 
 * @since 2021-02-26
*/

'use strict'

module.exports = {

  PACKAGE_PREFIX: 'nrcse:',
  REGEX_3DIGITSSIGN: /^[-+]?\d{1,3}$/, 
  REGEX_IP: /^(([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(\.(?!$)|$)){4}$/,
  REGEX_DNS: /^((?!-)[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,6}$/i,
  TIMEOUT_PLAYER_DISCOVERY: 'No players found'

}
