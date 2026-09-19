import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopAPI, Snapshot } from '../shared/types'

const api: DesktopAPI = {
  getSnapshot: () => ipcRenderer.invoke('snapshot'),
  action: (action) => ipcRenderer.invoke('action', action),
  saveSettings: (settings) => ipcRenderer.invoke('settings', settings),
  quit: () => ipcRenderer.invoke('quit'),
  onSnapshot: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: Snapshot) => callback(snapshot)
    ipcRenderer.on('snapshot', listener)
    return () => ipcRenderer.removeListener('snapshot', listener)
  }
}
contextBridge.exposeInMainWorld('desktop', api)
