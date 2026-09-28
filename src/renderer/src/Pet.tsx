import { EyeOff, Pause, Play, RotateCcw, X } from 'lucide-react'
import type { Action, Snapshot } from '../../shared/types'
import { pets } from './pets'

const formatElapsed = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function Pet({ state, action, openMain, hide }: {
  state: Snapshot
  action: (action: Action) => void
  openMain: () => void
  hide: () => void
}) {
  const pet = pets.find(item => item.id === state.settings.selectedPetId) ?? pets[0]
  const elapsed = state.timer.phase === 'work'
    ? Math.max(0, state.timer.durationMs - state.timer.remainingMs)
    : state.timer.durationMs
  return <div className="pet-shell">
    <div className="pet-drag-zone" aria-label="可拖动桌宠">
      <div className="pet-time-card" title="本轮已持续工作时间">
        <span>{state.timer.running ? '已工作' : '计时暂停'}</span>
        <strong>{formatElapsed(elapsed)}</strong>
      </div>
      <button className="pet-character" aria-label={`打开主界面，当前桌宠：${pet.name}`} onClick={openMain}>
        <img src={pet.image} alt={pet.alt} draggable={false} />
      </button>
    </div>
    <div className="pet-toolbar">
      <button aria-label={state.timer.running ? '暂停计时' : '继续计时'} title={state.timer.running ? '暂停计时' : '继续计时'} onClick={() => action(state.timer.running ? 'pause' : 'resume')}>
        {state.timer.running ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button aria-label="重新开始计时" title="重新开始计时" onClick={() => action('reset')}><RotateCcw size={14} /></button>
      <button aria-label="隐藏桌宠" title="隐藏桌宠（仍在托盘运行）" onClick={hide}><EyeOff size={14} /></button>
      <button aria-label="退出软件" title="退出软件" onClick={() => window.desktop.quit()}><X size={14} /></button>
    </div>
  </div>
}
