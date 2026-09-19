import { describe, expect, it } from 'vitest'
import { ReminderTimer } from '../src/main/timer'
import { DEFAULT_SETTINGS, validateSettings } from '../src/shared/types'

function fixture(autoStart = true) {
  let now = 0
  const timer = new ReminderTimer({ ...DEFAULT_SETTINGS, workMinutes: 1, breakMinutes: 1, autoStart }, () => now)
  return { timer, advance: (ms: number) => { now += ms; return timer.tick() } }
}
describe('reminder lifecycle', () => {
  it('starts a full break after work, even after a delayed tick', () => {
    const { timer, advance } = fixture()
    expect(advance(90_000)).toBe('break-started')
    expect(timer.snapshot()).toMatchObject({ phase: 'break', remainingMs: 60_000 })
    expect(advance(60_000)).toBe('break-completed')
    expect(advance(60_000)).toBeUndefined()
    expect(timer.snapshot()).toMatchObject({ running: false, completed: true })
    timer.action('finish')
    expect(timer.snapshot()).toMatchObject({ phase: 'work', running: true, remainingMs: 60_000 })
  })
  it('preserves the remaining interval during a pause or system sleep', () => {
    const { timer, advance } = fixture()
    advance(20_000); timer.action('pause'); advance(900_000)
    expect(timer.snapshot().remainingMs).toBe(40_000)
    timer.action('resume'); advance(39_000)
    expect(timer.snapshot().remainingMs).toBe(1_000)
    expect(advance(1_000)).toBe('break-started')
  })
  it('snoozes without counting an incomplete break', () => {
    const { timer, advance } = fixture()
    timer.action('break-now'); advance(10_000); timer.action('finish')
    expect(timer.snapshot().phase).toBe('break')
    timer.action('snooze')
    expect(timer.snapshot()).toMatchObject({ phase: 'work', remainingMs: 300_000, completed: false })
    expect(advance(300_000)).toBe('break-started')
  })
  it('applies changed durations only to new phases', () => {
    const { timer, advance } = fixture()
    advance(10_000)
    timer.configure({ ...DEFAULT_SETTINGS, breakMinutes: 2 })
    expect(timer.snapshot().remainingMs).toBe(50_000)
    advance(50_000)
    expect(timer.snapshot().remainingMs).toBe(120_000)
    timer.action('skip')
    expect(timer.snapshot().remainingMs).toBe(45 * 60_000)
  })
  it('supports starting paused and ignores repeated break commands', () => {
    const { timer, advance } = fixture(false)
    advance(80_000)
    expect(timer.snapshot().remainingMs).toBe(60_000)
    timer.action('break-now'); advance(10_000); timer.action('break-now')
    expect(timer.snapshot().remainingMs).toBe(50_000)
  })
})
describe('settings validation', () => {
  it('rejects malformed or out-of-range values at the IPC boundary', () => {
    for (const workMinutes of [0, -1, 181, 1.5, NaN, '45']) expect(() => validateSettings({ ...DEFAULT_SETTINGS, workMinutes })).toThrow()
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, autoStart: 'true' })).toThrow()
    expect(() => validateSettings(null)).toThrow()
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS)
  })
})
