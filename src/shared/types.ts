export interface Settings {
  workMinutes: number
  breakMinutes: number
  snoozeMinutes: number
  autoStart: boolean
  allDisplays: boolean
  selectedPetId: string
}
export const DEFAULT_SETTINGS: Settings = {
  workMinutes: 45, breakMinutes: 5, snoozeMinutes: 5,
  autoStart: true, allDisplays: true, selectedPetId: 'sprout-student'
}
export type Phase = 'work' | 'break'
export type Action = 'pause' | 'resume' | 'reset' | 'break-now' | 'snooze' | 'skip' | 'finish'
export interface TimerState {
  phase: Phase
  running: boolean
  remainingMs: number
  durationMs: number
  completed: boolean
}
export interface DailyStats { date: string; breaks: number; activeMinutes: number }
export interface ReminderContent { title: string; message: string; quote: string; source: string }
export interface Snapshot {
  timer: TimerState
  settings: Settings
  stats: DailyStats
  content: ReminderContent
  systemPaused: boolean
  storageError: string | null
}
export interface DesktopAPI {
  getSnapshot(): Promise<Snapshot>
  action(action: Action): Promise<void>
  saveSettings(settings: Settings): Promise<void>
  onSnapshot(callback: (snapshot: Snapshot) => void): () => void
  openMain(): Promise<void>
  showPet(): Promise<void>
  hidePet(): Promise<void>
  quit(): Promise<void>
}
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function validateSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') throw new Error('设置格式无效')
  const s = value as Settings
  for (const [key, min, max] of [['workMinutes', 1, 180], ['breakMinutes', 1, 30], ['snoozeMinutes', 1, 30]] as const) {
    if (!Number.isInteger(s[key]) || s[key] < min || s[key] > max) throw new Error(`${key} 必须是 ${min}–${max} 的整数`)
  }
  if (typeof s.autoStart !== 'boolean' || typeof s.allDisplays !== 'boolean') throw new Error('开关设置无效')
  const selectedPetId = s.selectedPetId === undefined ? DEFAULT_SETTINGS.selectedPetId : s.selectedPetId
  if (typeof selectedPetId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(selectedPetId)) throw new Error('桌宠标识无效')
  return { workMinutes: s.workMinutes, breakMinutes: s.breakMinutes, snoozeMinutes: s.snoozeMinutes, autoStart: s.autoStart, allDisplays: s.allDisplays, selectedPetId }
}
