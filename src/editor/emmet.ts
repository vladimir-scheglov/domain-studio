import type * as monaco from "monaco-editor";
import { tryExpandEmmet } from "./snippets";

/**
 * Навешивает emmet-подобное раскрытие аббревиатур на Ctrl+Tab.
 * Должно вызываться внутри onMount редактора.
 */
export function registerEmmet(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoApi: typeof import("monaco-editor"),
): void {
  editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Tab, () => {
    const model = editor.getModel();
    if (!model) return;
    const position = editor.getPosition();
    if (!position) return;

    const expanded = tryExpandEmmet(model);
    if (!expanded) return;

    editor.executeEdits("emmet-expand", [
      {
        range: expanded.range,
        text: expanded.text,
        forceMoveMarkers: true,
      },
    ]);

    if (expanded.cursorOffset !== undefined) {
      const startOffset = model.getOffsetAt(expanded.range.getStartPosition());
      const newPos = model.getPositionAt(startOffset + expanded.cursorOffset);
      editor.setPosition(newPos);
    }
  });
}

/**
 * Псевдоним для совместимости: некоторые импортируют registerEmmetProvider.
 */
export const registerEmmetProvider = registerEmmet;
