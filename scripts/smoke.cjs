const { _electron: electron } = require('playwright')
const { mkdirSync } = require('node:fs')
const { resolve } = require('node:path')
const assert = require('node:assert/strict')

async function run() {
  const directory = resolve('.desktop-test', `run-${Date.now()}`)
  mkdirSync(directory, { recursive: true })
  const env = { ...process.env, STAND_TEST: '1', STAND_TEST_DATA: directory }
  delete env.ELECTRON_RUN_AS_NODE
  let app
  let devServer
  const errors = []
  try {
    if (process.argv.includes('--dev')) {
      const { resolveConfig } = await import('electron-vite')
      const { createServer } = await import('vite')
      const { config } = await resolveConfig({}, 'serve')
      devServer = await createServer({ ...config.renderer, configFile: false, server: { host: '127.0.0.1', port: 5173, strictPort: true } })
      await devServer.listen()
      env.ELECTRON_RENDERER_URL = 'http://127.0.0.1:5173'
    }
    app = await electron.launch({ args: ['.'], env })
    const window = await app.firstWindow()
    window.on('pageerror', error => errors.push(error.message))
    await window.getByText('专注有时，休息有度').waitFor()
    await window.getByRole('button', { name: '暂停计时' }).click()
    assert.equal((await window.evaluate(() => window.desktop.getSnapshot())).timer.running, false)
    await window.screenshot({ path: resolve('.desktop-test', 'dashboard.png'), fullPage: true })
    await window.getByRole('button', { name: '偏好设置' }).click()
    await window.getByRole('spinbutton', { name: '专注时长' }).fill('25')
    await window.getByRole('button', { name: '保存设置' }).click()
    await window.getByText('已保存。时长将在下一轮开始时生效。').waitFor()
    assert.equal((await window.evaluate(() => window.desktop.getSnapshot())).settings.workMinutes, 25)
    await window.screenshot({ path: resolve('.desktop-test', 'settings.png') })
    // IPC rejects invalid values even when the HTML form is bypassed.
    assert.equal(await window.evaluate(async () => {
      const state = await window.desktop.getSnapshot()
      try { await window.desktop.saveSettings({ ...state.settings, workMinutes: 0 }); return false } catch { return true }
    }), true)
    await window.getByRole('button', { name: '扩展空间' }).click()
    await window.getByRole('heading', { name: '角色陪伴' }).waitFor()
    await window.screenshot({ path: resolve('.desktop-test', 'extensions.png') })
    await window.getByRole('button', { name: '专注与休息' }).click()
    const reminderPromise = app.waitForEvent('window')
    await window.getByRole('button', { name: '现在就活动一下' }).click()
    const reminder = await reminderPromise
    await reminder.getByRole('heading', { name: '起身，让身体换个节奏。' }).waitFor()
    await reminder.screenshot({ path: resolve('.desktop-test', 'reminder.png') })
    const nativeWindows = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => ({ fullscreen: w.isFullScreen(), top: w.isAlwaysOnTop(), url: w.webContents.getURL() })))
    assert.ok(nativeWindows.some(w => w.fullscreen && w.top), JSON.stringify(nativeWindows))
    await reminder.keyboard.press('Escape')
    await window.waitForFunction(async () => (await window.desktop.getSnapshot()).timer.phase === 'work')
    const snoozed = await window.evaluate(() => window.desktop.getSnapshot())
    assert.equal(snoozed.stats.breaks, 0)
    assert.ok(snoozed.timer.remainingMs <= 300000 && snoozed.timer.remainingMs > 295000)
    // Simulate native power events without actually locking the user's machine.
    await app.evaluate(({ powerMonitor }) => { powerMonitor.emit('lock-screen'); powerMonitor.emit('suspend') })
    assert.equal((await window.evaluate(() => window.desktop.getSnapshot())).systemPaused, true)
    await app.evaluate(({ powerMonitor }) => powerMonitor.emit('resume'))
    assert.equal((await window.evaluate(() => window.desktop.getSnapshot())).timer.running, false)
    await app.evaluate(({ powerMonitor }) => powerMonitor.emit('unlock-screen'))
    assert.equal((await window.evaluate(() => window.desktop.getSnapshot())).timer.running, true)
    console.log('PASS: UI, settings, fullscreen, Escape, power events. Checking tray close...')
    await app.evaluate(({ BrowserWindow }) => {
      setImmediate(() => {
        const main = BrowserWindow.getAllWindows()[0]
        if (main && !main.isDestroyed()) main.close()
      })
    })
    // Poll from the test process, allowing Windows to dispatch native messages.
    for (let attempt = 0; attempt < 30; attempt++) {
      if (!(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()))) break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), false)
    assert.equal(errors.length, 0, errors.join('\n'))
    console.log('PASS: tray close. Checking restart...')
    await app.close()
    console.log('First instance exited.')
    app = await electron.launch({ args: ['.'], env })
    const restarted = await app.firstWindow()
    await restarted.getByText('专注有时，休息有度').waitFor()
    assert.equal((await restarted.evaluate(() => window.desktop.getSnapshot())).settings.workMinutes, 25)
    console.log('PASS: desktop render, pause, settings persistence, input validation, extensions, fullscreen, Escape snooze, power events, tray close, restart.')
    console.log('Screenshots: .desktop-test/{dashboard,settings,extensions,reminder}.png')
  } finally { if (app) await app.close(); if (devServer) await devServer.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
