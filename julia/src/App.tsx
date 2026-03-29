import { useEffect, useMemo, useState } from 'react'
import Calendar from 'react-calendar'
import {
  format,
  isSameDay,
  isSameWeek,
  parseISO,
  set,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-calendar/dist/Calendar.css'

type MenuKey =
  | 'dashboard'
  | 'calendar'
  | 'disciplines'
  | 'tasks'
  | 'pomodoro'
  | 'notes'

type MenuItem = {
  key: MenuKey
  label: string
  group: 'principal' | 'tools'
  marker: string
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', group: 'principal', marker: 'DB' },
  { key: 'calendar', label: 'Calendario', group: 'principal', marker: 'CL' },
  { key: 'disciplines', label: 'Disciplinas', group: 'principal', marker: 'DS' },
  { key: 'tasks', label: 'Tarefas', group: 'principal', marker: 'TK' },
  { key: 'pomodoro', label: 'Pomodoro', group: 'tools', marker: 'PM' },
  { key: 'notes', label: 'Anotacoes', group: 'tools', marker: 'NT' },
]

const disciplineTones = ['violet', 'coral', 'green', 'gold'] as const
const pomodoroPresets = [25, 30, 45, 50]

function formatPt(date: Date, pattern: string) {
  return format(date, pattern, { locale: ptBR })
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function buildDisciplineCode(name: string, index: number) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3)

  return `${initials || 'MAT'}${String(101 + index).padStart(3, '0')}`
}

