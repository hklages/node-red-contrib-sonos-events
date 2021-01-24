const { encodeHtmlEntity, decodeHtmlEntity } = require('../src/Helper.js')

const { describe, it } = require('mocha')
const { expect } = require('chai')

describe('encodeHtmlEntity function', () => {

  it('null throws error', async () => {
    const value = null
    await encodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'undefined or null')
      })
  })

  it('undefined throws error', async () => {
    let value
    await encodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'undefined or null')
      })
  })

  it('object throws error', async () => {
    const value = {}
    await encodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'not string')
      })
  })

  it('number throws error', async () => {
    const value = 151
    await encodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'not string')
      })
  })

  it('NaN throws error', async () => {
    const value = NaN
    await encodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'not string')
      })
  })

  it('Infinity throws error', async () => {
    const value = Infinity
    await encodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'not string')
      })
  })

  it('empty string allowed', async ()  => {
    const value = ''
    const result = await encodeHtmlEntity(value)
    expect(result).
      be.a('string').
      equal(value)
  })

  it('no encoding', async ()  => {
    const value = 'Hello Dolly abcdefghijklmnopqrstuvwxyz'
    const result = await encodeHtmlEntity(value)
    expect(result).
      be.a('string').
      equal(value)
  })

  it('simple encoding <>', async () => {
    const value = '<Hello Dolly>'
    const result = await encodeHtmlEntity(value)
    expect(result)
      .be.a('string')
      .equal('&lt;Hello Dolly&gt;')
  })

  it('multiple occurrences <>', async () => {
    const value = '<He<l<lo> Dol>ly>'
    const result = await encodeHtmlEntity(value)
    expect(result)
      .be.a('string')
      .equal('&lt;He&lt;l&lt;lo&gt; Dol&gt;ly&gt;')
  })

  it('all special character encoding', async () => {
    const value = '<>\'&"'
    const result = await encodeHtmlEntity(value)
    expect(result)
      .be.a('string')
      .equal('&lt;&gt;&apos;&amp;&quot;')
  })

})

describe('decodeHtmlEntity function', () => {

  it('null throws error', async () => {
    const value = null
    await decodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'undefined or null')
      })
  })

  it('undefined throws error', async () => {
    let value
    await decodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'undefined or null')
      })
  })

  it('object throws error', async () => {
    const value = {}
    await decodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'not string')
      })
  })

  it('number throws error', async () => {
    const value = 151
    await decodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'not string')
      })
  })

  it('NaN throws error', async () => {
    const value = NaN
    await decodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'not string')
      })
  })

  it('Infinity throws error', async () => {
    const value = Infinity
    await decodeHtmlEntity(value)
      .catch(function (err) {
        expect(function () {
          throw err 
        }).to.throw(Error, 'not string')
      })
  })

  it('empty string allowed', async ()  => {
    const value = ''
    const result = await decodeHtmlEntity(value)
    expect(result).
      be.a('string').
      equal(value)
  })

  it('no encoding', async ()  => {
    const value = 'Hello Dolly abcdefghijklmnopqrstuvwxyz'
    const result = await decodeHtmlEntity(value)
    expect(result).
      be.a('string').
      equal(value)
  })

  it('simple encoding <>', async () => {
    const value = '&lt;Hello Dolly&gt;'
    const result = await decodeHtmlEntity(value)
    expect(result)
      .be.a('string')
      .equal('<Hello Dolly>')
  })

  it('multiple occurrences <>', async () => {
    const value = '&lt;He&lt;l&lt;lo&gt; Dol&gt;ly&gt;'
    const result = await decodeHtmlEntity(value)
    expect(result)
      .be.a('string')
      .equal('<He<l<lo> Dol>ly>')
  })

  it('all special character encoding', async () => {
    const value = '&lt;&gt;&apos;&amp;&quot;'
    const result = await decodeHtmlEntity(value)
    expect(result)
      .be.a('string')
      .equal('<>\'&"')
  })

})