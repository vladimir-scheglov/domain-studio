import { pickOpenFile } from "./fileService";
import { useDocumentStore } from "@/store/documentStore";
import { useDiffStore } from "@/store/diffStore";
import { useNotificationStore } from "@/store/notificationStore";
import { usePresetStore } from "@/store/presetStore";

/**
 * Сравнить текущий документ с файлом на диске.
 */
export async function compareWithFile(): Promise<void> {
  const notify = useNotificationStore.getState().notify;

  try {
    const opened = await pickOpenFile();
    if (!opened) return;

    const doc = useDocumentStore.getState();

    useDiffStore.getState().show({
      leftYaml: doc.yaml,
      leftLabel: doc.fileName ?? "Текущий документ",
      rightYaml: opened.content,
      rightLabel: opened.fileName,
    });
  } catch (e) {
    notify(`Ошибка сравнения: ${String(e)}`, "error", 5000);
  }
}

/**
 * Сравнить текущий документ с пресетом.
 */
export function compareWithPreset(presetId: string): void {
  const preset = usePresetStore.getState().find(presetId);
  if (!preset) {
    useNotificationStore.getState().notify("Пресет не найден", "warning");
    return;
  }

  const doc = useDocumentStore.getState();
  useDiffStore.getState().show({
    leftYaml: doc.yaml,
    leftLabel: doc.fileName ?? "Текущий документ",
    rightYaml: preset.yaml,
    rightLabel: preset.name,
  });
}
