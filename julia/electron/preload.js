import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('studyApi', {
  getAllData: () => ipcRenderer.invoke('data:getAll'),
  addDiscipline: (payload) => ipcRenderer.invoke('discipline:add', payload),
  addTopic: (payload) => ipcRenderer.invoke('topic:add', payload),
  addCalendarEntry: (payload) => ipcRenderer.invoke('calendar:addEntry', payload),
  completeReview: (payload) => ipcRenderer.invoke('topic:completeReview', payload),
  getDueReviews: (payload) => ipcRenderer.invoke('topic:getDueReviews', payload),
  addTask: (payload) => ipcRenderer.invoke('task:add', payload),
  moveTask: (payload) => ipcRenderer.invoke('task:move', payload),
  deleteTask: (payload) => ipcRenderer.invoke('task:delete', payload),
  addNote: (payload) => ipcRenderer.invoke('note:add', payload),
  updateNote: (payload) => ipcRenderer.invoke('note:update', payload),
  deleteNote: (payload) => ipcRenderer.invoke('note:delete', payload),
  addPomodoroSession: (payload) => ipcRenderer.invoke('pomodoro:addSession', payload),
})
