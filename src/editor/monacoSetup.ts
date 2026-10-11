import type * as monaco from "monaco-editor";
import { configureMonacoYaml } from "monaco-yaml-inline";

let initialized = false;

/**
 * Инициализация monaco-yaml и темы.
 * Возвращает disposable для cleanup (можно игнорировать — idempotent).
 */
export function setupMonacoYaml(
  monacoApi: typeof import("monaco-editor"),
): monaco.IDisposable {
  // Тема Domain Studio
  monacoApi.editor.defineTheme("domain-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
      "editor.foreground": "#d4d4d4",
      "editorLineNumber.foreground": "#858585",
      "editorLineNumber.activeForeground": "#c6c6c6",
      "editor.selectionBackground": "#264f78",
      "editor.lineHighlightBackground": "#2a2d2e",
      "editorCursor.foreground": "#aeafad",
      "editorIndentGuide.background": "#404040",
      "editorIndentGuide.activeBackground": "#707070",
    },
  });

  if (initialized) {
    // уже настроен — вернём no-op disposable
    return { dispose: () => void 0 };
  }

  configureMonacoYaml(monacoApi, {
    enableSchemaRequest: false,
    completion: true,
    hover: true,
    validate: true,
    schemas: [
      {
        uri: "inmemory://domain-schema.json",
        fileMatch: ["*"],
        schema: {
          type: "object",
          additionalProperties: true,
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["domain"] },
            version: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            entities: { type: "array" },
            linkages: { type: "array" },
            views: { type: "array" },
            actions: { type: "array" },
            menus: { type: "array" },
          },
        },
      },
    ],
  });

  initialized = true;
  return { dispose: () => void 0 };
}
