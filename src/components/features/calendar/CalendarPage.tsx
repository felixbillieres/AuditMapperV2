import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InfoModal from '@/components/ui/InfoModal';
import {
  Plus,
  Pause,
  Play,
  RotateCcw,
  X,
  Calendar as CalendarIcon,
  Timer as TimerIcon,
  Edit,
  Trash2,
} from 'lucide-react';

// Import SortableJS (drag & drop)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Sortable from 'sortablejs';
import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type Priority = 'low' | 'medium' | 'high' | 'critical';

interface KanbanColumn {
  id: number;
  title: string;
  icon?: string;
  color?: string;
  type?: 'todo' | 'in-progress' | 'done' | 'review' | 'custom';
}

interface KanbanTicket {
  id: number;
  title: string;
  description?: string;
  priority: Priority;
  assignee?: string;
  columnId: number;
  dueDate?: string;
  createdAt: string;
  estimateHours?: number; // estimation d'effort
  spentSeconds?: number; // temps passé accumulé (s)
  running?: boolean; // timer en cours
  startedAt?: number | null; // epoch ms quand démarré
}

interface KanbanState {
  columns: KanbanColumn[];
  tickets: KanbanTicket[];
}

interface TimerState {
  startTime: number | null; // epoch ms
  endTime: number | null; // epoch ms
  isRunning: boolean;
  isPaused: boolean;
  pausedTime: number; // epoch ms when paused
  totalDuration: number; // seconds
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 1, title: 'À Faire', icon: '📋', color: '#6c757d', type: 'todo' },
  { id: 2, title: 'En Cours', icon: '⚡', color: '#007bff', type: 'in-progress' },
  { id: 3, title: 'Terminé', icon: '✅', color: '#28a745', type: 'done' },
  { id: 4, title: 'Révision', icon: '🔍', color: '#dc3545', type: 'review' },
];

const DEFAULT_TICKETS: KanbanTicket[] = [
  {
    id: 1,
    title: 'Reconnaissance initiale',
    description: 'Scanner de ports et énumération des services',
    priority: 'high',
    assignee: 'Pentester',
    columnId: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Analyse des vulnérabilités',
    description: 'Test des vulnérabilités identifiées',
    priority: 'medium',
    assignee: 'Pentester',
    columnId: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Rapport final',
    description: 'Rédaction du rapport de pentest',
    priority: 'low',
    assignee: 'Pentester',
    columnId: 3,
    createdAt: new Date().toISOString(),
  },
];

