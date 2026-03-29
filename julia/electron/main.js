import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LowSync } from 'lowdb'
import { JSONFileSync } from 'lowdb/node'
import { v4 as uuidv4 } from 'uuid'
import { addDays, isAfter, parseISO, startOfDay } from 'date-fns'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
let db

function createDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'study-db.json')
  const adapter = new JSONFileSync(dbPath)
  db = new LowSync(adapter, {
    disciplines: [],
    topics: [],
    studyPlans: [],
    tasks: [],
    notes: [],
    pomodoroSessions: [],
  })

  db.read()
}

function persist() {
  db.write()
}

function normalizeDate(input) {
  return new Date(input).toISOString()
}

function computeNextReview(baseFrequencyDays, repetitionCount, referenceDate) {
  const safeBase = Math.max(1, Number(baseFrequencyDays) || 1)
  const interval = Math.max(1, Math.round(safeBase * Math.pow(1.8, repetitionCount)))
  return addDays(referenceDate, interval).toISOString()
}

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    dueAt: task.dueAt,
    disciplineId: task.disciplineId || null,
    status: task.status || (task.completed ? 'done' : 'todo'),
    priority: task.priority || 'medium',
    createdAt: task.createdAt,
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Plataforma de Estudos Universitarios',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('data:getAll', () => {
  db.read()
  const topics = db.data.topics.map((topic) => {
    const reviewDate = parseISO(topic.nextReviewAt)
    return {
      ...topic,
      isDue: !isAfter(reviewDate, new Date()),
    }
  })

  const tasks = db.data.tasks.map(normalizeTask)

  return {
    disciplines: db.data.disciplines,
    topics,
    studyPlans: db.data.studyPlans,
    tasks,
    notes: db.data.notes,
    pomodoroSessions: db.data.pomodoroSessions,
  }
})

ipcMain.handle('discipline:add', (_event, payload) => {
  const discipline = {
    id: uuidv4(),
    name: payload.name,
    createdAt: new Date().toISOString(),
  }

  db.data.disciplines.push(discipline)
  persist()
  return discipline
})

ipcMain.handle('topic:add', (_event, payload) => {
  const studiedAt = normalizeDate(payload.studiedAt)
  const topic = {
    id: uuidv4(),
    disciplineId: payload.disciplineId,
    title: payload.title,
    notes: payload.notes || '',
    studiedAt,
    baseFrequencyDays: Number(payload.baseFrequencyDays),
    repetitionCount: 0,
    nextReviewAt: computeNextReview(payload.baseFrequencyDays, 0, new Date(studiedAt)),
    lastReviewedAt: null,
    createdAt: new Date().toISOString(),
  }

  db.data.topics.push(topic)
  persist()
  return topic
})

ipcMain.handle('calendar:addEntry', (_event, payload) => {
  const entry = {
    id: uuidv4(),
    type: payload.type,
    title: payload.title,
    disciplineId: payload.disciplineId,
    topicId: payload.topicId || null,
    date: normalizeDate(payload.date),
    notes: payload.notes || '',
    createdAt: new Date().toISOString(),
  }

  db.data.studyPlans.push(entry)
  persist()
  return entry
})

ipcMain.handle('topic:completeReview', (_event, payload) => {
  const topic = db.data.topics.find((item) => item.id === payload.topicId)
  if (!topic) {
    return null
  }

  topic.repetitionCount += 1
  topic.lastReviewedAt = normalizeDate(payload.reviewedAt)
  topic.nextReviewAt = computeNextReview(topic.baseFrequencyDays, topic.repetitionCount, new Date(topic.lastReviewedAt))

  persist()
  return topic
})

ipcMain.handle('topic:getDueReviews', (_event, payload) => {
  const untilDate = parseISO(normalizeDate(payload.untilDate))

  return db.data.topics.filter((topic) => {
    const nextDate = parseISO(topic.nextReviewAt)
    return !isAfter(nextDate, untilDate)
  })
})

ipcMain.handle('task:add', (_event, payload) => {
  const task = {
    id: uuidv4(),
    title: payload.title,
    description: payload.description || '',
    dueAt: normalizeDate(payload.dueAt),
    disciplineId: payload.disciplineId || null,
    status: payload.status || 'todo',
    priority: payload.priority || 'medium',
    createdAt: new Date().toISOString(),
  }

  db.data.tasks.push(task)
  persist()
  return normalizeTask(task)
})

ipcMain.handle('task:move', (_event, payload) => {
  const task = db.data.tasks.find((item) => item.id === payload.taskId)
  if (!task) {
    return null
  }

  task.status = payload.status
  persist()
  return normalizeTask(task)
})

ipcMain.handle('task:delete', (_event, payload) => {
  db.data.tasks = db.data.tasks.filter((item) => item.id !== payload.taskId)
  persist()
  return true
})

ipcMain.handle('note:add', (_event, payload) => {
  const note = {
    id: uuidv4(),
    title: payload.title,
    content: payload.content,
    createdAt: new Date().toISOString(),
  }

  db.data.notes.unshift(note)
  persist()
  return note
})

ipcMain.handle('note:update', (_event, payload) => {
  const note = db.data.notes.find((item) => item.id === payload.noteId)
  if (!note) {
    return null
  }

  note.title = payload.title
  note.content = payload.content
  persist()
  return note
})

ipcMain.handle('note:delete', (_event, payload) => {
  db.data.notes = db.data.notes.filter((item) => item.id !== payload.noteId)
  persist()
  return true
})

ipcMain.handle('pomodoro:addSession', (_event, payload) => {
  const session = {
    id: uuidv4(),
    minutes: Number(payload.minutes) || 25,
    completedAt: normalizeDate(payload.completedAt),
    dayKey: startOfDay(new Date(payload.completedAt)).toISOString(),
  }

  db.data.pomodoroSessions.push(session)
  persist()
  return session
})
