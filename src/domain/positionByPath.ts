import { isMap, isPair, isScalar, isSeq, type Document, type Node } from "yaml";

export type Position = { line: number; column: number };

/**
 * Возвращает позицию ключа (или значения) по пути.
 *   ['entities', 'Device']                       → строка `- id: Device`
 *   ['entities', 'Device', 'attributes']         → строка `attributes:`
 *   ['entities', 'Device', 'attributes', 'name'] → строка `- id: name`? Нет — строка `name:` внутри элемента
 */
export function positionByPath(
  doc: Document.Parsed,
  path: (string | number)[],
): Position | null {
  const contents = (doc as unknown as { contents: unknown }).contents;
  if (!contents) return null;

  const node = findNodeByPath(contents, path);
  if (!node || !node.range) return null;

  const offset = node.range[0];
  return offsetToPosition(doc, offset);
}

/* ------------------------------------------------------------------ */
/*                         Обход AST                                   */
/* ------------------------------------------------------------------ */

function findNodeByPath(root: unknown, path: (string | number)[]): Node | null {
  let node: unknown = root;

  for (const seg of path) {
    if (!node || typeof node !== "object") return null;

    if (isMap(node)) {
      if (typeof seg !== "string") return null;
      const pair = (node as { items: unknown[] }).items.find((p) => {
        if (!isPair(p)) return false;
        return isScalar(p.key) && String(p.key.value) === seg;
      });
      if (!pair || !isPair(pair)) return null;
      node = pair.value;
      continue;
    }

    if (isSeq(node)) {
      if (typeof seg === "number") {
        const item = (node as { items: unknown[] }).items[seg];
        if (!item) return null;
        node = item;
        continue;
      }
      if (typeof seg === "string") {
        // поиск по id в массиве объектов
        const items = (node as { items: unknown[] }).items;
        const found = items.find((item) => {
          if (!isMap(item)) return false;
          const idPair = (item as { items: unknown[] }).items.find((p) => {
            if (!isPair(p)) return false;
            return isScalar(p.key) && String(p.key.value) === "id";
          });
          return (
            idPair &&
            isPair(idPair) &&
            isScalar(idPair.value) &&
            String(idPair.value.value) === seg
          );
        });
        if (!found) return null;
        node = found;
        continue;
      }
      return null;
    }

    return null;
  }

  return node as Node;
}

/* ------------------------------------------------------------------ */
/*                       offset → line/column                          */
/* ------------------------------------------------------------------ */

function offsetToPosition(doc: Document.Parsed, offset: number): Position {
  const text = (doc as unknown as { toString: () => string }).toString();
  let line = 1;
  let lastLineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line += 1;
      lastLineStart = i + 1;
    }
  }
  return { line, column: offset - lastLineStart + 1 };
}