function App() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard')
  const [showDisciplineStudio, setShowDisciplineStudio] = useState(false)

  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [studyPlans, setStudyPlans] = useState<StudyPlanEntry[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([])

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const [newDiscipline, setNewDiscipline] = useState('')
  const [topicTitle, setTopicTitle] = useState('')
  const [topicNotes, setTopicNotes] = useState('')
  const [topicDate, setTopicDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [topicFrequency, setTopicFrequency] = useState(3)
  const [topicDisciplineId, setTopicDisciplineId] = useState('')

  const [planTitle, setPlanTitle] = useState('')
  const [planType, setPlanType] = useState<'study' | 'review'>('study')
  const [planDisciplineId, setPlanDisciplineId] = useState('')
  const [planNotes, setPlanNotes] = useState('')
  const [planTime, setPlanTime] = useState('08:00')

  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [taskDisciplineId, setTaskDisciplineId] = useState('')
  const [showTaskForm, setShowTaskForm] = useState(false)

  const [pomodoroMinutes, setPomodoroMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [pomodoroRunning, setPomodoroRunning] = useState(false)

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [draftNoteTitle, setDraftNoteTitle] = useState('')
  const [draftNoteContent, setDraftNoteContent] = useState('')

  const dueTopics = useMemo(
    () => topics.filter((topic) => new Date(topic.nextReviewAt) <= new Date()),
    [topics],
  )

  const pendingTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'done'),
    [tasks],
  )

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === 'done'),
    [tasks],
  )

  const selectedDayPlans = useMemo(
    () =>
      studyPlans
        .filter((entry) => isSameDay(parseISO(entry.date), selectedDate))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
    [selectedDate, studyPlans],
  )

  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date())
    return [...studyPlans]
      .filter((entry) => parseISO(entry.date) >= today)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 4)
  }, [studyPlans])

  const weekHours = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekSessions = pomodoroSessions.filter((session) =>
      isSameWeek(parseISO(session.completedAt), weekStart, { weekStartsOn: 1 }),
    )
    const totalMinutes = weekSessions.reduce((sum, session) => sum + session.minutes, 0)
    return Math.floor(totalMinutes / 60)
  }, [pomodoroSessions])

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  )

  const kanban = useMemo(
    () => ({
      todo: tasks.filter((task) => task.status === 'todo'),
      inprogress: tasks.filter((task) => task.status === 'inprogress'),
      done: tasks.filter((task) => task.status === 'done'),
    }),
    [tasks],
  )

  const disciplineSummaries = useMemo(() => {
    return disciplines.map((discipline, index) => {
      const disciplineTopics = topics.filter((topic) => topic.disciplineId === discipline.id)
      const disciplinePlans = studyPlans.filter((entry) => entry.disciplineId === discipline.id)
      const disciplineTasks = tasks.filter((task) => task.disciplineId === discipline.id)
      const reviewedTopics = disciplineTopics.filter((topic) => topic.repetitionCount > 0).length
      const finishedTasks = disciplineTasks.filter((task) => task.status === 'done').length
      const sessions = disciplineTopics.length + disciplinePlans.length
      const estimatedMinutes =
        disciplineTopics.length * 35 + disciplinePlans.length * 50 + finishedTasks * 25
      const estimatedHours = Math.max(0, Math.round(estimatedMinutes / 60))
      const progressBase = disciplineTopics.length + disciplinePlans.length + disciplineTasks.length
      const progressValue =
        progressBase === 0
          ? 0
          : Math.min(
              100,
              Math.round(((reviewedTopics * 2 + finishedTasks + disciplinePlans.length) / (progressBase * 2)) * 100),
            )

      return {
        discipline,
        code: buildDisciplineCode(discipline.name, index),
        sessions,
        estimatedHours,
        progressValue,
        tone: disciplineTones[index % disciplineTones.length],
      }
    })
  }, [disciplines, studyPlans, tasks, topics])

  async function refreshData() {
    const data = await window.studyApi.getAllData()
    setDisciplines(data.disciplines)
    setTopics(data.topics)
    setStudyPlans(data.studyPlans)
    setTasks(data.tasks)
    setNotes(data.notes)
    setPomodoroSessions(data.pomodoroSessions)

    if (!topicDisciplineId && data.disciplines[0]) {
      setTopicDisciplineId(data.disciplines[0].id)
    }
    if (!planDisciplineId && data.disciplines[0]) {
      setPlanDisciplineId(data.disciplines[0].id)
    }
    if (!taskDisciplineId && data.disciplines[0]) {
      setTaskDisciplineId(data.disciplines[0].id)
    }

    if (!selectedNoteId && data.notes[0]) {
      setSelectedNoteId(data.notes[0].id)
    }
  }

  useEffect(() => {
    void refreshData()
  }, [])

  useEffect(() => {
    if (disciplines.length === 0) {
      setShowDisciplineStudio(true)
    }
  }, [disciplines.length])

  useEffect(() => {
    if (selectedNote) {
      setDraftNoteTitle(selectedNote.title)
      setDraftNoteContent(selectedNote.content)
      return
    }

    setDraftNoteTitle('')
    setDraftNoteContent('')
  }, [selectedNote])

  useEffect(() => {
    const timer = setInterval(async () => {
      const dueSoon = await window.studyApi.getDueReviews({
        untilDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      if (dueSoon.length === 0) return
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Revisao proxima', {
          body: `Voce tem ${dueSoon.length} topico(s) para revisar ate amanha.`,
        })
      }
    }, 60 * 1000)

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!pomodoroRunning) return

    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setPomodoroRunning(false)
          void window.studyApi.addPomodoroSession({
            minutes: pomodoroMinutes,
            completedAt: new Date().toISOString(),
          })
          void refreshData()
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [pomodoroMinutes, pomodoroRunning])

  useEffect(() => {
    setSecondsLeft(pomodoroMinutes * 60)
  }, [pomodoroMinutes])

  async function handleAddDiscipline(event: React.FormEvent) {
    event.preventDefault()
    if (!newDiscipline.trim()) return
    await window.studyApi.addDiscipline({ name: newDiscipline.trim() })
    setNewDiscipline('')
    await refreshData()
  }

  async function handleAddTopic(event: React.FormEvent) {
    event.preventDefault()
    if (!topicTitle.trim() || !topicDisciplineId) return

    await window.studyApi.addTopic({
      disciplineId: topicDisciplineId,
      title: topicTitle.trim(),
      notes: topicNotes.trim(),
      studiedAt: new Date(topicDate).toISOString(),
      baseFrequencyDays: topicFrequency,
    })

    setTopicTitle('')
    setTopicNotes('')
    await refreshData()
  }

  async function handleAddPlan(event: React.FormEvent) {
    event.preventDefault()
    if (!planTitle.trim() || !planDisciplineId) return

    const [hours, minutes] = planTime.split(':').map((item) => Number(item))
    const dateWithTime = set(selectedDate, { hours, minutes, seconds: 0, milliseconds: 0 })

    await window.studyApi.addCalendarEntry({
      type: planType,
      title: planTitle.trim(),
      disciplineId: planDisciplineId,
      date: dateWithTime.toISOString(),
      notes: planNotes.trim(),
    })

    setPlanTitle('')
    setPlanNotes('')
    await refreshData()
  }

  async function handleAddTask(event: React.FormEvent) {
    event.preventDefault()
    if (!taskTitle.trim()) return

    await window.studyApi.addTask({
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      dueAt: selectedDate.toISOString(),
      disciplineId: taskDisciplineId || undefined,
      status: 'todo',
      priority: taskPriority,
    })

    setTaskTitle('')
    setTaskDescription('')
    setTaskPriority('medium')
    setShowTaskForm(false)
    await refreshData()
  }

  async function moveTask(taskId: string, status: 'todo' | 'inprogress' | 'done') {
    await window.studyApi.moveTask({ taskId, status })
    await refreshData()
  }

  async function removeTask(taskId: string) {
    await window.studyApi.deleteTask({ taskId })
    await refreshData()
  }

  async function handleCompleteReview(topicId: string) {
    await window.studyApi.completeReview({ topicId, reviewedAt: new Date().toISOString() })
    await refreshData()
  }

  async function createNewNote() {
    const note = await window.studyApi.addNote({
      title: 'Nova anotacao',
      content: '',
    })
    setSelectedNoteId(note.id)
    await refreshData()
  }

  async function saveCurrentNote() {
    if (!selectedNoteId) return
    await window.studyApi.updateNote({
      noteId: selectedNoteId,
      title: draftNoteTitle.trim() || 'Sem titulo',
      content: draftNoteContent,
    })
    await refreshData()
  }

  async function deleteCurrentNote() {
    if (!selectedNoteId) return
    await window.studyApi.deleteNote({ noteId: selectedNoteId })
    const remaining = notes.filter((note) => note.id !== selectedNoteId)
    setSelectedNoteId(remaining[0]?.id ?? null)
    await refreshData()
  }

  async function finishPomodoro() {
    setPomodoroRunning(false)
    await window.studyApi.addPomodoroSession({
      minutes: pomodoroMinutes,
      completedAt: new Date().toISOString(),
    })
    setSecondsLeft(pomodoroMinutes * 60)
    await refreshData()
  }

  function renderSectionIntro(title: string, subtitle: string, action?: React.ReactNode) {
    return (
      <header className="section-intro">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {action}
      </header>
    )
  }

  function renderDashboard() {
    return (
      <section className="content-shell dashboard-shell">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">Painel principal</span>
            <h1>Bom dia!</h1>
            <p>
              Aqui esta seu resumo de hoje - {capitalize(formatPt(new Date(), "EEEE, d 'de' MMMM"))}
            </p>
          </div>
          <div className="hero-actions">
            <button className="btn-secondary" type="button" onClick={() => setActiveMenu('tasks')}>
              Ver tarefas
            </button>
            <button className="btn-primary" type="button" onClick={() => setActiveMenu('calendar')}>
              + Agendar estudo
            </button>
          </div>
        </section>

        <div className="stats-grid modern-stats">
          <article className="stat-card tone-violet">
            <span>Eventos agendados</span>
            <strong>{studyPlans.length}</strong>
            <small>{selectedDayPlans.length} no dia selecionado</small>
          </article>
          <article className="stat-card tone-green">
            <span>Horas de foco</span>
            <strong>{weekHours}h</strong>
            <small>{pomodoroSessions.length} sessoes registradas</small>
          </article>
          <article className="stat-card tone-coral">
            <span>Itens pendentes</span>
            <strong>{pendingTasks.length + dueTopics.length}</strong>
            <small>{dueTopics.length} revisoes para hoje</small>
          </article>
          <article className="stat-card tone-gold">
            <span>Disciplinas ativas</span>
            <strong>{disciplines.length}</strong>
            <small>{completedTasks.length} tarefas concluidas</small>
          </article>
        </div>

        <div className="dashboard-grid">
          <article className="surface feature-surface">
            <div className="surface-header-row">
              <div>
                <h2>Proximos eventos</h2>
                <p>Visao rapida da sua fila de estudos</p>
              </div>
              <button className="btn-tertiary" type="button" onClick={() => setActiveMenu('calendar')}>
                Ver calendario
              </button>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="empty-panel">Nenhum evento agendado.</div>
            ) : (
              <ul className="clean-list event-list">
                {upcomingEvents.map((entry) => (
                  <li key={entry.id} className="event-item">
                    <div>
                      <strong>{entry.title}</strong>
                      <p>{entry.type === 'study' ? 'Sessao de estudo' : 'Revisao guiada'}</p>
                    </div>
                    <time>{formatPt(parseISO(entry.date), 'dd/MM HH:mm')}</time>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="surface feature-surface compact-surface">
            <div className="surface-header-row">
              <div>
                <h2>Revisoes em atraso</h2>
                <p>Topicos que pedem atencao imediata</p>
              </div>
            </div>
            {dueTopics.length === 0 ? (
              <div className="empty-panel small">Nenhuma revisao pendente agora.</div>
            ) : (
              <ul className="clean-list due-list">
                {dueTopics.slice(0, 4).map((topic) => (
                  <li key={topic.id} className="due-item">
                    <div>
                      <strong>{topic.title}</strong>
                      <p>{formatPt(parseISO(topic.nextReviewAt), 'dd/MM/yyyy')}</p>
                    </div>
                    <button
                      className="btn-tertiary"
                      type="button"
                      onClick={() => handleCompleteReview(topic.id)}
                    >
                      Revisado
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    )
  }

  function renderCalendar() {
    return (
      <section className="content-shell">
        {renderSectionIntro('Calendario de Estudos', 'Agende seus estudos e revisoes por data')}

        <div className="calendar-layout modern-calendar-layout">
          <article className="surface calendar-surface">
            <Calendar
              locale="pt-BR"
              formatShortWeekday={(_locale, date) =>
                format(date, 'EEE', { locale: ptBR }).replace('.', '').toUpperCase()
              }
              formatMonthYear={(_locale, date) => capitalize(formatPt(date, 'MMMM yyyy'))}
              nextLabel=">"
              prevLabel="<"
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value
                setSelectedDate(next ?? new Date())
              }}
              value={selectedDate}
            />
          </article>

          <div className="side-stack">
            <article className="surface form-surface">
              <div className="surface-title-block">
                <h2>Agendar Evento</h2>
                <p>Clique em um dia no calendario</p>
              </div>
              <form onSubmit={handleAddPlan} className="stack-form polished-form">
                <label className="field-label">Tipo de evento</label>
                <div className="segmented-row">
                  <button
                    type="button"
                    className={planType === 'study' ? 'segment active success' : 'segment'}
                    onClick={() => setPlanType('study')}
                  >
                    Estudo
                  </button>
                  <button
                    type="button"
                    className={planType === 'review' ? 'segment active' : 'segment'}
                    onClick={() => setPlanType('review')}
                  >
                    Revisao
                  </button>
                </div>

                <label className="field-label">Disciplina</label>
                <select
                  value={planDisciplineId}
                  onChange={(event) => setPlanDisciplineId(event.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {disciplines.map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>

                <label className="field-label">Topico / conteudo</label>
                <input
                  value={planTitle}
                  onChange={(event) => setPlanTitle(event.target.value)}
                  placeholder="ex: Derivadas parciais..."
                  required
                />

                <label className="field-label">Horario</label>
                <input
                  type="time"
                  value={planTime}
                  onChange={(event) => setPlanTime(event.target.value)}
                  required
                />

                <label className="field-label">Notas (opcional)</label>
                <textarea
                  value={planNotes}
                  onChange={(event) => setPlanNotes(event.target.value)}
                  placeholder="Materiais, capitulos..."
                />

                <button className="btn-primary wide" type="submit">
                  {'Agendar ->'}
                </button>
              </form>
            </article>

            <article className="surface day-events-surface">
              <div className="surface-title-block">
                <h2>Eventos do Dia</h2>
                <p>{capitalize(formatPt(selectedDate, "d 'de' MMMM"))}</p>
              </div>
              {selectedDayPlans.length === 0 ? (
                <div className="empty-panel small">Selecione um dia para ver os eventos</div>
              ) : (
                <ul className="clean-list event-list compact-event-list">
                  {selectedDayPlans.map((entry) => (
                    <li key={entry.id} className="event-item">
                      <div>
                        <strong>{entry.title}</strong>
                        <p>{entry.type === 'study' ? 'Estudo' : 'Revisao'}</p>
                      </div>
                      <time>{formatPt(parseISO(entry.date), 'HH:mm')}</time>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </div>
      </section>
    )
  }

  function renderDisciplines() {
    return (
      <section className="content-shell">
        {renderSectionIntro(
          'Minhas Disciplinas',
          'Acompanhe seu progresso em cada materia',
          <button
            className="btn-primary"
            type="button"
            onClick={() => setShowDisciplineStudio((current) => !current)}
          >
            + Nova Disciplina
          </button>,
        )}

        {showDisciplineStudio && (
          <section className="studio-grid">
            <article className="surface feature-surface">
              <div className="surface-title-block">
                <h2>Criar disciplina</h2>
                <p>Abra uma nova frente de estudos</p>
              </div>
              <form onSubmit={handleAddDiscipline} className="stack-form polished-form">
                <label className="field-label">Nome da disciplina</label>
                <input
                  value={newDiscipline}
                  onChange={(event) => setNewDiscipline(event.target.value)}
                  placeholder="Ex.: Calculo I"
                  required
                />
                <button className="btn-primary wide" type="submit">
                  Adicionar disciplina
                </button>
              </form>
            </article>

            <article className="surface feature-surface">
              <div className="surface-title-block">
                <h2>Registrar topico</h2>
                <p>Atualize o progresso e a proxima revisao</p>
              </div>
              <form onSubmit={handleAddTopic} className="stack-form polished-form">
                <label className="field-label">Disciplina</label>
                <select
                  value={topicDisciplineId}
                  onChange={(event) => setTopicDisciplineId(event.target.value)}
                  required
                >
                  <option value="">Selecione a disciplina</option>
                  {disciplines.map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>

                <label className="field-label">Topico estudado</label>
                <input
                  value={topicTitle}
                  onChange={(event) => setTopicTitle(event.target.value)}
                  placeholder="Assunto estudado"
                  required
                />

                <div className="inline-field-grid">
                  <div>
                    <label className="field-label">Data</label>
                    <input
                      type="date"
                      value={topicDate}
                      onChange={(event) => setTopicDate(event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Frequencia (dias)</label>
                    <input
                      type="number"
                      min={1}
                      value={topicFrequency}
                      onChange={(event) => setTopicFrequency(Number(event.target.value))}
                      required
                    />
                  </div>
                </div>

                <label className="field-label">Observacoes</label>
                <textarea
                  value={topicNotes}
                  onChange={(event) => setTopicNotes(event.target.value)}
                  placeholder="Pontos importantes, formulas, referencias..."
                />

                <button className="btn-primary wide" type="submit">
                  Salvar topico
                </button>
              </form>
            </article>
          </section>
        )}

        {disciplineSummaries.length === 0 ? (
          <article className="surface empty-surface">
            <div className="empty-panel">Nenhuma disciplina cadastrada ainda.</div>
          </article>
        ) : (
          <section className="discipline-grid">
            {disciplineSummaries.map((summary) => (
              <article key={summary.discipline.id} className={`discipline-card tone-${summary.tone}`}>
                <div className="discipline-card-top">
                  <div className="discipline-mark">{summary.discipline.name.slice(0, 1).toUpperCase()}</div>
                </div>
                <strong>{summary.discipline.name}</strong>
                <span className="discipline-code">{summary.code}</span>
                <div className="progress-header">
                  <span>Progresso</span>
                  <strong>{summary.progressValue}%</strong>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${summary.progressValue}%` }} />
                </div>
                <div className="discipline-metrics">
                  <div>
                    <strong>{summary.estimatedHours}h</strong>
                    <span>Estudadas</span>
                  </div>
                  <div>
                    <strong>{summary.sessions}</strong>
                    <span>Sessoes</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        <article className="surface feature-surface compact-surface">
          <div className="surface-header-row">
            <div>
              <h2>Fila de revisoes</h2>
              <p>Topicos que precisam de retorno</p>
            </div>
          </div>
          {dueTopics.length === 0 ? (
            <div className="empty-panel small">Nenhuma revisao pendente.</div>
          ) : (
            <ul className="clean-list due-list">
              {dueTopics.map((topic) => (
                <li key={topic.id} className="due-item">
                  <div>
                    <strong>{topic.title}</strong>
                    <p>Revisar em {formatPt(parseISO(topic.nextReviewAt), 'dd/MM/yyyy')}</p>
                  </div>
                  <button
                    className="btn-tertiary"
                    type="button"
                    onClick={() => handleCompleteReview(topic.id)}
                  >
                    Revisado
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    )
  }

  function renderTasks() {
    return (
      <section className="content-shell">
        {renderSectionIntro(
          'Tarefas',
          'Organize suas atividades com Kanban',
          <button className="btn-primary" type="button" onClick={() => setShowTaskForm((v) => !v)}>
            + Nova Tarefa
          </button>,
        )}

        {showTaskForm && (
          <article className="surface feature-surface">
            <form onSubmit={handleAddTask} className="task-create-grid polished-form">
              <div>
                <label className="field-label">Titulo</label>
                <input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Resumo, exercicios, revisao"
                  required
                />
              </div>
              <div>
                <label className="field-label">Prioridade</label>
                <select
                  value={taskPriority}
                  onChange={(event) =>
                    setTaskPriority(event.target.value as 'high' | 'medium' | 'low')
                  }
                >
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
              <div>
                <label className="field-label">Disciplina</label>
                <select
                  value={taskDisciplineId}
                  onChange={(event) => setTaskDisciplineId(event.target.value)}
                >
                  <option value="">Sem disciplina</option>
                  {disciplines.map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="task-description-block">
                <label className="field-label">Descricao</label>
                <textarea
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  placeholder="Detalhes da tarefa"
                />
              </div>
              <button className="btn-primary wide" type="submit">
                Criar tarefa
              </button>
            </form>
          </article>
        )}

        <div className="kanban-grid modern-kanban-grid">
          <section className="kanban-col column-todo">
            <div className="kanban-header">
              <h2>A Fazer</h2>
              <span>({kanban.todo.length})</span>
            </div>
            {kanban.todo.length === 0 && <p className="column-empty">Vazio</p>}
            {kanban.todo.map((task) => renderTaskCard(task))}
          </section>

          <section className="kanban-col column-progress">
            <div className="kanban-header">
              <h2>Em Andamento</h2>
              <span>({kanban.inprogress.length})</span>
            </div>
            {kanban.inprogress.length === 0 && <p className="column-empty">Vazio</p>}
            {kanban.inprogress.map((task) => renderTaskCard(task))}
          </section>

          <section className="kanban-col column-done">
            <div className="kanban-header">
              <h2>Concluido</h2>
              <span>({kanban.done.length})</span>
            </div>
            {kanban.done.length === 0 && <p className="column-empty">Vazio</p>}
            {kanban.done.map((task) => renderTaskCard(task))}
          </section>
        </div>
      </section>
    )
  }

  function renderTaskCard(task: TaskItem) {
    const discipline = disciplines.find((item) => item.id === task.disciplineId)
    const priorityLabel =
      task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baixa'

    return (
      <article key={task.id} className="task-card modern-task-card">
        <strong>{task.title}</strong>
        <p>{discipline?.name || 'Sem disciplina'}</p>
        <div className="task-card-footer">
          <div className="task-actions compact-actions">
            {task.status !== 'todo' && (
              <button
                className="btn-tertiary"
                type="button"
                onClick={() => moveTask(task.id, task.status === 'done' ? 'inprogress' : 'todo')}
              >
                Voltar
              </button>
            )}
            {task.status !== 'done' && (
              <button
                className="btn-primary"
                type="button"
                onClick={() => moveTask(task.id, task.status === 'todo' ? 'inprogress' : 'done')}
              >
                {'Avancar ->'}
              </button>
            )}
          </div>
          <div className="task-meta">
            <span className={`priority ${task.priority}`}>{priorityLabel}</span>
            <button className="btn-icon" type="button" onClick={() => removeTask(task.id)}>
              x
            </button>
          </div>
        </div>
      </article>
    )
  }

  function renderPomodoro() {
    const mm = Math.floor(secondsLeft / 60)
    const ss = secondsLeft % 60

    return (
      <section className="content-shell single-column-shell">
        {renderSectionIntro('Pomodoro Timer', 'Foco total com ciclos de estudo')}

        <article className="pomodoro-stage">
          <div className="pomodoro-presets">
            {pomodoroPresets.map((value) => (
              <button
                key={value}
                className={pomodoroMinutes === value ? 'preset-chip active' : 'preset-chip'}
                type="button"
                disabled={pomodoroRunning}
                onClick={() => setPomodoroMinutes(value)}
              >
                {value} min
              </button>
            ))}
          </div>

          <div className="pomodoro-ring">
            <div className="pomodoro-ring-inner">
              <strong>{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</strong>
              <span>FOCO</span>
            </div>
          </div>

          <div className="pomodoro-controls">
            <button
              className="circle-button"
              type="button"
              onClick={() => {
                setPomodoroRunning(false)
                setSecondsLeft(pomodoroMinutes * 60)
              }}
            >
              R
            </button>
            <button
              className="circle-button primary"
              type="button"
              onClick={() => setPomodoroRunning((value) => !value)}
            >
              {pomodoroRunning ? 'II' : '>'}
            </button>
            <button className="circle-button" type="button" onClick={() => void finishPomodoro()}>
              +
            </button>
          </div>

          <div className="session-dots">
            <span>Sessoes:</span>
            <div>
              {Array.from({ length: 4 }).map((_, index) => (
                <i
                  key={index}
                  className={pomodoroSessions.length % 4 > index ? 'active' : ''}
                />
              ))}
            </div>
          </div>
        </article>
      </section>
    )
  }

  function renderNotes() {
    return (
      <section className="content-shell">
        {renderSectionIntro(
          'Anotacoes',
          'Registre resumos e ideias',
          <button className="btn-primary" type="button" onClick={createNewNote}>
            + Nova Nota
          </button>,
        )}

        <div className="notes-layout modern-notes-layout">
          <article className="surface notes-list-panel polished-panel">
            {notes.length === 0 ? (
              <div className="empty-panel notes-empty">Nenhuma nota ainda</div>
            ) : (
              <ul className="clean-list notes-list">
                {notes.map((note) => (
                  <li key={note.id}>
                    <button
                      className={`note-list-item ${selectedNoteId === note.id ? 'active' : ''}`}
                      type="button"
                      onClick={() => setSelectedNoteId(note.id)}
                    >
                      <div>
                        <strong>{note.title || 'Sem titulo'}</strong>
                        <span>{formatPt(parseISO(note.createdAt), 'dd/MM')}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="surface notes-editor-panel polished-panel">
            {selectedNote ? (
              <div className="notes-editor modern-editor">
                <div className="editor-toolbar">
                  <button className="btn-tertiary" type="button" onClick={saveCurrentNote}>
                    Salvar
                  </button>
                  <button className="btn-icon large" type="button" onClick={deleteCurrentNote}>
                    x
                  </button>
                </div>
                <input
                  value={draftNoteTitle}
                  onChange={(event) => setDraftNoteTitle(event.target.value)}
                  placeholder="Titulo da anotacao..."
                />
                <textarea
                  value={draftNoteContent}
                  onChange={(event) => setDraftNoteContent(event.target.value)}
                  placeholder="Comece a escrever..."
                />
              </div>
            ) : (
              <div className="empty-panel notes-empty">Crie ou selecione uma nota para editar</div>
            )}
          </article>
        </div>
      </section>
    )
  }

  function renderContent() {
    if (activeMenu === 'calendar') return renderCalendar()
    if (activeMenu === 'disciplines') return renderDisciplines()
    if (activeMenu === 'tasks') return renderTasks()
    if (activeMenu === 'pomodoro') return renderPomodoro()
    if (activeMenu === 'notes') return renderNotes()
    return renderDashboard()
  }

  const menuWithBadge = menuItems.map((item) => {
    if (item.key === 'calendar') {
      const todayCount = studyPlans.filter((entry) =>
        isSameDay(parseISO(entry.date), startOfDay(new Date())),
      ).length
      return { ...item, badge: todayCount }
    }
    if (item.key === 'tasks') {
      return { ...item, badge: pendingTasks.length + dueTopics.length }
    }
    return { ...item, badge: 0 }
  })

  return (
    <div className="app-shell">
      <aside className="sidebar modern-sidebar">
        <div className="brand brand-block">
          <strong>Studium</strong>
          <span>Plataforma de estudos</span>
        </div>

        <nav className="menu-group">
          <p className="menu-label">Principal</p>
          {menuWithBadge
            .filter((item) => item.group === 'principal')
            .map((item) => (
              <button
                key={item.key}
                className={`menu-btn ${activeMenu === item.key ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveMenu(item.key)}
              >
                <span className="menu-btn-main">
                  <i>{item.marker}</i>
                  <span>{item.label}</span>
                </span>
                {item.badge > 0 && <small>{item.badge}</small>}
              </button>
            ))}
        </nav>

        <nav className="menu-group">
          <p className="menu-label">Ferramentas</p>
          {menuWithBadge
            .filter((item) => item.group === 'tools')
            .map((item) => (
              <button
                key={item.key}
                className={`menu-btn ${activeMenu === item.key ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveMenu(item.key)}
              >
                <span className="menu-btn-main">
                  <i>{item.marker}</i>
                  <span>{item.label}</span>
                </span>
              </button>
            ))}
        </nav>

        <footer className="sidebar-footer modern-sidebar-footer">
          <span className="avatar">E</span>
          <div>
            <strong>Estudante</strong>
            <p>Direito</p>
          </div>
        </footer>
      </aside>

      <main className="workspace modern-workspace">{renderContent()}</main>
    </div>
  )
}

export default App