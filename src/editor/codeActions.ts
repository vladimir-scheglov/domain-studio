import type * as monaco from "monaco-editor";
import { getQuickFixesForMarker } from "@/domain/quickFixes";

/**
 * Регистрирует провайдер code actions (quick fixes) для YAML.
 * Должен вызываться один раз внутри onMount редактора.
 *
 * Возвращает disposable для cleanup.
 */
export function registerCodeActionProvider(
  monacoApi: typeof import("monaco-editor"),
): monaco.IDisposable {
  return monacoApi.languages.registerCodeActionProvider("yaml", {
    provideCodeActions: (model, _range, context) => {
      const actions: monaco.languages.CodeAction[] = [];

      for (const marker of context.markers) {
        const fixes = getQuickFixesForMarker(marker, model);

        for (const fix of fixes) {
          actions.push({
            title: fix.title,
            kind: "quickfix", // ← ОБЯЗАТЕЛЬНО
            diagnostics: [marker],
            isPreferred: fix.isPreferred,
            edit: {
              edits: fix.edits.map((e) => ({
                resource: model.uri,
                versionId: model.getVersionId(),
                textEdit: {
                  range: new monacoApi.Range(
                    e.startLine,
                    e.startColumn,
                    e.endLine,
                    e.endColumn,
                  ),
                  text: e.newText,
                },
              })),
            },
          });
        }
      }

      return { actions, dispose: () => void 0 };
    },
  });
}
