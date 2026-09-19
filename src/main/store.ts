import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, localDate, validateSettings, type DailyStats, type Settings } from '../shared/types'

export class Store {
  settings: Settings = { ...DEFAULT_SETTINGS }
  stats: DailyStats = { date: localDate(), breaks: 0, activeMinutes: 0 }
  error: string | null = null
  private path: string
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true })
    this.path = join(directory, 'settings.json')
    if (!existsSync(this.path)) return
    try {
      const data = JSON.parse(readFileSync(this.path, 'utf8'))
      this.settings = validateSettings(data.settings)
      const s = data.stats
      if (s?.date === localDate() && Number.isInteger(s.breaks) && s.breaks >= 0 && Number.isFinite(s.activeMinutes) && s.activeMinutes >= 0) this.stats = s
    } catch {
      this.error = '配置文件无法读取，已使用默认设置。'
      try { copyFileSync(this.path, `${this.path}.corrupt-${Date.now()}`) } catch { /* Preserve original until the next explicit save. */ }
    }
  }
  refreshDay(): void {
    if (this.stats.date !== localDate()) this.stats = { date: localDate(), breaks: 0, activeMinutes: 0 }
  }
  save(): void {
    try {
      writeFileSync(`${this.path}.tmp`, JSON.stringify({ version: 1, settings: this.settings, stats: this.stats }, null, 2), 'utf8')
      renameSync(`${this.path}.tmp`, this.path)
      this.error = null
    } catch {
      this.error = '设置无法写入磁盘，本次修改只在当前运行期间有效。'
      throw new Error(this.error)
    }
  }
}
