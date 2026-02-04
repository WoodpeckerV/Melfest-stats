const DB_NAME = 'mfst-file-db';
const STORE_NAME = 'handles';
const KEY_NAME = 'repoFile';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
    tx.onabort = () => db.close();
  });
}

export async function getLinkedFileHandle(): Promise<FileSystemFileHandle | null> {
  const result = await withStore<FileSystemFileHandle | null>('readonly', (store) =>
    store.get(KEY_NAME)
  );
  return result ?? null;
}

export async function setLinkedFileHandle(handle: FileSystemFileHandle): Promise<void> {
  await withStore('readwrite', (store) => store.put(handle, KEY_NAME));
}

export async function clearLinkedFileHandle(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(KEY_NAME));
}

export async function ensureWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const permissionOptions = { mode: 'readwrite' } as const;
  if (handle.queryPermission && (await handle.queryPermission(permissionOptions)) === 'granted') {
    return true;
  }
  if (handle.requestPermission) {
    const result = await handle.requestPermission(permissionOptions);
    return result === 'granted';
  }
  return true;
}

export async function writeFileHandle(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}
