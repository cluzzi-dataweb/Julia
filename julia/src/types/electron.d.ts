declare global {
  interface Discipline {
    id: string
    name: string
    emoji?: string
    createdAt: string
  }

  interface Topic {
    id: string
    disciplineId: string
    title: string
    notes: string
    studiedAt: string
    baseFrequencyDays: number
    repetitionCount: number
    nextReviewAt: string
    lastReviewedAt: string | null
    createdAt: string
    isDue?: boolean
  }

  interface StudyPlanEntry {
    id: string
    type: 'study' | 'review'
    title: string
    disciplineId: string
    topicId: string | null
    date: string
    notes: string
    createdAt: string
  }

  interface TaskItem {
    id: string
    title: string
    description: string
    dueAt: string
    disciplineId: string | null
    status: 'todo' | 'inprogress' | 'done'
    priority: 'high' | 'medium' | 'low'
    createdAt: string
  }

  interface NoteItem {
    id: string
    title: string
    content: string
    createdAt: string
  }

  interface PomodoroSession {
    id: string
    minutes: number
    completedAt: string
    dayKey: string
  }

  interface StudyPayload {
    type: 'study' | 'review'
    title: string
    disciplineId: string
    topicId?: string
    date: string
    notes?: string
  }

  interface TopicPayload {
    disciplineId: string
    title: string
    notes?: string
    studiedAt: string
    baseFrequencyDays: number
  }

  interface StudyApi {
    getAllData: () => Promise<{
      disciplines: Discipline[]
      topics: Topic[]
      studyPlans: StudyPlanEntry[]
      tasks: TaskItem[]
      notes: NoteItem[]
      pomodoroSessions: PomodoroSession[]
    }>
    addDiscipline: (payload: { name: string }) => Promise<Discipline>
    addTopic: (payload: TopicPayload) => Promise<Topic>
    addCalendarEntry: (payload: StudyPayload) => Promise<StudyPlanEntry>
    completeReview: (payload: { topicId: string; reviewedAt: string }) => Promise<Topic | null>
    getDueReviews: (payload: { untilDate: string }) => Promise<Topic[]>
    addTask: (payload: {
      title: string
      description?: string
      dueAt: string
      disciplineId?: string
      status?: 'todo' | 'inprogress' | 'done'
      priority?: 'high' | 'medium' | 'low'
    }) => Promise<TaskItem>
    moveTask: (payload: { taskId: string; status: 'todo' | 'inprogress' | 'done' }) => Promise<TaskItem | null>
    deleteTask: (payload: { taskId: string }) => Promise<boolean>
    addNote: (payload: { title: string; content: string }) => Promise<NoteItem>
    updateNote: (payload: { noteId: string; title: string; content: string }) => Promise<NoteItem | null>
    deleteNote: (payload: { noteId: string }) => Promise<boolean>
    addPomodoroSession: (payload: { minutes: number; completedAt: string }) => Promise<PomodoroSession>
  }

  interface Window {
    studyApi: StudyApi
  }
}

export {}
