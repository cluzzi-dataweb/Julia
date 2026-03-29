import { addDays, isAfter, parseISO, startOfDay } from 'date-fns'

type StudyDatabase = {
  disciplines: Discipline[]
  topics: Topic[]
  studyPlans: StudyPlanEntry[]
  tasks: TaskItem[]
  notes: NoteItem[]
  pomodoroSessions: PomodoroSession[]
}

const STORAGE_KEY = 'studium-web-db'

function createEmptyDatabase(): StudyDatabase {
  const now = new Date()
  const disciplineIds = {
    direito_constitucional: createId(),
    direito_civil: createId(),
    direito_penal: createId(),
    direito_processual: createId(),
  }

  return {
    disciplines: [
      {
        id: disciplineIds.direito_constitucional,
        name: 'Direito Constitucional',
        emoji: '⚖️',
        createdAt: normalizeDate(now),
      },
      {
        id: disciplineIds.direito_civil,
        name: 'Direito Civil',
        emoji: '📜',
        createdAt: normalizeDate(now),
      },
      {
        id: disciplineIds.direito_penal,
        name: 'Direito Penal',
        emoji: '⚠️',
        createdAt: normalizeDate(now),
      },
      {
        id: disciplineIds.direito_processual,
        name: 'Direito Processual Civil',
        emoji: '📋',
        createdAt: normalizeDate(now),
      },
    ],
    topics: [],
    studyPlans: [],
    tasks: [],
    notes: [],
    pomodoroSessions: [],
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeDate(input: string | Date) {
  return new Date(input).toISOString()
}

function computeNextReview(baseFrequencyDays: number, repetitionCount: number, referenceDate: Date) {
  const safeBase = Math.max(1, Number(baseFrequencyDays) || 1)
  const interval = Math.max(1, Math.round(safeBase * Math.pow(1.8, repetitionCount)))
  return addDays(referenceDate, interval).toISOString()
}

function normalizeTask(task: TaskItem & { completed?: boolean }) {
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

function readDatabase(): StudyDatabase {
  if (typeof window === 'undefined') {
    return createEmptyDatabase()
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createEmptyDatabase()
    }

    const parsed = JSON.parse(raw) as Partial<StudyDatabase>
    return {
      disciplines: Array.isArray(parsed.disciplines) ? parsed.disciplines : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      studyPlans: Array.isArray(parsed.studyPlans) ? parsed.studyPlans : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map((task) => normalizeTask(task)) : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      pomodoroSessions: Array.isArray(parsed.pomodoroSessions) ? parsed.pomodoroSessions : [],
    }
  } catch {
    return createEmptyDatabase()
  }
}

function writeDatabase(data: StudyDatabase) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function createWebStudyApi(): StudyApi {
  return {
    async getAllData() {
      const data = readDatabase()
      const topics = data.topics.map((topic) => ({
        ...topic,
        isDue: !isAfter(parseISO(topic.nextReviewAt), new Date()),
      }))

      return {
        disciplines: data.disciplines,
        topics,
        studyPlans: data.studyPlans,
        tasks: data.tasks.map((task) => normalizeTask(task)),
        notes: data.notes,
        pomodoroSessions: data.pomodoroSessions,
      }
    },

    async addDiscipline(payload) {
      const data = readDatabase()
      const discipline: Discipline = {
        id: createId(),
        name: payload.name,
        createdAt: new Date().toISOString(),
      }

      data.disciplines.push(discipline)
      writeDatabase(data)
      return discipline
    },

    async addTopic(payload) {
      const data = readDatabase()
      const studiedAt = normalizeDate(payload.studiedAt)
      const topic: Topic = {
        id: createId(),
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

      data.topics.push(topic)
      writeDatabase(data)
      return topic
    },

    async addCalendarEntry(payload) {
      const data = readDatabase()
      const entry: StudyPlanEntry = {
        id: createId(),
        type: payload.type,
        title: payload.title,
        disciplineId: payload.disciplineId,
        topicId: payload.topicId || null,
        date: normalizeDate(payload.date),
        notes: payload.notes || '',
        createdAt: new Date().toISOString(),
      }

      data.studyPlans.push(entry)
      writeDatabase(data)
      return entry
    },

    async completeReview(payload) {
      const data = readDatabase()
      const topic = data.topics.find((item) => item.id === payload.topicId)
      if (!topic) {
        return null
      }

      topic.repetitionCount += 1
      topic.lastReviewedAt = normalizeDate(payload.reviewedAt)
      topic.nextReviewAt = computeNextReview(
        topic.baseFrequencyDays,
        topic.repetitionCount,
        new Date(topic.lastReviewedAt),
      )

      writeDatabase(data)
      return topic
    },

    async getDueReviews(payload) {
      const data = readDatabase()
      const untilDate = parseISO(normalizeDate(payload.untilDate))
      return data.topics.filter((topic) => !isAfter(parseISO(topic.nextReviewAt), untilDate))
    },

    async addTask(payload) {
      const data = readDatabase()
      const task = normalizeTask({
        id: createId(),
        title: payload.title,
        description: payload.description || '',
        dueAt: normalizeDate(payload.dueAt),
        disciplineId: payload.disciplineId || null,
        status: payload.status || 'todo',
        priority: payload.priority || 'medium',
        createdAt: new Date().toISOString(),
      })

      data.tasks.push(task)
      writeDatabase(data)
      return task
    },

    async moveTask(payload) {
      const data = readDatabase()
      const task = data.tasks.find((item) => item.id === payload.taskId)
      if (!task) {
        return null
      }

      task.status = payload.status
      writeDatabase(data)
      return normalizeTask(task)
    },

    async deleteTask(payload) {
      const data = readDatabase()
      data.tasks = data.tasks.filter((item) => item.id !== payload.taskId)
      writeDatabase(data)
      return true
    },

    async addNote(payload) {
      const data = readDatabase()
      const note: NoteItem = {
        id: createId(),
        title: payload.title,
        content: payload.content,
        createdAt: new Date().toISOString(),
      }

      data.notes.unshift(note)
      writeDatabase(data)
      return note
    },

    async updateNote(payload) {
      const data = readDatabase()
      const note = data.notes.find((item) => item.id === payload.noteId)
      if (!note) {
        return null
      }

      note.title = payload.title
      note.content = payload.content
      writeDatabase(data)
      return note
    },

    async deleteNote(payload) {
      const data = readDatabase()
      data.notes = data.notes.filter((item) => item.id !== payload.noteId)
      writeDatabase(data)
      return true
    },

    async addPomodoroSession(payload) {
      const data = readDatabase()
      const session: PomodoroSession = {
        id: createId(),
        minutes: Number(payload.minutes) || 25,
        completedAt: normalizeDate(payload.completedAt),
        dayKey: startOfDay(new Date(payload.completedAt)).toISOString(),
      }

      data.pomodoroSessions.push(session)
      writeDatabase(data)
      return session
    },
  }
}

export function ensureStudyApi() {
  if (typeof window === 'undefined' || window.studyApi) {
    return
  }

  window.studyApi = createWebStudyApi()
}