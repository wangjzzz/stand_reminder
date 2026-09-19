import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, CircleHelp, Coffee, Footprints, LayoutDashboard, Leaf, Pause, Play, Puzzle, RotateCcw, Settings2, Sprout, Timer, X } from 'lucide-react'
import type { Action, Settings, Snapshot } from '../../shared/types'
import { extensions } from './extensions'

const formatTime = (ms: number) => { const seconds = Math.ceil(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }
type Page = 'dashboard' | 'extensions' | 'settings'

export function App() {
  const [state, setState] = useState<Snapshot | null>(null)
  const [page, setPage] = useState<Page>('dashboard')
  const [error, setError] = useState('')
  const [help, setHelp] = useState(false)
  const reminder = location.hash === '#reminder'
  useEffect(() => {
    if (!window.desktop) { setError('请通过 npm run dev 启动桌面应用。'); return }
    const unsubscribe = window.desktop.onSnapshot(setState)
    window.desktop.getSnapshot().then(setState).catch(e => setError(String(e)))
    return unsubscribe
  }, [])
  const action = (value: Action) => { setError(''); window.desktop.action(value).catch(e => setError(String(e))) }
  if (!state) return <div className="loading"><Sprout size={40} /><p>{error || '给专注留一点呼吸的空间…'}</p></div>
  if (reminder) return <div className="break-screen">
    <div className="break-top"><Brand /><span>属于你的休息时间</span><button className="icon-button" aria-label="稍后提醒" onClick={() => action('snooze')}><X /></button></div>
    <div className="break-content"><div className="break-art"><Sprout strokeWidth={1} size={108} /><span className="orb orb-one" /><span className="orb orb-two" /></div>
      <div className="eyebrow">TAKE A LITTLE BREAK</div>
      <h1>{state.timer.completed ? '很好，又照顾了自己一次。' : state.content.title}</h1>
      <p>{state.content.message}</p>
      <div className="break-time">{formatTime(state.timer.remainingMs)}</div>
      <div className="break-caption">{state.timer.completed ? '活动时间已结束，准备好再继续。' : '离开屏幕，慢慢走一走'}</div>
      <div className="break-actions">{state.timer.completed ? <button className="primary" onClick={() => action('finish')}><Check size={18} /> 开始下一轮专注</button> : <><button className="primary" onClick={() => action('snooze')}>稍后 {state.settings.snoozeMinutes} 分钟提醒</button><button className="text-button" onClick={() => action('skip')}>跳过这次休息 <ChevronRight size={16} /></button></>}</div>
    </div><div className="break-bottom">{state.content.quote}<span>按 Esc 可稍后提醒 · 随时可以退出</span></div>{error && <div className="toast" role="alert">{error}</div>}
  </div>
  return <div className="app-shell">
    <aside className="sidebar"><Brand /><div className="nav-caption">你的日常节奏</div><nav>
      {[{ id: 'dashboard', label: '专注与休息', icon: LayoutDashboard }, { id: 'extensions', label: '扩展空间', icon: Puzzle }, { id: 'settings', label: '偏好设置', icon: Settings2 }].map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'selected' : ''}`} onClick={() => setPage(item.id as Page)}><item.icon size={19} />{item.label}{item.id === 'extensions' && <span className="nav-dot" />}</button>)}
    </nav><div className="sidebar-bottom"><div className="small-plant"><Sprout size={30} strokeWidth={1.4} /><p>好好工作，<br />也好好照顾自己。</p></div><button className="help-button" onClick={() => setHelp(true)}><CircleHelp size={17} /> 使用小贴士 <ArrowUpRight size={15} /></button><div className="version">起身桌面版 <span>v0.1.0</span></div></div></aside>
    <main className="main"><header className="topbar"><span>给专注留一点呼吸的空间</span><span className="date">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span></header>
      {page === 'dashboard' && <>
        <div className="page-heading"><div><div className="eyebrow">A LITTLE PAUSE, A BETTER DAY</div><h1>专注有时，休息有度<span>。</span></h1><p>让每一次起身，成为下一个好状态的开始。</p></div><span className="soft-label"><span /> {state.systemPaused ? '系统暂停中' : state.timer.running ? '陪你保持节奏' : '按自己的节奏来'}</span></div>
        <section className="focus-card"><div className="focus-main"><div className="section-kicker"><Timer size={16} /> {state.timer.phase === 'break' ? '活动时间' : '当前专注'}</div><div className="timer-number">{formatTime(state.timer.remainingMs)}</div><p>{state.timer.completed ? '活动结束，准备好继续了吗？' : state.timer.running ? '距离下一次' + (state.timer.phase === 'work' ? '起身活动' : '专注') : '计时已暂停，准备好后再继续'}</p><div className="progress-track"><span style={{ width: `${100 * (1 - state.timer.remainingMs / state.timer.durationMs)}%` }} /></div><div className="timer-actions"><button className="primary" disabled={state.systemPaused} onClick={() => action(state.timer.completed ? 'finish' : state.timer.running ? 'pause' : 'resume')}>{state.timer.running ? <Pause size={16} /> : <Play size={16} />}{state.timer.completed ? '继续专注' : state.timer.running ? '暂停计时' : '继续计时'}</button><button className="icon-button reset" aria-label="重新开始计时" title="重新开始计时" onClick={() => action('reset')}><RotateCcw size={18} /></button></div></div>
          <div className="focus-art"><div className="plant-halo"><Sprout size={145} strokeWidth={0.9} /></div><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✧</span><div className="art-caption">扎根当下，也记得伸展。</div></div>
          <div className="focus-footer"><span><span className="status-dot" /> 专注 {state.settings.workMinutes} 分钟 <span className="divider">/</span> 活动 {state.settings.breakMinutes} 分钟</span><button onClick={() => setPage('settings')}>调整节奏 <ChevronRight size={14} /></button></div>
        </section>
        <div className="stats-grid"><Stat icon={<Footprints size={20} />} value={state.stats.breaks} unit="次" label="今日完成活动" /><Stat icon={<Coffee size={20} />} value={state.stats.activeMinutes} unit="分钟" label="今日活动计时" /><button className="quick-break" onClick={() => action('break-now')}><span className="stat-icon"><Leaf size={21} /></span><div><strong>现在就活动一下</strong><span>给自己一个小小的间歇</span></div><ArrowUpRight size={21} /></button></div>
        <section className="quote-card"><span className="quote-mark">“</span><div><span className="section-kicker">今日寄语</span><p>{state.content.quote}</p><small>{state.content.source}</small></div><span className="quote-tag">ONE DAY, ONE THOUGHT</span></section>
        <div className="more-row"><div><Puzzle size={18} /><span>属于你的提醒方式，还可以有更多可能。</span></div><button onClick={() => setPage('extensions')}>探索扩展空间 <ArrowUpRight size={15} /></button></div>
      </>}
      {page === 'extensions' && <><div className="page-heading"><div><div className="eyebrow">MAKE IT YOURS</div><h1>一点点，变成你喜欢的样子。</h1><p>先养成起身的习惯，再慢慢丰富这段陪伴。</p></div></div><div className="extension-grid">{extensions.map(extension => <article className="extension-card" key={extension.id}><div className="extension-top"><span className="stat-icon"><extension.icon size={24} /></span><span className={`badge ${extension.ready ? 'ready' : ''}`}>{extension.ready ? '已启用' : '即将探索'}</span></div><h2>{extension.title}</h2><p>{extension.description}</p><div className="extension-bottom">{extension.tag}{extension.ready && <Check size={16} />}</div></article>)}</div><div className="note"><Sprout size={20} /><p>这是扩展的起点。今日计划、角色陪伴与 AI 提醒暂未实现，后续可以独立接入。</p></div></>}
      {page === 'settings' && <SettingsPanel settings={state.settings} onSave={async value => { await window.desktop.saveSettings(value) }} />}
      <footer className="page-footer"><span className="status-dot" /> 关闭窗口后继续在托盘运行<span>每一个小休息，都算数。</span></footer>
      {(error || state.storageError) && <div className="error-banner" role="alert">{error || state.storageError}</div>}
    </main>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="modal" role="dialog" aria-modal="true" aria-label="使用小贴士" onClick={e => e.stopPropagation()}><button className="icon-button modal-close" aria-label="关闭小贴士" onClick={() => setHelp(false)}><X size={20} /></button><Sprout size={36} /><h2>让提醒，融入你的日常。</h2><p>专注倒计时结束后，会显示全屏活动提醒。你可以完成休息，也可以选择稍后提醒或跳过。</p><p>关闭主窗口后，软件会继续在系统托盘运行。右键托盘图标可暂停或退出。电脑锁屏、睡眠期间暂停计时，返回后继续。</p><p>按 Esc 可关闭全屏提醒，并在设定时间后再次提醒。活动统计表示已完成的计时，不检测实际身体动作。</p><button className="primary" onClick={() => setHelp(false)}>知道了</button><button className="text-button quit" onClick={() => window.desktop.quit()}>退出软件</button></section></div>}
  </div>
}
function Brand() { return <div className="brand"><span className="brand-symbol"><Sprout size={24} /></span><div>起身<small>STAND REMINDER</small></div></div> }
function Stat({ icon, value, unit, label }: { icon: React.ReactNode; value: number; unit: string; label: string }) { return <div className="stat-card"><span className="stat-icon">{icon}</span><div><div className="stat-value">{value}<small>{unit}</small></div><span className="stat-label">{label}</span></div></div> }
function SettingsPanel({ settings, onSave }: { settings: Settings; onSave: (settings: Settings) => Promise<void> }) {
  const [draft, setDraft] = useState(settings)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  return <><div className="page-heading"><div><div className="eyebrow">FIND YOUR RHYTHM</div><h1>舒服的节奏，由你决定。</h1><p>找到适合自己的工作与休息间隔。</p></div></div><form className="settings-card" onSubmit={async event => { event.preventDefault(); setSaving(true); setMessage(''); try { await onSave(draft); setMessage('已保存。时长将在下一轮开始时生效。') } catch (e) { setMessage(String(e)) } finally { setSaving(false) } }}><h2>时间安排</h2>{([{ key: 'workMinutes', label: '专注时长', hint: '工作多久后，提醒你起来活动', max: 180 }, { key: 'breakMinutes', label: '活动时长', hint: '留一段时间，走动、放松或看看远处', max: 30 }, { key: 'snoozeMinutes', label: '稍后提醒', hint: '手头有事时，可以延后多久', max: 30 }] as const).map(item => <label className="setting-row" key={item.key}><div><strong>{item.label}</strong><p>{item.hint}</p></div><span className="number-field"><input aria-label={item.label} type="number" min="1" max={item.max} required value={draft[item.key] || ''} onChange={e => setDraft({ ...draft, [item.key]: Number(e.target.value) })} /><span>分钟</span></span></label>)}<h2 className="settings-subtitle">提醒偏好</h2>{([{ key: 'autoStart', label: '打开软件时开始计时', hint: '仅在应用启动后生效，不会设置开机自启' }, { key: 'allDisplays', label: '在所有屏幕上提醒', hint: '关闭后仅在主屏幕提醒，下一次提醒生效' }] as const).map(item => <label className="setting-row" key={item.key}><div><strong>{item.label}</strong><p>{item.hint}</p></div><input className="toggle" type="checkbox" checked={draft[item.key]} onChange={e => setDraft({ ...draft, [item.key]: e.target.checked })} /></label>)}<div className="settings-save"><span role="status">{message || '设置保存在这台电脑上。'}</span><button className="primary" disabled={saving} type="submit"><Check size={16} />{saving ? '保存中…' : '保存设置'}</button></div></form></>
}
