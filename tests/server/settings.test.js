import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadSettings, saveSettings, getDefaults } from '../../server/settings.js'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('settings', () => {
  const tmpFile = join(tmpdir(), `test-settings-${Date.now()}.json`)

  afterEach(() => {
    try { unlinkSync(tmpFile) } catch {}
  })

  it('getDefaults returns fresh defaults', () => {
    const d = getDefaults()
    expect(d.intervals.cpu).toBe(2)
    expect(d.intervals.memory).toBe(5)
    expect(d.intervals.gpu).toBe(5)
    expect(d.intervals.network).toBe(60)
    expect(d.intervals.disk).toBe(30)
    expect(d.intervals.smart).toBe(300)
    expect(d.intervals.fans).toBe(10)
    expect(d.targets).toHaveLength(1)
    expect(d.targets[0].name).toBe('Local')
    expect(d.activeTarget).toBe(0)
  })

  it('getDefaults returns independent copies', () => {
    const a = getDefaults()
    const b = getDefaults()
    a.intervals.cpu = 999
    expect(b.intervals.cpu).toBe(2)
  })

  it('loadSettings returns defaults when file missing', () => {
    const s = loadSettings('/nonexistent/path.json')
    expect(s.intervals.cpu).toBe(2)
    expect(s.targets[0].name).toBe('Local')
  })

  it('loadSettings returns defaults for invalid JSON', () => {
    writeFileSync(tmpFile, 'not json!!', 'utf-8')
    const s = loadSettings(tmpFile)
    expect(s.intervals.cpu).toBe(2)
  })

  it('loadSettings merges saved with defaults', () => {
    writeFileSync(tmpFile, JSON.stringify({ intervals: { cpu: 10 } }), 'utf-8')
    const s = loadSettings(tmpFile)
    expect(s.intervals.cpu).toBe(10)
    expect(s.intervals.memory).toBe(5) // default preserved
    expect(s.targets).toHaveLength(1)
  })

  it('saveSettings writes and returns settings', () => {
    const data = { intervals: { cpu: 7 }, targets: [{ name: 'X', url: '' }], activeTarget: 0 }
    const result = saveSettings(data, tmpFile)
    expect(result).toEqual(data)
    expect(existsSync(tmpFile)).toBe(true)

    const loaded = loadSettings(tmpFile)
    expect(loaded.intervals.cpu).toBe(7)
  })
})
