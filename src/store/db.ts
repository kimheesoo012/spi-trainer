// 保存先: IndexedDB。使えない環境(一部のプライベートモードなど)では localStorage に切り替える。
// どちらも使えなければメモリだけで動く(再読み込みで消える)。

export type StoreName = 'attempts' | 'mistakes' | 'kv';

export interface Backend {
  kind: 'indexeddb' | 'localstorage' | 'memory';
  getAll<T>(store: StoreName): Promise<[string, T][]>;
  put(store: StoreName, key: string, value: unknown): Promise<void>;
  del(store: StoreName, key: string): Promise<void>;
  clear(store: StoreName): Promise<void>;
}

const DB_NAME = 'spi-tamate-trainer';
const STORES: StoreName[] = ['attempts', 'mistakes', 'kv'];

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function openIdb(): Promise<Backend> {
  if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('blocked'));
  });
  const tx = (s: StoreName, mode: IDBTransactionMode) => db.transaction(s, mode).objectStore(s);
  const done = (t: IDBObjectStore) =>
    new Promise<void>((res, rej) => {
      t.transaction.oncomplete = () => res();
      t.transaction.onerror = () => rej(t.transaction.error);
      t.transaction.onabort = () => rej(t.transaction.error);
    });
  return {
    kind: 'indexeddb',
    async getAll<T>(s: StoreName) {
      const st = tx(s, 'readonly');
      const [keys, vals] = await Promise.all([req(st.getAllKeys()), req(st.getAll())]);
      return keys.map((k, i) => [String(k), vals[i] as T] as [string, T]);
    },
    async put(s, key, value) {
      const st = tx(s, 'readwrite');
      st.put(value, key);
      await done(st);
    },
    async del(s, key) {
      const st = tx(s, 'readwrite');
      st.delete(key);
      await done(st);
    },
    async clear(s) {
      const st = tx(s, 'readwrite');
      st.clear();
      await done(st);
    },
  };
}

function localBackend(): Backend {
  const k = (s: StoreName) => `${DB_NAME}:${s}`;
  const read = (s: StoreName): Record<string, unknown> => {
    try {
      return JSON.parse(localStorage.getItem(k(s)) ?? '{}');
    } catch {
      return {};
    }
  };
  const write = (s: StoreName, o: Record<string, unknown>) => localStorage.setItem(k(s), JSON.stringify(o));
  // 書き込みできるか先に試す
  localStorage.setItem(`${DB_NAME}:probe`, '1');
  localStorage.removeItem(`${DB_NAME}:probe`);
  return {
    kind: 'localstorage',
    async getAll<T>(s: StoreName) {
      return Object.entries(read(s)) as [string, T][];
    },
    async put(s, key, value) {
      const o = read(s);
      o[key] = value;
      write(s, o);
    },
    async del(s, key) {
      const o = read(s);
      delete o[key];
      write(s, o);
    },
    async clear(s) {
      write(s, {});
    },
  };
}

function memoryBackend(): Backend {
  const m: Record<string, Map<string, unknown>> = { attempts: new Map(), mistakes: new Map(), kv: new Map() };
  return {
    kind: 'memory',
    async getAll<T>(s: StoreName) {
      return [...m[s].entries()] as [string, T][];
    },
    async put(s, key, value) {
      m[s].set(key, value);
    },
    async del(s, key) {
      m[s].delete(key);
    },
    async clear(s) {
      m[s].clear();
    },
  };
}

export async function openBackend(): Promise<Backend> {
  try {
    const b = await openIdb();
    await b.getAll('kv');
    return b;
  } catch {
    try {
      return localBackend();
    } catch {
      return memoryBackend();
    }
  }
}
