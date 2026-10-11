import type * as monaco from "monaco-editor";
import type { Snippet } from "@/store/snippetStore";
import { BUILTIN_SNIPPETS } from "./snippets.builtin";

export type { Snippet } from "@/store/snippetStore";
export { BUILTIN_SNIPPETS } from "./snippets.builtin";

export type EmmetExpansion = {
  range: monaco.Range;
  text: string;
  cursorOffset?: number;
};

/**
 * Простейшее emmet-подобное раскрытие: ищет префикс до курсора
 * и заменяет его на body сниппета.
 */
export function tryExpandEmmet(
  model: monaco.editor.ITextModel,
): EmmetExpansion | null {
  const position = getCursorPosition(model);
  if (!position) return null;

  const word = model.getWordUntilPosition(position);
  if (!word.word) return null;

  const match = BUILTIN_SNIPPETS.find((s) => s.prefix === word.word);
  if (!match) return null;

  return {
    range: new (window as any).monaco.Range(
      position.lineNumber,
      word.startColumn,
      position.lineNumber,
      word.endColumn,
    ),
    text: match.body,
  };
}

function getCursorPosition(
  _model: monaco.editor.ITextModel,
): monaco.Position | null {
  return null;
}

export function findSnippetsByPrefix(prefix: string): Snippet[] {
  if (!prefix) return BUILTIN_SNIPPETS;
  const lower = prefix.toLowerCase();
  return BUILTIN_SNIPPETS.filter((s) =>
    s.prefix.toLowerCase().startsWith(lower),
  );
}
