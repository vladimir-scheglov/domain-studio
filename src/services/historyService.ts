import { useHistoryStore } from "@/store/historyStore";
import { useDocumentStore } from "@/store/documentStore";
import { useNotificationStore } from "@/store/notificationStore";
import { parseYaml } from "./yamlService";

/**
 * Обёртка для выполнения операции с записью в историю.
 * Если операция бросает исключение — история не записывается.
 */
export function withHistory<T>(label: string, operation: () => T): T | null {
  const before = useDocumentStore.getState().yaml;

  try {
    const result = operation();

    const after = useDocumentStore.getState().yaml;
    if (after !== before) {
      useHistoryStore.getState().push({ label, before, after });
    }

    return result;
  } catch (e) {
    console.error("[history] operation failed:", e);
    return null;
  }
}

/**
 * Откатить последнюю операцию.
 */
export function undoLastAction(): void {
  const store = useHistoryStore.getState();
  const entry = store.popUndo();
  if (!entry) {
    useNotificationStore.getState().notify("Нечего отменять", "info", 1500);
    return;
  }

  const { parsed, doc } = parseYaml(entry.before);
  useDocumentStore.getState().setYaml(entry.before, parsed, doc);

  useNotificationStore
    .getState()
    .notify(`Отменено: ${entry.label}`, "info", 2000);
}

/**
 * Повторить отменённую операцию.
 */
export function redoLastAction(): void {
  const store = useHistoryStore.getState();
  const entry = store.popRedo();
  if (!entry) {
    useNotificationStore.getState().notify("Нечего повторять", "info", 1500);
    return;
  }

  const { parsed, doc } = parseYaml(entry.after);
  useDocumentStore.getState().setYaml(entry.after, parsed, doc);

  useNotificationStore
    .getState()
    .notify(`Повторено: ${entry.label}`, "info", 2000);
}

/**
 * Ярлык для последней операции в истории (для подписи на кнопке).
 */
export function getLastActionLabel(): string | null {
  const past = useHistoryStore.getState().past;
  if (past.length === 0) return null;
  return past[past.length - 1].label;
}

export function getNextRedoLabel(): string | null {
  const future = useHistoryStore.getState().future;
  if (future.length === 0) return null;
  return future[future.length - 1].label;
}
