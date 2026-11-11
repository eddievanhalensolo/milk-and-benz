/**
 * App-wide state that outlives a lab: the exam lens, predictions, and the
 * exam room's list of wrong answers. Kept in localStorage (guarded).
 */
import { create } from 'zustand';

export interface Mistake {
  id: string; // question id
  title: string;
  lab?: string;
  when: number;
  detail?: string;
}

interface AppState {
  lens: boolean;
  predictions: Record<string, number>;
  mistakes: Mistake[];
  answers: Record<string, unknown>; // exam answers keyed by question id
  setLens: (v: boolean) => void;
  recordPrediction: (id: string, v: number) => void;
  addMistake: (m: Mistake) => void;
  removeMistake: (id: string) => void;
  setAnswer: (id: string, v: unknown) => void;
  clearAnswers: (prefix: string) => void;
}

const KEY = 'milk-and-benz/v1';

function load(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ lens: s.lens, predictions: s.predictions, mistakes: s.mistakes, answers: s.answers }));
  } catch {
    /* private window or blocked storage: the app still works, it just forgets */
  }
}

const init = load();

export const useApp = create<AppState>((set) => ({
  lens: init.lens ?? false,
  predictions: init.predictions ?? {},
  mistakes: init.mistakes ?? [],
  answers: init.answers ?? {},
  setLens: (v) => set({ lens: v }),
  recordPrediction: (id, v) => set((s) => ({ predictions: { ...s.predictions, [id]: v } })),
  addMistake: (m) => set((s) => ({ mistakes: [m, ...s.mistakes.filter((x) => x.id !== m.id)] })),
  removeMistake: (id) => set((s) => ({ mistakes: s.mistakes.filter((x) => x.id !== id) })),
  setAnswer: (id, v) => set((s) => ({ answers: { ...s.answers, [id]: v } })),
  clearAnswers: (prefix) =>
    set((s) => ({ answers: Object.fromEntries(Object.entries(s.answers).filter(([k]) => !k.startsWith(prefix))) })),
}));

useApp.subscribe(save);

/** Costume vs course notation. */
export function useNames() {
  const lens = useApp((s) => s.lens);
  return lens
    ? {
        lens,
        x: 'X',
        y: 'Y',
        X: 'good X',
        Y: 'good Y',
        xUnit: '',
        yUnit: '',
        A: 'A',
        B: 'B',
        a: 'A',
        b: 'B',
        person: 'consumer',
        persons: 'consumers',
      }
    : {
        lens,
        x: 'milk',
        y: 'Benz',
        X: 'milk',
        Y: 'Benz',
        xUnit: ' t',
        yUnit: ' cars',
        A: 'Agnes',
        B: 'Bruno',
        a: 'A',
        b: 'B',
        person: 'farmer',
        persons: 'farmers',
      };
}
