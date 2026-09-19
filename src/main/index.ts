import { app, BrowserWindow, ipcMain, Menu, nativeImage, powerMonitor, screen, Tray } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ReminderTimer } from './timer'
import { Store } from './store'
import { dailyContent } from './extensions'
import { validateSettings, type Action, type Snapshot } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let reminders: BrowserWindow[] = []
let tray: Tray | null = null
let quitting = false
let interval: ReturnType<typeof setInterval> | undefined
let store: Store
let timer: ReminderTimer
const systemBlocks = new Set<string>()
let resumeAfterSystem = false
const isTest = process.env.STAND_TEST === '1'
if (isTest && process.env.STAND_TEST_DATA) app.setPath('userData', process.env.STAND_TEST_DATA)

function snapshot(): Snapshot {
  store.refreshDay()
  return { timer: timer.snapshot(), settings: store.settings, stats: store.stats,
    content: dailyContent.getContent({ date: store.stats.date, completedBreaks: store.stats.breaks }),
    systemPaused: systemBlocks.size > 0, storageError: store.error }
}
function broadcast(): void {
  const state = snapshot()
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send('snapshot', state)
  }
}
function loadWindow(window: BrowserWindow, reminder = false): void {
  const url = process.env.ELECTRON_RENDERER_URL
  if (url) void window.loadURL(`${url}${reminder ? '#reminder' : ''}`)
  else void window.loadFile(join(__dirname, '../renderer/index.html'), { hash: reminder ? 'reminder' : '' })
}
function secureWindow(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
}
function showMain(): void {
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); return }
  mainWindow = new BrowserWindow({ width: 1160, height: 820, minWidth: 880, minHeight: 680,
    title: '起身 · Stand Reminder', backgroundColor: '#f5f6f3', show: false,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
  secureWindow(mainWindow)
  mainWindow.setMenuBarVisibility(false)
  mainWindow.once('ready-to-show', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show() })
  mainWindow.on('close', (event) => {
    if (!quitting && tray) {
      event.preventDefault()
      // Defer hiding until Windows finishes dispatching the native close event.
      const closingWindow = mainWindow
      setImmediate(() => { if (!quitting && closingWindow && !closingWindow.isDestroyed()) closingWindow.hide() })
    }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  loadWindow(mainWindow)
}
function closeReminders(): void {
  const windows = reminders
  reminders = []
  for (const window of windows) if (!window.isDestroyed()) window.destroy()
}
function showReminders(): void {
  if (reminders.length || systemBlocks.size) return
  const displays = store.settings.allDisplays ? screen.getAllDisplays() : [screen.getPrimaryDisplay()]
  for (const display of displays) {
    const window = new BrowserWindow({ ...display.bounds, show: false, frame: false, fullscreen: true,
      alwaysOnTop: true, skipTaskbar: true, backgroundColor: '#edf2e9',
      webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
    secureWindow(window)
    reminders.push(window)
    window.once('ready-to-show', () => {
      if (!window.isDestroyed()) {
        window.show()
        window.setFullScreen(true)
        window.setAlwaysOnTop(true, 'screen-saver')
      }
    })
    window.on('enter-full-screen', () => { if (!window.isDestroyed()) window.setAlwaysOnTop(true, 'screen-saver') })
    window.on('close', (event) => { if (!quitting) { event.preventDefault(); runAction('snooze') } })
    window.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') { event.preventDefault(); runAction('snooze') }
    })
    loadWindow(window, true)
  }
}
function reconcile(): void {
  if (timer.snapshot().phase === 'break' && !systemBlocks.size) showReminders()
  else closeReminders()
  broadcast()
}
function tick(): void {
  const event = timer.tick()
  if (event === 'break-completed') {
    store.refreshDay()
    store.stats.breaks += 1
    store.stats.activeMinutes += timer.snapshot().durationMs / 60_000
    try { store.save() } catch (error) { console.error(error) }
  }
  if (event) updateTray()
  reconcile()
}
function runAction(action: Action): void {
  // Account for a deadline crossing before processing user commands.
  tick()
  timer.action(action)
  if (systemBlocks.size) {
    resumeAfterSystem = action === 'pause' ? false : timer.snapshot().running
    timer.action('pause')
  }
  updateTray()
  reconcile()
}
function blockSystem(reason: string): void {
  if (!systemBlocks.size) { tick(); resumeAfterSystem = timer.snapshot().running; timer.action('pause') }
  systemBlocks.add(reason)
  reconcile()
}
function unblockSystem(reason: string): void {
  systemBlocks.delete(reason)
  if (!systemBlocks.size && resumeAfterSystem) { resumeAfterSystem = false; timer.action('resume') }
  reconcile()
}
function updateTray(): void {
  tray?.setContextMenu(Menu.buildFromTemplate([
    { label: '打开起身', click: showMain },
    { label: timer.snapshot().running ? '暂停计时' : '继续计时', click: () => runAction(timer.snapshot().running ? 'pause' : 'resume') },
    { label: '现在活动一下', click: () => runAction('break-now') },
    { type: 'separator' }, { label: '退出起身', click: () => app.quit() }
  ]))
}
function createTray(): void {
  // Generated locally; no external image or network dependency.
  const pixels = Buffer.alloc(32 * 32 * 4)
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4
    const ink = (x >= 14 && x <= 17 && y >= 7 && y <= 24) || (y >= 7 && y <= 10 && x >= 9 && x <= 22)
    pixels.set(ink ? [255, 255, 255, 255] : [83, 115, 74, 255], i)
  }
  tray = new Tray(nativeImage.createFromBitmap(pixels, { width: 32, height: 32 }))
  tray.setToolTip('起身 · 久坐提醒（关闭窗口后继续运行）')
  tray.on('double-click', showMain)
  updateTray()
}

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', showMain)
  app.whenReady().then(() => {
    store = new Store(app.getPath('userData'))
    timer = new ReminderTimer(store.settings)
    const allowedActions = new Set<Action>(['pause', 'resume', 'reset', 'break-now', 'snooze', 'skip', 'finish'])
    const assertSender = (event: Electron.IpcMainInvokeEvent): void => {
      const frame = event.senderFrame
      const expected = process.env.ELECTRON_RENDERER_URL ?? pathToFileURL(join(__dirname, '../renderer/index.html')).href
      if (!frame || frame !== event.sender.mainFrame || frame.url.split('#')[0].replace(/\/$/, '') !== expected.replace(/\/$/, '')) throw new Error('无效的应用来源')
    }
    ipcMain.handle('snapshot', (event) => { assertSender(event); return snapshot() })
    ipcMain.handle('action', (event, action: Action) => { assertSender(event); if (!allowedActions.has(action)) throw new Error('未知操作'); runAction(action) })
    ipcMain.handle('settings', (event, value: unknown) => {
      assertSender(event)
      store.settings = validateSettings(value)
      timer.configure(store.settings)
      try { store.save() } finally { broadcast() }
    })
    ipcMain.handle('quit', (event) => { assertSender(event); app.quit() })
    createTray()
    showMain()
    interval = setInterval(tick, 250)
    powerMonitor.on('suspend', () => blockSystem('sleep'))
    powerMonitor.on('resume', () => unblockSystem('sleep'))
    powerMonitor.on('lock-screen', () => blockSystem('lock'))
    powerMonitor.on('unlock-screen', () => unblockSystem('lock'))
    screen.on('display-added', () => { closeReminders(); reconcile() })
    screen.on('display-removed', () => { closeReminders(); reconcile() })
    app.on('activate', showMain)
  })
}
app.on('before-quit', () => { quitting = true; if (interval) clearInterval(interval); tray?.destroy(); tray = null })
app.on('window-all-closed', () => { if (!tray) app.quit() })
