import { describe, it, expect } from 'vitest'
import { isValidExternalUrl } from './route'

describe('isValidExternalUrl', () => {
  it('accepts valid https URLs', () => {
    expect(isValidExternalUrl('https://example.com/recipe')).toBe(true)
  })

  it('accepts valid http URLs', () => {
    expect(isValidExternalUrl('http://example.com/recipe')).toBe(true)
  })

  it('rejects ftp protocol', () => {
    expect(isValidExternalUrl('ftp://example.com/file')).toBe(false)
  })

  it('rejects file protocol', () => {
    expect(isValidExternalUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects javascript protocol', () => {
    expect(isValidExternalUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects localhost', () => {
    expect(isValidExternalUrl('http://localhost:3000')).toBe(false)
  })

  it('rejects 127.0.0.1', () => {
    expect(isValidExternalUrl('http://127.0.0.1')).toBe(false)
  })

  it('rejects 0.0.0.0', () => {
    expect(isValidExternalUrl('http://0.0.0.0')).toBe(false)
  })

  it('rejects .local domains', () => {
    expect(isValidExternalUrl('http://myserver.local')).toBe(false)
  })

  it('rejects .internal domains', () => {
    expect(isValidExternalUrl('http://app.internal')).toBe(false)
  })

  it('rejects AWS metadata endpoint', () => {
    expect(isValidExternalUrl('http://169.254.169.254/latest/meta-data/')).toBe(false)
  })

  it('rejects 10.x.x.x private range', () => {
    expect(isValidExternalUrl('http://10.0.0.1')).toBe(false)
  })

  it('rejects 192.168.x.x private range', () => {
    expect(isValidExternalUrl('http://192.168.1.1')).toBe(false)
  })

  it('rejects 172.16-31.x.x private range', () => {
    expect(isValidExternalUrl('http://172.16.0.1')).toBe(false)
    expect(isValidExternalUrl('http://172.31.255.255')).toBe(false)
  })

  it('allows 172.32.x.x (outside private range)', () => {
    expect(isValidExternalUrl('http://172.32.0.1')).toBe(true)
  })

  it('rejects invalid URLs', () => {
    expect(isValidExternalUrl('not-a-url')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidExternalUrl('')).toBe(false)
  })
})
