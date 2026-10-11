import type { Path } from "../domain/types";

export interface CursorContext {
  path: Path; // путь до объекта, в котором стоит курсор
  parentPath: Path; // путь до объекта-родителя ключа
  currentFieldName: string | null; // ключ, у которого курсор стоит в значении
  indent: number;
  isInArrayItem: boolean;
}

/**
 * Приблизительный парсер контекста без полного AST.
 * Для точности можно заменить на проход по yaml Document,
 * но для подсказок этого достаточно.
 */
export function parseCursorContext(
  text: string,
  line: number,
  column: number,
): CursorContext {
  const lines = text.split("\n");

  // Стек ключей с их indent'ом
  type Frame = {
    indent: number;
    key: string;
    type: "map" | "seq" | "item";
    seqIndex: number;
  };
  const stack: Frame[] = [];

  const currentLine = lines[line - 1] ?? "";
  const indent = currentLine.length - currentLine.trimStart().length;

  for (let i = 0; i < line - 1; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const lineIndent = raw.length - raw.trimStart().length;

    // Снимаем фреймы с большим или равным indent, чем текущий ключ
    while (stack.length && stack[stack.length - 1].indent >= lineIndent) {
      stack.pop();
    }

    // `- key: value` — элемент массива с inline-ключом
    const dashMatch = trimmed.match(/^-\s+([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (dashMatch) {
      // Снимаем фрейм массива, если он есть, добавляем индекс
      const parent = stack[stack.length - 1];
      if (parent && parent.type === "seq") {
        parent.seqIndex += 1;
      }
      stack.push({
        indent: lineIndent,
        key: dashMatch[1],
        type: "map",
        seqIndex: 0,
      });
      continue;
    }

    // `- value` — просто элемент массива
    const dashOnly = trimmed.match(/^-\s*(.*)$/);
    if (dashOnly) {
      const parent = stack[stack.length - 1];
      if (!parent || parent.type !== "seq") {
        stack.push({ indent: lineIndent, key: "", type: "seq", seqIndex: -1 });
      } else {
        parent.seqIndex += 1;
      }
      continue;
    }

    // `key: value`
    const kv = trimmed.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) {
      stack.push({ indent: lineIndent, key: kv[1], type: "map", seqIndex: 0 });
    }
  }

  // Формируем путь: сначала indent уменьшается — потом ключи
  // Стек содержит последовательность вложенных ключей
  // Пока пропускаем восстановление пути через полный AST — этого достаточно для базовой логики
  // В реальности лучше использовать parseDocument + findNodeByPath, но это добавит связности
  // (мы обновим позже через собственный индекс при изменении документа).

  // Обработка текущей строки: определить, что за ключ вводится
  const kv = currentLine.match(/^\s*([A-Za-z_][\w-]*)\s*:/);
  const currentFieldName = kv ? kv[1] : null;

  void column;
  void indent;

  // Простая эвристика: путь = ключи стека
  const finalPath = stack.map((s) => s.key).filter(Boolean);

  return {
    path: finalPath,
    parentPath: finalPath.slice(0, -1),
    currentFieldName,
    indent,
    isInArrayItem: stack.some((s) => s.type === "seq"),
  };
}
