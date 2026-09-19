import { mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Store } from '../src/main/store'
import { localDate } from '../src/shared/types'
const directories: string[] = []
const directory = () => { const path = mkdtempSync(join(tmpdir(), 'stand-store-test-')); directories.push(path); return path }
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }) })
describe('local storage', () => {
  it('persists settings and completed breaks across restarts', () => {
    const path = directory(); const store = new Store(path)
    store.settings.workMinutes = 30
    store.stats = { date: localDate(), breaks: 2, activeMinutes: 10 }
    store.save()
    const restored = new Store(path)
    expect(restored.settings.workMinutes).toBe(30)
    expect(restored.stats.breaks).toBe(2)
    expect(JSON.parse(readFileSync(join(path, 'settings.json'), 'utf8')).version).toBe(1)
  })
  it('backs up invalid JSON and recovers with defaults', () => {
    const path = directory(); writeFileSync(join(path, 'settings.json'), '{broken')
    const store = new Store(path)
    expect(store.error).toBeTruthy()
    expect(store.settings.workMinutes).toBe(45)
    expect(readdirSync(path).some(name => name.includes('.corrupt-'))).toBe(true)
  })
  it('resets daily totals after midnight', () => {
    const store = new Store(directory())
    store.stats = { date: '2000-01-01', breaks: 10, activeMinutes: 50 }
    store.refreshDay()
    expect(store.stats).toEqual({ date: localDate(), breaks: 0, activeMinutes: 0 })
  })
})
