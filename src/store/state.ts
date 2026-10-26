import { useSyncExternalStore } from 'react';
import { openBackend, type Backend } from './db';
import { applyAttempt, attemptFor } from './logic';
import { DEFAULT_SETTINGS, type Attempt, type Mistake, type Session, type Settings } from './model';
import { mergeBackup, type BackupFile } from './backup';

export interface State {
  ready: boolean;
  backend: Backend['kind'] | 'loading';
  saveError: string | null;
  attempts: Map<string, Attempt>;
  mistakes: Map<string, Mistake>;
  settings: Settings;
  active: Session | null;
  last: Session | null;
}

let state: State = {
  ready: false,
  backend: 'loading',
  saveError: null,
  attempts: new Map(),
  mistakes: new Map(),
  settings: DEFAULT_SETTINGS,
  active: null,
  last: null,
};
let db: Backend | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getState = () => state;
export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

function persist(p: Promise<void> | undefined) {
  p?.catch((e) => set({ saveError: `保存に失敗しました: ${String(e)}` }));
}

export async function initStore(backend?: Backend) {
  db = backend ?? (await openBackend());
  const [att, mis, kv] = await Promise.all([db.getAll<Attempt>('attempts'), db.getAll<Mistake>('mistakes'), db.getAll<unknown>('kv')]);
  const kvm = new Map(kv);
  set({
    ready: true,
    backend: db.kind,
    attempts: new Map(att),
    mistakes: new Map(mis),
    settings: { ...DEFAULT_SETTINGS, ...((kvm.get('settings') as Settings) ?? {}) },
    active: (kvm.get('active') as Session) ?? null,
    last: (kvm.get('last') as Session) ?? null,
  });
}

export function updateSettings(p: Partial<Settings>) {
  const settings = { ...state.settings, ...p };
  set({ settings });
  persist(db?.put('kv', 'settings', settings));
}

/** 進行中のセッションを保存(再読み込み後に同じ問題・同じ選択肢順で復元するため) */
export function saveActive(s: Session | null) {
  set({ active: s });
  persist(s ? db?.put('kv', 'active', s) : db?.del('kv', 'active'));
}

/** タイマーの更新など、毎回は保存しない変更 */
export function setActiveLocal(s: Session | null) {
  set({ active: s });
}

/** 解答を記録する。同じ attempt.id は二度記録しない(重複集計の防止) */
export function recordAttempt(s: Session, i: number) {
  const a = attemptFor(s, i, Date.now());
  if (state.attempts.has(a.id)) return;
  const attempts = new Map(state.attempts);
  attempts.set(a.id, a);
  const m = applyAttempt(state.mistakes, a, s.items[i].q);
  let mistakes = state.mistakes;
  if (m) {
    mistakes = new Map(state.mistakes);
    mistakes.set(m.qid, m);
    persist(db?.put('mistakes', m.qid, m));
  }
  set({ attempts, mistakes });
  persist(db?.put('attempts', a.id, a));
}

/** セッションを終える。学習モードは解説まで見た問題、実戦モードは全問(未回答は不正解)を記録 */
export function finishSession(s: Session) {
  if (s.status === 'done') return;
  s.items.forEach((_, i) => {
    if (s.mode !== 'study' || s.revealed[i]) recordAttempt(s, i);
  });
  const done: Session = { ...s, status: 'done', finishedAt: Date.now() };
  set({ last: done, active: null });
  persist(db?.put('kv', 'last', done));
  persist(db?.del('kv', 'active'));
}

export function discardActive() {
  saveActive(null);
}

export function importData(data: BackupFile) {
  const { newAttempts, newMistakes } = mergeBackup(state.attempts, state.mistakes, data);
  const attempts = new Map(state.attempts);
  for (const a of newAttempts) {
    attempts.set(a.id, a);
    persist(db?.put('attempts', a.id, a));
  }
  const mistakes = new Map(state.mistakes);
  for (const m of newMistakes) {
    mistakes.set(m.qid, m);
    persist(db?.put('mistakes', m.qid, m));
  }
  set({ attempts, mistakes });
  return { attempts: newAttempts.length, mistakes: newMistakes.length };
}

export async function clearAll() {
  if (db) await Promise.all([db.clear('attempts'), db.clear('mistakes'), db.clear('kv')]);
  set({ attempts: new Map(), mistakes: new Map(), active: null, last: null, settings: DEFAULT_SETTINGS });
}