const loadKanban = (): KanbanState => {
  try {
    const raw = localStorage.getItem('calendarKanban');
    if (!raw) {
      const initial = { columns: DEFAULT_COLUMNS, tickets: DEFAULT_TICKETS };
      localStorage.setItem('calendarKanban', JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.columns || !parsed.tickets) throw new Error('Invalid kanban data');
    return parsed;
  } catch {
    const fallback = { columns: DEFAULT_COLUMNS, tickets: DEFAULT_TICKETS };
    localStorage.setItem('calendarKanban', JSON.stringify(fallback));
    return fallback;
  }
};

const saveKanban = (state: KanbanState) => {
  localStorage.setItem('calendarKanban', JSON.stringify(state));
};

const loadTimer = (): TimerState => {
  try {
    const raw = localStorage.getItem('calendarTimer');
    if (!raw) {
      return {
        startTime: null,
        endTime: null,
        isRunning: false,
        isPaused: false,
        pausedTime: 0,
        totalDuration: 0,
      };
    }
    const parsed = JSON.parse(raw) as TimerState;
    return parsed;
  } catch {
    return {
      startTime: null,
      endTime: null,
      isRunning: false,
      isPaused: false,
      pausedTime: 0,
      totalDuration: 0,
    };
  }
};

const saveTimer = (timer: TimerState) => {
  localStorage.setItem('calendarTimer', JSON.stringify(timer));
};

const loadTimerConfig = () => {
  try {
    const raw = localStorage.getItem('calendarTimerConfig');
    if (!raw) return { days: 0, hours: 0, minutes: 0 };
    const parsed = JSON.parse(raw);
    return {
      days: Number(parsed.days) || 0,
      hours: Number(parsed.hours) || 0,
      minutes: Number(parsed.minutes) || 0,
    };
  } catch {
    return { days: 0, hours: 0, minutes: 0 };
  }
};

const saveTimerConfig = (cfg: { days: number; hours: number; minutes: number }) => {
  localStorage.setItem('calendarTimerConfig', JSON.stringify(cfg));
};

function formatHMS(msLeft: number): string {
  if (msLeft <= 0) return '00:00:00';
  const hours = Math.floor(msLeft / (1000 * 60 * 60));
  const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((msLeft % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function priorityLabel(p: Priority) {
  switch (p) {
    case 'low':
      return 'Basse';
    case 'medium':
      return 'Moyenne';
    case 'high':
      return 'Haute';
    case 'critical':
      return 'Critique';
  }
}

// Pomodoro & ToDo hooks
function usePomodoro() {
  const [pomodoro, setPomodoro] = useState(() => {
    try {
      const saved = localStorage.getItem('pomodoroData');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      rounds: 4,
      work: 25,
      break: 5,
      currentRound: 1,
      isRunning: false,
      isWork: true,
      timer: null,
      timeLeft: 25 * 60,
    };
  });
  const timerRef = useRef<number | null>(null);
  // Save to localStorage
  useEffect(() => { localStorage.setItem('pomodoroData', JSON.stringify(pomodoro)); }, [pomodoro]);
  // Tick
  useEffect(() => {
    if (pomodoro.isRunning) {
      timerRef.current = window.setInterval(() => {
        setPomodoro((prev: any) => {
          if (prev.timeLeft <= 1) {
            if (prev.isWork) {
              // Fin session travail
              return { ...prev, isWork: false, timeLeft: prev.break * 60 };
            } else {
              // Fin pause
              if (prev.currentRound >= prev.rounds) {
                // Fin cycle
                return { ...prev, isRunning: false, currentRound: 1, isWork: true, timeLeft: prev.work * 60 };
              } else {
                // Prochain round
                return { ...prev, isWork: true, currentRound: prev.currentRound + 1, timeLeft: prev.work * 60 };
              }
            }
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [pomodoro.isRunning, pomodoro.isWork, pomodoro.rounds, pomodoro.work, pomodoro.break, pomodoro.currentRound]);
  // Handlers
  const start = useCallback(() => setPomodoro((p: any) => ({ ...p, isRunning: true })), []);
  const pause = useCallback(() => setPomodoro((p: any) => ({ ...p, isRunning: false })), []);
  const reset = useCallback(() => setPomodoro((p: any) => ({ ...p, isRunning: false, currentRound: 1, isWork: true, timeLeft: p.work * 60 })), []);
  const setRounds = (v: number) => setPomodoro((p: any) => ({ ...p, rounds: v }));
  const setWork = (v: number) => setPomodoro((p: any) => ({ ...p, work: v, timeLeft: p.isWork ? v * 60 : p.timeLeft }));
  const setBreak = (v: number) => setPomodoro((p: any) => ({ ...p, break: v, timeLeft: !p.isWork ? v * 60 : p.timeLeft }));
  return { pomodoro, start, pause, reset, setRounds, setWork, setBreak };
}
function useTodoList() {
  const [todos, setTodos] = useState<{ text: string; done: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('calendarTodoList');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  useEffect(() => { localStorage.setItem('calendarTodoList', JSON.stringify(todos)); }, [todos]);
  const add = (text: string) => setTodos((prev) => [...prev, { text, done: false }]);
  const toggle = (idx: number) => setTodos((prev) => prev.map((t, i) => i === idx ? { ...t, done: !t.done } : t));
  const del = (idx: number) => setTodos((prev) => prev.filter((_, i) => i !== idx));
  return { todos, add, toggle, del };
}
function useQuickNotes() {
  const [notes, setNotes] = useState(() => localStorage.getItem('quickNotes') || '');
  useEffect(() => { localStorage.setItem('quickNotes', notes); }, [notes]);
  return [notes, setNotes] as const;
}

export const CalendarPage: React.FC = () => {
  // Kanban state
  const [kanban, setKanban] = useState<KanbanState>(() => loadKanban());
  const [currentTicketId, setCurrentTicketId] = useState<number>(() =>
    kanban.tickets.length ? Math.max(...kanban.tickets.map((t) => t.id)) + 1 : 1
  );
  const [currentColumnId, setCurrentColumnId] = useState<number>(() =>
    kanban.columns.length ? Math.max(...kanban.columns.map((c) => c.id)) + 1 : 1
  );

  // Timer state
  const [timer, setTimer] = useState<TimerState>(() => loadTimer());
  const [timerCfg, setTimerCfg] = useState<{ days: number; hours: number; minutes: number }>(() =>
    loadTimerConfig()
  );
  const intervalRef = useRef<number | null>(null);

  // Modal states
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<KanbanTicket | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [newTicketColumnId, setNewTicketColumnId] = useState<number | null>(null);
  const [showTimerContent, setShowTimerContent] = useState(false);
  const [about, setAbout] = useState(false);
  // Local draft pour la modale de ticket
  const [ticketDraft, setTicketDraft] = useState<{
    title: string;
    description: string;
    priority: Priority;
    assignee: string;
    dueDate?: string;
    estimateHours?: number;
    columnId: number;
  } | null>(null);

  // DnD refs
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardSortableRef = useRef<any>(null);
  const ticketsSortableRefs = useRef<Record<number, any>>({});
  const ticketsTickerRef = useRef<number | null>(null);

  // Derived timer display
  const timeLeft = useMemo(() => {
    if (!timer.endTime) return '--:--:--';
    const now = Date.now();
    let left = (timer.endTime || 0) - now;
    if (timer.isPaused && timer.pausedTime) {
      const pauseDuration = now - timer.pausedTime;
      left += pauseDuration;
    }
    return formatHMS(left);
  }, [timer]);

  useEffect(() => {
    saveKanban(kanban);
  }, [kanban]);

  useEffect(() => {
    saveTimer(timer);
  }, [timer]);

  useEffect(() => {
    saveTimerConfig(timerCfg);
  }, [timerCfg]);

  // Setup SortableJS after render with proper cleanup
  useEffect(() => {
    // Destroy existing instances to avoid DOM conflicts
    if (boardSortableRef.current) {
      try { boardSortableRef.current.destroy(); } catch {}
      boardSortableRef.current = null;
    }
    Object.values(ticketsSortableRefs.current).forEach((inst) => {
      try { inst.destroy(); } catch {}
    });
    ticketsSortableRefs.current = {};

    // Columns sorting
    if (boardRef.current) {
      boardSortableRef.current = new Sortable(boardRef.current, {
        group: 'kanban-columns',
        animation: 150,
        handle: '.kanban-column-header',
        fallbackOnBody: true,
        onEnd: () => {
          if (!boardRef.current) return;
          const newOrderIds: number[] = Array.from(
            boardRef.current.querySelectorAll('[data-column-id]')
          ).map((el) => Number((el as HTMLElement).dataset.columnId));
          const reordered: KanbanColumn[] = [];
          newOrderIds.forEach((id) => {
            const col = kanban.columns.find((c) => c.id === id);
            if (col) reordered.push(col);
          });
          setKanban((prev) => ({ ...prev, columns: reordered }));
        },
      });
    }

    // Tickets sorting per column
    kanban.columns.forEach((col) => {
      const container = document.querySelector(
        `[data-ticket-container="${col.id}"]`
      ) as HTMLElement | null;
      if (!container) return;
      ticketsSortableRefs.current[col.id] = new Sortable(container, {
        group: { name: 'kanban-tickets', pull: true, put: true },
        animation: 150,
        fallbackOnBody: true,
        emptyInsertThreshold: 5,
        filter: 'button, a, input, textarea, select',
        preventOnFilter: true,
        draggable: '[data-ticket-id]',
        dataIdAttr: 'data-ticket-id',
        onAdd: (evt: any) => {
          const ticketId = Number(evt.item?.dataset?.ticketId);
          const toColumnId = Number((evt.to as HTMLElement)?.dataset?.ticketContainer);
          if (!ticketId || !toColumnId) return;
          // Laisser Sortable finaliser le DOM avant que React ne re-render
          requestAnimationFrame(() => {
            setKanban((prev) => ({
              ...prev,
              tickets: prev.tickets.map((t) => {
                if (t.id !== ticketId) return t;
                const moved: KanbanTicket = {
                  ...t,
                  columnId: toColumnId,
                  running: t.running && t.columnId === toColumnId ? t.running : false,
                  startedAt: t.running && t.columnId === toColumnId ? t.startedAt : null,
                };
                return moved;
              }),
            }));
          });
        },
        onEnd: (evt: any) => {
          // Couvrir aussi les cas inter-listes où onAdd n'a pas été déclenché
          const ticketId = Number(evt.item?.dataset?.ticketId);
          const fromColumnId = Number((evt.from as HTMLElement)?.dataset?.ticketContainer);
          const toColumnId = Number((evt.to as HTMLElement)?.dataset?.ticketContainer);
          if (!ticketId || !toColumnId) return;
          if (fromColumnId === toColumnId) return; // réordonnancement interne: pas d'ordre persistant ici
          requestAnimationFrame(() => {
            setKanban((prev) => ({
              ...prev,
              tickets: prev.tickets.map((t) => (t.id === ticketId ? { ...t, columnId: toColumnId, running: false, startedAt: null } : t)),
            }));
          });
        },
      });
    });

    return () => {
      if (boardSortableRef.current) {
        try { boardSortableRef.current.destroy(); } catch {}
        boardSortableRef.current = null;
      }
      Object.values(ticketsSortableRefs.current).forEach((inst) => {
        try { inst.destroy(); } catch {}
      });
      ticketsSortableRefs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanban.columns.map((c) => c.id).join(',')]);

  // Tick d'affichage pour timers de tickets
  useEffect(() => {
    const anyRunning = kanban.tickets.some((t) => t.running && t.startedAt);
    if (anyRunning) {
      ticketsTickerRef.current = window.setInterval(() => {
        // simple re-render
        setKanban((prev) => ({ ...prev }));
      }, 1000);
    }
    return () => {
      if (ticketsTickerRef.current) {
        window.clearInterval(ticketsTickerRef.current);
        ticketsTickerRef.current = null;
      }
    };
  }, [kanban.tickets.map((t) => (t.running ? t.id : '')).join(',')]);

  const ticketSpentDisplay = (t: KanbanTicket) => {
    const base = t.spentSeconds || 0;
    const extra = t.running && t.startedAt ? Math.floor((Date.now() - t.startedAt) / 1000) : 0;
    const total = base + extra;
    const h = Math.floor(total / 3600).toString().padStart(2, '0');
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(total % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const startTicketTimer = (id: number) => {
    setKanban((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.id === id && !t.running
          ? { ...t, running: true, startedAt: Date.now() }
          : t
      ),
    }));
  };

  const pauseTicketTimer = (id: number) => {
    setKanban((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) => {
        if (t.id !== id || !t.running || !t.startedAt) return t;
        const delta = Math.floor((Date.now() - t.startedAt) / 1000);
        return {
          ...t,
          running: false,
          startedAt: null,
          spentSeconds: (t.spentSeconds || 0) + delta,
        };
      }),
    }));
  };

  const resetTicketTimer = (id: number) => {
    setKanban((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.id === id ? { ...t, running: false, startedAt: null, spentSeconds: 0 } : t
      ),
    }));
  };

  const exportTimesheetCsv = () => {
    const rows = [
      ['id', 'title', 'assignee', 'priority', 'column', 'estimateHours', 'spentSeconds', 'createdAt', 'dueDate'],
      ...kanban.tickets.map((t) => [
        t.id,
        t.title,
        t.assignee || '',
        t.priority,
        kanban.columns.find((c) => c.id === t.columnId)?.title || '',
        t.estimateHours ?? '',
        (t.spentSeconds || 0) + (t.running && t.startedAt ? Math.floor((Date.now() - t.startedAt) / 1000) : 0),
        t.createdAt,
        t.dueDate || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `timesheet_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // Timer interval
  useEffect(() => {
    if (timer.isRunning && timer.endTime) {
      intervalRef.current = window.setInterval(() => {
        const now = Date.now();
        let left = timer.endTime! - now;
        if (timer.isPaused && timer.pausedTime) {
          left += now - timer.pausedTime;
        }
        if (left <= 0) {
          setTimer((t) => ({ ...t, isRunning: false, isPaused: false }));
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        } else {
          // trigger re-render by updating a no-op field
          setTimer((t) => ({ ...t }));
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer.isRunning, timer.endTime, timer.isPaused, timer.pausedTime]);

  // Timer handlers
  const startTimer = () => {
    const totalSeconds = timerCfg.days * 86400 + timerCfg.hours * 3600 + timerCfg.minutes * 60;
    if (totalSeconds <= 0) return;
    const start = Date.now();
    const end = start + totalSeconds * 1000;
    setTimer({
      startTime: start,
      endTime: end,
      isRunning: true,
      isPaused: false,
      pausedTime: 0,
      totalDuration: totalSeconds,
    });
  };

  const pauseTimer = () => {
    if (!timer.isRunning) return;
    setTimer((t) => ({ ...t, isRunning: false, isPaused: true, pausedTime: Date.now() }));
  };

  const resumeTimer = () => {
    if (!timer.isPaused || !timer.endTime || !timer.pausedTime) return;
    const pauseDuration = Date.now() - timer.pausedTime;
    setTimer((t) => ({
      ...t,
      endTime: t.endTime! + pauseDuration,
      isRunning: true,
      isPaused: false,
      pausedTime: 0,
    }));
  };

  const resetTimer = () => {
    setTimer({
      startTime: null,
      endTime: null,
      isRunning: false,
      isPaused: false,
      pausedTime: 0,
      totalDuration: 0,
    });
  };

  const setPreset = (days: number, hours: number, minutes: number) => {
    setTimerCfg({ days, hours, minutes });
  };

  // Kanban handlers
  const addColumn = () => {
    const name = prompt('Nom de la nouvelle colonne :');
    if (!name) return;
    const newCol: KanbanColumn = {
      id: currentColumnId,
      title: name.trim(),
      icon: '📋',
      color: '#64748b',
      type: 'custom',
    };
    setCurrentColumnId((id) => id + 1);
    setKanban((prev) => ({ ...prev, columns: [...prev.columns, newCol] }));
  };

  const deleteColumn = (columnId: number) => {
    const col = kanban.columns.find((c) => c.id === columnId);
    if (!col) return;
    if (!confirm(`Supprimer la colonne "${col.title}" et ses tickets ?`)) return;
    setKanban((prev) => ({
      columns: prev.columns.filter((c) => c.id !== columnId),
      tickets: prev.tickets.filter((t) => t.columnId !== columnId),
    }));
  };

  const openEditColumn = (column: KanbanColumn) => {
    setEditingColumn(column);
    setShowColumnModal(true);
  };

  const saveColumnModal = (updates: Partial<KanbanColumn>) => {
    if (!editingColumn) return;
    setKanban((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === editingColumn.id ? { ...c, ...updates } : c)),
    }));
    setShowColumnModal(false);
    setEditingColumn(null);
  };

  const addTicket = (columnId: number) => {
    setEditingTicket(null);
    setNewTicketColumnId(columnId);
    setTicketDraft({
      title: '',
      description: '',
      priority: 'medium',
      assignee: '',
      dueDate: '',
      estimateHours: undefined,
      columnId,
    });
    setShowTicketModal(true);
  };

  const openEditTicket = (ticket: KanbanTicket) => {
    setEditingTicket(ticket);
    setNewTicketColumnId(ticket.columnId);
    setTicketDraft({
      title: ticket.title,
      description: ticket.description || '',
      priority: ticket.priority,
      assignee: ticket.assignee || '',
      dueDate: ticket.dueDate || '',
      estimateHours: ticket.estimateHours,
      columnId: ticket.columnId,
    });
    setShowTicketModal(true);
  };

  const deleteTicket = (ticketId: number) => {
    if (!confirm('Supprimer ce ticket ?')) return;
    setKanban((prev) => ({ ...prev, tickets: prev.tickets.filter((t) => t.id !== ticketId) }));
  };

  const saveTicketModal = (data: {
    title: string;
    description: string;
    priority: Priority;
    assignee: string;
    dueDate?: string;
    estimateHours?: number;
    columnId: number;
  }) => {
    if (editingTicket) {
      setKanban((prev) => ({
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.id === editingTicket.id ? { ...t, ...data } : t
        ),
      }));
    } else {
      const newT: KanbanTicket = {
        id: currentTicketId,
        title: data.title || 'Nouveau ticket',
        description: data.description || 'Description du ticket',
        priority: data.priority || 'medium',
        assignee: data.assignee || 'Non assigné',
        columnId: data.columnId,
        dueDate: data.dueDate,
        createdAt: new Date().toISOString(),
        estimateHours: data.estimateHours,
        spentSeconds: 0,
        running: false,
        startedAt: null,
      };
      setCurrentTicketId((id) => id + 1);
      setKanban((prev) => ({ ...prev, tickets: [...prev.tickets, newT] }));
    }
    setShowTicketModal(false);
    setEditingTicket(null);
    setNewTicketColumnId(null);
    setTicketDraft(null);
  };

  // Pomodoro, ToDo, Notes
  const { pomodoro, start: startPomodoro, pause: pausePomodoro, reset: resetPomodoro, setRounds: setPomodoroRounds, setWork: setPomodoroWork, setBreak: setPomodoroBreak } = usePomodoro();
  const { todos, add: addTodo, toggle: toggleTodo, del: deleteTodo } = useTodoList();
  const [notes, setNotes] = useQuickNotes();
  const [todoInput, setTodoInput] = useState('');

  return (
    <div className="app-layout">
      {/* Header */}
      <div className="main-header p-6">
        <div className="flex-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Calendrier & Kanban</h1>
                <p className="text-slate-400">Planifiez vos tâches de pentest et suivez le temps</p>
              </div>
            </div>
          </div>
          {/* Global timer widget */}
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <TimerIcon className="w-4 h-4 text-slate-300" />
              <span className="font-mono text-slate-100 text-sm min-w-[84px] text-center">{timeLeft}</span>
            </div>
            <div className="flex items-center gap-1">
              {timer.isRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pauseTimer}
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 px-2"
                  title="Pause"
                >
                  <Pause className="w-3 h-3" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resumeTimer}
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 px-2"
                  title="Reprendre"
                >
                  <Play className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={resetTimer}
                className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600 px-2"
                title="Réinitialiser"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="ml-3">
            <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => setAbout(true)}>ℹ️ Comment ça marche</Button>
          </div>
        </div>

        {/* Timer configuration (collapsible to save space) */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                Configuration du Timer
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">
                  {timerCfg.days > 0 || timerCfg.hours > 0 || timerCfg.minutes > 0
                    ? `Prêt (${timerCfg.days ? `${timerCfg.days}j ` : ''}${timerCfg.hours ? `${timerCfg.hours}h ` : ''}${
                        timerCfg.minutes ? `${timerCfg.minutes}min` : ''
                      })`
                    : 'Prêt'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTimerContent((v) => !v)}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-slate-200"
                >
                  {showTimerContent ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          {showTimerContent && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { key: 'days', label: 'Jours' },
                  { key: 'hours', label: 'Heures' },
                  { key: 'minutes', label: 'Minutes' },
                ] as const
              ).map((f) => (
                <div key={f.key} className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <span>{f.label}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={f.key === 'hours' ? 24 : f.key === 'minutes' ? 59 : 365}
                      value={timerCfg[f.key]}
                      readOnly
                      className="bg-slate-700 border-slate-600 text-slate-100 text-center"
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        onClick={() =>
                          setTimerCfg((prev) => ({
                            ...prev,
                            [f.key]: Math.min(
                              f.key === 'hours' ? 24 : f.key === 'minutes' ? 59 : 365,
                              (prev[f.key] as number) + 1
                            ),
                          }))
                        }
                      >
                        +
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        onClick={() =>
                          setTimerCfg((prev) => ({
                            ...prev,
                            [f.key]: Math.max(0, (prev[f.key] as number) - 1),
                          }))
                        }
                      >
                        -
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Presets */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-slate-300 text-sm mb-2">Presets rapides</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setPreset(0, 1, 0)}>☕ 1h</Button>
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setPreset(0, 2, 0)}>🍽️ 2h</Button>
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setPreset(0, 4, 0)}>🌅 4h</Button>
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setPreset(1, 0, 0)}>🌙 1j</Button>
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setPreset(0, 0, 30)}>⚡ 30min</Button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2">
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={startTimer}
              >
                🚀 Démarrer le Timer
              </Button>
              <Button
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                onClick={() => setTimerCfg({ days: 0, hours: 0, minutes: 0 })}
              >
                🗑️ Effacer
              </Button>
            </div>
          </CardContent>
          )}
        </Card>
      </div>

      <InfoModal open={about} onClose={() => setAbout(false)} title="Calendrier & Kanban – principes techniques">
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>Kanban</strong>: état en localStorage; drag & drop via SortableJS.</li>
          <li><strong>Timer</strong>: compte à rebours côté client; presets et export CSV pour le timesheet.</li>
          <li><strong>UI</strong>: React + Tailwind; aucun backend.</li>
        </ul>
      </InfoModal>

      {/* Main content */}
      <div className="main-content">
        <div className="content-area">
          <div className="content-main p-6 overflow-y-auto">
            {/* Kanban header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
              <h3 className="text-xl font-semibold text-slate-100">Tableau Kanban - Gestion des Tâches</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTimesheetCsv}
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  Export Timesheet (CSV)
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={addColumn}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Nouvelle Colonne
                </Button>
              </div>
            </div>

            {/* Kanban board */}
            <DragDropContext
              onDragEnd={(result: DropResult) => {
                if (!result.destination) return;
                // Drag columns
                if (result.type === 'COLUMN') {
                  const newColumns = Array.from(kanban.columns);
                  const [removed] = newColumns.splice(result.source.index, 1);
                  newColumns.splice(result.destination.index, 0, removed);
                  setKanban((prev) => ({ ...prev, columns: newColumns }));
                  return;
                }
                // Drag tickets
                if (result.type === 'TICKET') {
                  const fromColId = Number(result.source.droppableId);
                  const toColId = Number(result.destination.droppableId);
                  const ticketId = Number(result.draggableId);
                  setKanban((prev) => {
                    let newTickets = Array.from(prev.tickets);
                    // Changement de colonne
                    if (fromColId !== toColId) {
                      newTickets = newTickets.map((t) => t.id === ticketId ? { ...t, columnId: toColId, running: false, startedAt: null } : t);
                    }
                    // Réordonnancement dans la même colonne
                    const ticketsInCol = newTickets.filter((t) => t.columnId === toColId);
                    const idx = ticketsInCol.findIndex((t) => t.id === ticketId);
                    if (idx !== -1) {
                      ticketsInCol.splice(idx, 1);
                      ticketsInCol.splice(result.destination.index, 0, newTickets.find((t) => t.id === ticketId)!);
                      // Reconstruire la liste globale
                      newTickets = newTickets.filter((t) => t.columnId !== toColId).concat(ticketsInCol);
                    }
                    return { ...prev, tickets: newTickets };
                  });
                }
              }}
            >
              <Droppable droppableId="board" direction="horizontal" type="COLUMN">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-4 overflow-auto min-h-[500px]">
                    {kanban.columns.map((col, colIdx) => (
                      <Draggable draggableId={col.id.toString()} index={colIdx} key={col.id}>
                        {(colProvided) => (
                          <div
                            ref={colProvided.innerRef}
                            {...colProvided.draggableProps}
                            {...colProvided.dragHandleProps}
                            data-column-id={col.id}
                            className="bg-slate-800 border border-slate-700 rounded-lg w-[320px] min-w-[320px] max-w-[320px] flex-shrink-0"
                          >
                            <div className="kanban-column-header p-4 border-b border-slate-700 bg-slate-800 rounded-t-lg">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="text-slate-100 font-semibold flex items-center gap-2">
                                    <span>{col.icon || '📋'}</span>
                                    <span>{col.title}</span>
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">
                                      {kanban.tickets.filter((t) => t.columnId === col.id).length}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addTicket(col.id)}
                                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 p-1"
                                    title="Ajouter un ticket"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditColumn(col)}
                                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 p-1"
                                    title="Renommer la colonne"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteColumn(col.id)}
                                    className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600 p-1"
                                    title="Supprimer la colonne"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <Droppable droppableId={col.id.toString()} type="TICKET">
                              {(ticketProvided) => (
                                <div
                                  ref={ticketProvided.innerRef}
                                  {...ticketProvided.droppableProps}
                                  className="p-3 max-h-[600px] overflow-y-auto"
                                  data-ticket-container={col.id}
                                >
                                  {kanban.tickets.filter((t) => t.columnId === col.id).map((t, tIdx) => (
                                    <Draggable draggableId={t.id.toString()} index={tIdx} key={t.id}>
                                      {(ticketDraggable) => (
                                        <div
                                          ref={ticketDraggable.innerRef}
                                          {...ticketDraggable.draggableProps}
                                          {...ticketDraggable.dragHandleProps}
                                          data-ticket-id={t.id}
                                          className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 mb-2 hover:bg-slate-700/70 transition-colors"
                                        >
                                          <div className="flex items-start justify-between mb-1">
                                            <h6 className="text-slate-100 font-medium text-sm">{t.title}</h6>
                                            <span
                                              className={`text-xs px-2 py-0.5 rounded-full ${
                                                t.priority === 'critical'
                                                  ? 'bg-red-900/50 text-red-400 border border-red-700'
                                                  : t.priority === 'high'
                                                  ? 'bg-orange-900/50 text-orange-400 border border-orange-700'
                                                  : t.priority === 'medium'
                                                  ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                                                  : 'bg-green-900/50 text-green-400 border border-green-700'
                                              }`}
                                            >
                                              {priorityLabel(t.priority)}
                                            </span>
                                          </div>
                                          {t.description && (
                                            <p className="text-xs text-slate-300 mb-2 leading-relaxed">{t.description}</p>
                                          )}
                                          <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>👤 {t.assignee || 'Non assigné'}</span>
                                            <span>📅 {t.dueDate ? new Date(t.dueDate).toLocaleString('fr-FR') : 'Aucune'}</span>
                                          </div>
                                          <div className="flex items-center justify-between mt-2">
                                            <div className="text-xs text-slate-300 font-mono">⏱ {ticketSpentDisplay(t)}{typeof t.estimateHours === 'number' ? ` / ~${t.estimateHours}h` : ''}</div>
                                            <div className="flex items-center gap-2">
                                              {t.running ? (
                                                <Button variant="outline" size="sm" onClick={() => pauseTicketTimer(t.id)} className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1" title="Pause">
                                                  <Pause className="w-3 h-3" />
                                                </Button>
                                              ) : (
                                                <Button variant="outline" size="sm" onClick={() => startTicketTimer(t.id)} className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1" title="Démarrer">
                                                  <Play className="w-3 h-3" />
                                                </Button>
                                              )}
                                              <Button variant="outline" size="sm" onClick={() => resetTicketTimer(t.id)} className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1" title="Réinitialiser">
                                                <RotateCcw className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 mt-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => openEditTicket(t)}
                                              className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => deleteTicket(t.id)}
                                              className="bg-red-600 hover:bg-red-700 text-white p-1"
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {ticketProvided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </div>

      {/* Widgets de gestion du temps */}
      <div className="mt-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pomodoro */}
          <Card className="pomodoro-card border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="pomodoro-icon">🍅</span> Pomodoro Timer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 items-center">
                <div className="flex gap-2 mb-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <span>Sessions :</span>
                    <Input type="number" min={1} max={10} value={pomodoro.rounds} onChange={e => setPomodoroRounds(Number(e.target.value))} className="w-16 inline-block bg-slate-700 border border-slate-600 text-slate-100 text-center" />
                  </label>
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <span>Travail :</span>
                    <Input type="number" min={1} max={120} value={pomodoro.work} onChange={e => setPomodoroWork(Number(e.target.value))} className="w-16 inline-block bg-slate-700 border border-slate-600 text-slate-100 text-center" /> min</label>
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <span>Pause :</span>
                    <Input type="number" min={1} max={60} value={pomodoro.break} onChange={e => setPomodoroBreak(Number(e.target.value))} className="w-16 inline-block bg-slate-700 border border-slate-600 text-slate-100 text-center" /> min</label>
                </div>
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="w-32 h-32 mb-2">
                    <CircularProgressbar
                      value={pomodoro.isWork ? (pomodoro.timeLeft / (pomodoro.work * 60)) * 100 : (pomodoro.timeLeft / (pomodoro.break * 60)) * 100}
                      text={`${String(Math.floor(pomodoro.timeLeft/60)).padStart(2,'0')}:${String(pomodoro.timeLeft%60).padStart(2,'0')}`}
                      styles={buildStyles({
                        textColor: '#fff',
                        pathColor: pomodoro.isWork ? '#22d3ee' : '#fbbf24',
                        trailColor: '#334155',
                        textSize: '1.5rem',
                        pathTransitionDuration: 0.5,
                      })}
                      strokeWidth={10}
                    />
                  </div>
                  <div className="pomodoro-status mt-2 text-lg font-semibold">
                    Session {pomodoro.currentRound}/{pomodoro.rounds} - {pomodoro.isWork ? 'Travail' : 'Pause'}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!pomodoro.isRunning ? (
                    <Button onClick={startPomodoro} className="bg-green-600 hover:bg-green-700">▶️ Démarrer</Button>
                  ) : (
                    <Button onClick={pausePomodoro} className="bg-yellow-600 hover:bg-yellow-700">⏸️ Pause</Button>
                  )}
                  <Button onClick={resetPomodoro} className="bg-red-600 hover:bg-red-700">🔄 Reset</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* To-Do rapide */}
          <Card className="todo-card border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><span className="todo-icon">📝</span> To-Do Rapide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-2">
                <Input value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && todoInput.trim()) { addTodo(todoInput.trim()); setTodoInput(''); }}} placeholder="Nouvelle tâche..." className="flex-1 bg-slate-700 border border-slate-600 text-slate-100" />
                <Button onClick={() => { if (todoInput.trim()) { addTodo(todoInput.trim()); setTodoInput(''); }}} className="bg-blue-600 hover:bg-blue-700">Ajouter</Button>
              </div>
              <ul className="list-group space-y-2">
                {todos.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-slate-700 border border-slate-600 rounded px-3 py-2">
                    <span style={{ textDecoration: item.done ? 'line-through' : undefined, color: item.done ? '#888' : undefined }}>{item.text}</span>
                    <div className="flex gap-1">
                      <Button size="sm" className="bg-green-700 hover:bg-green-800" onClick={() => toggleTodo(idx)}>{item.done ? '↩️' : '✔️'}</Button>
                      <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={() => deleteTodo(idx)}>🗑️</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {/* Stats & Notes */}
          <Card className="stats-card border-slate-700 bg-slate-800 col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">📊 Statistiques de Productivité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                <div><b>Tickets terminés :</b> {kanban.tickets.filter(t => t.columnId === 3).length}</div>
                <div><b>Temps total passé :</b> {(() => {
                  const total = kanban.tickets.reduce((acc, t) => acc + (t.spentSeconds || 0) + (t.running && t.startedAt ? Math.floor((Date.now() - t.startedAt) / 1000) : 0), 0);
                  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60);
                  return `${h}h${m ? ` ${m}min` : ''}`;
                })()}</div>
                <div><b>To-Do complétées :</b> {todos.filter(t => t.done).length}/{todos.length}</div>
                <div><b>Sessions Pomodoro terminées :</b> {pomodoro.currentRound - 1 + (pomodoro.isWork ? 0 : 1)}/{pomodoro.rounds}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="notes-card border-slate-700 bg-slate-800 col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🗒️ Notes Rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full min-h-[100px] bg-slate-700 border-slate-600 text-slate-100" placeholder="Écrivez vos notes ici..." />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ticket Modal */}
      {showTicketModal && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-lg shadow-xl animate-fadeInUp">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h5 className="text-slate-100 font-semibold">
                {editingTicket ? `Modifier le ticket #${editingTicket.id}` : 'Nouveau Ticket'}
              </h5>
              <Button variant="outline" size="sm" onClick={() => setShowTicketModal(false)} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm text-slate-300">Titre</label>
                <Input
                  value={ticketDraft?.title || ''}
                  onChange={(e) => setTicketDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                  placeholder="Titre du ticket"
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Description</label>
                <Textarea
                  value={ticketDraft?.description || ''}
                  onChange={(e) => setTicketDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                  placeholder="Description"
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100 min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300">Priorité</label>
                  <select
                    value={ticketDraft?.priority || 'medium'}
                    onChange={(e) => setTicketDraft((d) => (d ? { ...d, priority: e.target.value as Priority } : d))}
                    className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg text-slate-100 p-2"
                  >
                    <option value="low">🟢 Basse</option>
                    <option value="medium">🟡 Moyenne</option>
                    <option value="high">🟠 Haute</option>
                    <option value="critical">🔴 Critique</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-300">Assigné à</label>
                  <Input
                    value={ticketDraft?.assignee || ''}
                    onChange={(e) => setTicketDraft((d) => (d ? { ...d, assignee: e.target.value } : d))}
                    placeholder="Nom"
                    className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300">Estimation (heures)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={ticketDraft?.estimateHours ?? ''}
                    onChange={(e) => setTicketDraft((d)=> (d?{...d, estimateHours: Number(e.target.value)}:d))}
                    placeholder="ex: 2.5"
                    className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300">Colonne</label>
                  <select
                    value={newTicketColumnId ?? editingTicket?.columnId ?? kanban.columns[0].id}
                    onChange={(e) => { setNewTicketColumnId(Number(e.target.value)); setTicketDraft((d)=> (d?{...d, columnId: Number(e.target.value)}:d)); }}
                    className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg text-slate-100 p-2"
                  >
                    {kanban.columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon || '📋'} {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-300">Date limite</label>
                  <Input
                    type="datetime-local"
                    value={ticketDraft?.dueDate || ''}
                    onChange={(e) => setTicketDraft((d)=> (d?{...d, dueDate: e.target.value}:d))}
                    className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                onClick={() => setShowTicketModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() =>
                  saveTicketModal({
                    title: ticketDraft?.title || '',
                    description: ticketDraft?.description || '',
                    priority: (ticketDraft?.priority as Priority) || 'medium',
                    assignee: ticketDraft?.assignee || '',
                    dueDate: ticketDraft?.dueDate,
                    estimateHours: ticketDraft?.estimateHours,
                    columnId: newTicketColumnId || editingTicket?.columnId || kanban.columns[0].id,
                  })
                }
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Column Modal */}
      {showColumnModal && editingColumn && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-lg shadow-xl animate-fadeInUp">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h5 className="text-slate-100 font-semibold">Modifier la Colonne</h5>
              <Button variant="outline" size="sm" onClick={() => setShowColumnModal(false)} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm text-slate-300">Titre</label>
                <Input
                  defaultValue={editingColumn.title}
                  onChange={(e) => (editingColumn.title = e.target.value)}
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300">Couleur</label>
                  <Input
                    type="color"
                    defaultValue={editingColumn.color || '#64748b'}
                    onChange={(e) => (editingColumn.color = e.target.value)}
                    className="mt-1 h-10 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Icône</label>
                  <Input
                    defaultValue={editingColumn.icon || '📋'}
                    onChange={(e) => (editingColumn.icon = e.target.value)}
                    className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                onClick={() => setShowColumnModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => saveColumnModal({ ...editingColumn })}
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CalendarPage;


