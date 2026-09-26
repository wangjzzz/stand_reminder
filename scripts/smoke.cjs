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
    if ((await window.evaluate(() => window.desktop.getSnapshot())).timer.phase === 'break') {
      await window.evaluate(() => window.desktop.action('skip'))
    }
    assert.equal((await window.evaluate(() => window.desktop.getSnapshot())).timer.phase, 'work')
    console.log('PASS: UI, settings, fullscreen, Escape, power events. Checking desktop pet...')
    await window.evaluate(() => window.desktop.showPet())
    const nativePetReady = await app.evaluate(({ BrowserWindow }) => new Promise(resolve => setTimeout(() => {
      resolve(BrowserWindow.getAllWindows().some(item => !item.isDestroyed() && item.webContents.getURL().endsWith('#pet')))
    }, 300)))
    assert.equal(nativePetReady, true)
    let pet
    for (let attempt = 0; attempt < 50; attempt++) {
      pet = app.windows().find(page => page.url().endsWith('#pet'))
      if (pet) break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.ok(pet, `Pet window was not created. Open pages: ${app.windows().map(page => page.url()).join(', ')}`)
    pet.on('pageerror', error => console.error('Pet page error:', error.message))
    pet.on('console', message => { if (message.type() === 'error') console.error('Pet console:', message.text()) })
    await pet.waitForLoadState('domcontentloaded')
    await pet.getByText('已工作').waitFor()
    const firstElapsed = await pet.locator('.pet-time-card strong').textContent()
    await new Promise(resolve => setTimeout(resolve, 1200))
    const nextElapsed = await pet.locator('.pet-time-card strong').textContent()
    assert.notEqual(nextElapsed, firstElapsed)
    await pet.screenshot({ path: resolve('.desktop-test', 'pet.png'), omitBackground: true })
    const petWindowState = await app.evaluate(({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows().find(item => {
        const url = item.webContents.getURL()
        return !url.endsWith('#pet') && !url.endsWith('#reminder')
      })
      const pet = BrowserWindow.getAllWindows().find(item => item.webContents.getURL().includes('#pet'))
      return { mainVisible: main?.isVisible(), petVisible: pet?.isVisible(), petOnTop: pet?.isAlwaysOnTop(), petSize: pet?.getSize() }
    })
    assert.deepEqual(petWindowState, { mainVisible: false, petVisible: true, petOnTop: true, petSize: [156, 190] })
    await pet.getByRole('button', { name: /打开主界面/ }).click()
    await window.getByText('专注有时，休息有度').waitFor({ state: 'visible' })
    assert.equal(await app.evaluate(({ BrowserWindow }) => {
      const pet = BrowserWindow.getAllWindows().find(item => item.webContents.getURL().includes('#pet'))
      return Boolean(pet && !pet.isVisible())
    }), true)
    assert.equal(errors.length, 0, errors.join('\n'))
    console.log('PASS: desktop pet. Checking restart...')
    await app.close()
    console.log('First instance exited.')
    app = await electron.launch({ args: ['.'], env })
    const restarted = await app.firstWindow()
    await restarted.getByText('专注有时，休息有度').waitFor()
    assert.equal((await restarted.evaluate(() => window.desktop.getSnapshot())).settings.workMinutes, 25)
    console.log('PASS: desktop render, pause, settings persistence, input validation, extensions, fullscreen, Escape snooze, power events, desktop pet, restart.')
    console.log('Screenshots: .desktop-test/{dashboard,settings,extensions,reminder,pet}.png')
  } finally { if (app) await app.close(); if (devServer) await devServer.close() }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
