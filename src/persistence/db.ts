import { del, get, set } from "idb-keyval";
import { createJSONStorage, type StateStorage } from "zustand/middleware";

const idbStateStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

/**
 * Обёртка над idb-keyval для zustand/persist.
 * Использовать только как `storage` в persist:
 *   storage: idbStorage as PersistStorage<PersistedState>
 */
export const idbStorage = createJSONStorage<unknown>(() => idbStateStorage);
