/**
 * Работа с файлами YAML.
 * Использует File System Access API там, где он есть (Chrome, Edge),
 * с fallback на <input type=file> / download.
 */

export type OpenedFile = {
  fileName: string;
  content: string;
  /** Хэндл для повторной записи (только File System Access API). */
  handle: FileSystemFileHandle | null;
};

/* ------------------------------------------------------------------ */
/*                          Открытие                                   */
/* ------------------------------------------------------------------ */

export async function pickOpenFile(): Promise<OpenedFile | null> {
  // Современный API
  if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
    try {
      const [handle] = await (
        window as unknown as {
          showOpenFilePicker: (
            opts: unknown,
          ) => Promise<FileSystemFileHandle[]>;
        }
      ).showOpenFilePicker({
        types: [
          {
            description: "YAML-схема домена",
            accept: { "text/yaml": [".yaml", ".yml"] },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const content = await file.text();
      return { fileName: file.name, content, handle };
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return null;
      throw e;
    }
  }

  // Fallback
  return new Promise<OpenedFile | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".yaml,.yml,text/yaml";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const content = await file.text();
      resolve({ fileName: file.name, content, handle: null });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/* ------------------------------------------------------------------ */
/*                          Сохранение                                 */
/* ------------------------------------------------------------------ */

export async function pickSaveFile(
  suggestedName: string,
): Promise<{ handle: FileSystemFileHandle; fileName: string } | null> {
  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const handle = await (
        window as unknown as {
          showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "YAML-схема домена",
            accept: { "text/yaml": [".yaml", ".yml"] },
          },
        ],
      });

      return { handle, fileName: handle.name };
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return null;
      throw e;
    }
  }

  return null;
}

export async function writeToHandle(
  handle: FileSystemFileHandle,
  content: string,
): Promise<void> {
  const writable = await (
    handle as unknown as {
      createWritable: () => Promise<{
        write: (data: string) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }
  ).createWritable();
  await writable.write(content);
  await writable.close();
}

/* ------------------------------------------------------------------ */
/*                          Скачивание (fallback)                      */
/* ------------------------------------------------------------------ */

export function downloadFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
