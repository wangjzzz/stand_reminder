import { DEFAULT_SETTINGS, type Action, type Settings, type TimerState } from '../shared/types'

/** Pure state machine; time is injected so UI timers never decide desktop behavior. */
export class ReminderTimer {
  private state: TimerState
  private deadline = 0
  constructor(private settings: Settings = DEFAULT_SETTINGS, private now = () => performance.now()) {
    this.state = { phase: 'work', running: settings.autoStart, remainingMs: settings.workMinutes * 60_000, durationMs: settings.workMinutes * 60_000, completed: false }
    this.deadline = this.now() + this.state.remainingMs
  }
  snapshot(): TimerState { return { ...this.state } }
  tick(): 'break-started' | 'break-completed' | undefined {
    if (!this.state.running) return
    this.state.remainingMs = Math.max(0, this.deadline - this.now())
    if (this.state.remainingMs > 0) return
    if (this.state.phase === 'work') {
      this.start('break', this.settings.breakMinutes)
      return 'break-started'
    }
    this.state.running = false
    this.state.completed = true
    return 'break-completed'
  }
  configure(settings: Settings): void { this.settings = settings }
  action(action: Action): void {
    switch (action) {
      case 'pause':
        if (this.state.running) this.state.remainingMs = Math.max(0, this.deadline - this.now())
        this.state.running = false
        break
      case 'resume':
        if (this.state.completed) return
        this.state.running = true
        this.deadline = this.now() + this.state.remainingMs
        break
      case 'reset': this.start('work', this.settings.workMinutes); break
      case 'break-now':
        if (this.state.phase === 'work') this.start('break', this.settings.breakMinutes)
        break
      case 'snooze':
        if (this.state.phase === 'break') this.start('work', this.settings.snoozeMinutes)
        break
      case 'skip':
        if (this.state.phase === 'break') this.start('work', this.settings.workMinutes)
        break
      case 'finish':
        if (this.state.phase === 'break' && this.state.completed) this.start('work', this.settings.workMinutes)
        break
    }
  }
  private start(phase: 'work' | 'break', minutes: number): void {
    this.state = { phase, running: true, remainingMs: minutes * 60_000, durationMs: minutes * 60_000, completed: false }
    this.deadline = this.now() + this.state.remainingMs
  }
}
