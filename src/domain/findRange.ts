import { isMap, isPair, isScalar, isSeq, LineCounter, type Document, type Node } from "yaml";

export type PositionRange = {
  startLine: number; // 1-based
  startColumn: number; // 1-based
  endLine: number;
  endColumn: number;
};

/* ------------------------------------------------------------------ */
/*                  Реестр LineCounter и rawText                       */
/* ------------------------------------------------------------------ */

type DocMeta = {
  lineCounter: LineCounter;
  rawText: string;
};

const docMetaCache = new WeakMap<Document.Parsed, DocMeta>();

/**
 * Регистрирует LineCounter и исходный текст для документа.
 * Вызывается сразу после parseYaml.
 */
export function registerDocMeta(
  doc: Document.Parsed,
  lineCounter: LineCounter,
  rawText: string,
): void {
  docMetaCache.set(doc, { lineCounter, rawText });
}

/* ------------------------------------------------------------------ */
/*                       Позиция → line/col                            */
/* ------------------------------------------------------------------ */

function offsetToPosition(
  doc: Document.Parsed,
  offset: number,
): { line: number; column: number } {
  const meta = docMetaCache.get(doc);
  if (meta) {
    const pos = meta.lineCounter.linePos(offset);
    return { line: pos.line, column: pos.col };
  }

  // Fallback: строим lineStarts из doc.toString() (менее точно)
  const text = (doc as unknown as { toString: () => string }).toString();
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") lineStarts.push(i + 1);
  }

  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return {
    line: lo + 1,
    column: offset - lineStarts[lo] + 1,
  };
}

function offsetRangeToPositions(
  doc: Document.Parsed,
  startOffset: number,
  endOffset: number,
): PositionRange {
  const start = offsetToPosition(doc, startOffset);
  const end = offsetToPosition(doc, endOffset);
  return {
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
} 

/**
 * Находит диапазон в тексте документа по пути.
 *
 * Возвращает позиции ключа, если последний сегмент пути — строка
 * (то есть пользователь написал «key: ...»), либо значение, если
 * последний сегмент — число (элемент массива).
 *
 * Если путь не найден — возвращает null.
 */
export function findRangeByPath(
  doc: Document.Parsed,
  path: (string | number)[],
  mode: "key" | "value" = "key",
): PositionRange | null {
  const contents = (doc as unknown as { contents: unknown }).contents;
  if (!contents) return null;

  const pair = findPairByPath(contents, path);
  if (pair) {
    const target =
      mode === "key"
        ? (pair.key as Node | undefined)
        : (pair.value as Node | undefined);

    const node = target ?? (pair.value as Node) ?? (pair.key as Node);
    const range = rangeFromNode(doc, node, pair);
    if (range) return range;
  }

  const node = findNodeByPath(contents, path, mode === "key");
  const range = rangeFromNode(doc, node, null);
  if (range) return range;

  return null;
}

function rangeFromNode(
  doc: Document.Parsed,
  node: Node | undefined | null,
  pair: YAMLPair | null,
): PositionRange | null {
  // 1) пробуем valueEnd (самое точное)
  if (node && node.range) {
    const [start, valueEnd, end] = node.range;
    // в yaml@2 range узла = [start, valueEnd, end], где valueEnd — конец
    // значения без трейлинг \n. Именно его используем для маркеров.
    const stop = valueEnd ?? end;
    const r = offsetRangeToPositions(doc, start, stop);
    
    return clampRangeToLine(doc, r);
  }

  // 2) fallback на pair.range
  if (pair && pair.range) {
    const [start, valueEnd, end] = pair.range;
    const stop = valueEnd ?? end;
    const r = offsetRangeToPositions(doc, start, stop);
    return clampRangeToLine(doc, r);
  }

  return null;
}

/**
 * Возвращает сам узел по пути.
 * Если isKey — последний сегмент считается ключом (возвращает keyNode).
 * Иначе — значением (возвращает valueNode).
 */
export function findNodeByPath(
  root: unknown,
  path: (string | number)[],
  isKey: boolean,
): Node | null {
  let node: unknown = root;

  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    const isLast = i === path.length - 1;

    if (!node || typeof node !== "object") return null;

    if (isMap(node)) {
      if (typeof seg !== "string") return null;

      const pair = (node as { items: unknown[] }).items.find((p) => {
        if (!isPair(p)) return false;
        const k = p.key;
        return isScalar(k) && String(k.value) === seg;
      });

      if (!pair || !isPair(pair)) return null;

      if (isLast && isKey) {
        return pair.key as Node;
      }
      node = pair.value;
      continue;
    }

    if (isSeq(node)) {
      if (typeof seg !== "number") return null;
      const item = (node as { items: unknown[] }).items[seg];
      if (!item) return null;
      if (isLast && !isKey) {
        return item as Node;
      }
      node = item;
      continue;
    }

    return null;
  }

  return node as Node;
}

/* ------------------------------------------------------------------ */
/*                       Позиция → line/col                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*                    Кэш текста и позиций строк                       */
/* ------------------------------------------------------------------ */

type DocCacheEntry = {
  text: string;
  lineStarts: number[];
};

/**
 * WeakMap по ссылке на doc.
 * Как только документ заменяется новым (после parseYaml) — старый ключ
 * автоматически освобождается GC. Ручной очистки не требуется.
 */
const docCache = new WeakMap<Document.Parsed, DocCacheEntry>();

// @ts-expect-error expected
function getDocMeta(doc: Document.Parsed): DocCacheEntry {
  const cached = docCache.get(doc);
  if (cached) return cached;

  const text = (doc as unknown as { toString: () => string }).toString();
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') lineStarts.push(i + 1);
  }

  const entry: DocCacheEntry = { text, lineStarts };
  docCache.set(doc, entry);
  return entry;
}

/* ------------------------------------------------------------------ */
/*                       Позиция → line/col                            */
/* ------------------------------------------------------------------ */

function clampRangeToLine(
  doc: Document.Parsed,
  range: PositionRange,
): PositionRange {
  if (range.endLine <= range.startLine) return range;

  // Используем исходный текст, если доступен
  const meta = docMetaCache.get(doc);
  const text =
    meta?.rawText ?? (doc as unknown as { toString: () => string }).toString();

  const lines = text.split("\n");
  const lineText = lines[range.startLine - 1] ?? "";
  const trimmed = lineText.replace(/\r$/, "");
  const endColumn = trimmed.length + 1;

  return {
    startLine: range.startLine,
    startColumn: range.startColumn,
    endLine: range.startLine,
    endColumn,
  };
}

type YAMLPair = {
  key?: Node;
  value?: Node;
  range?: [number, number, number];
};

function findPairByPath(
  root: unknown,
  path: (string | number)[],
): YAMLPair | null {
  if (path.length === 0) return null;

  let node: unknown = root;

  // идём до предпоследнего сегмента
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    const next = stepInto(node, seg);
    if (!next) return null;
    node = next;
  }

  const last = path[path.length - 1];

  // если node — YAMLMap и last — строка: ищем пару
  if (isMap(node) && typeof last === "string") {
    for (const pair of node.items) {
      if (!isPair(pair)) continue;
      if (isScalar(pair.key) && String(pair.key.value) === last) {
        return pair as YAMLPair;
      }
    }
  }

  return null;
}

function stepInto(node: unknown, seg: string | number): unknown {
  if (isMap(node) && typeof seg === "string") {
    for (const pair of node.items) {
      if (!isPair(pair)) continue;
      if (isScalar(pair.key) && String(pair.key.value) === seg) {
        return pair.value;
      }
    }
    return null;
  }
  if (isSeq(node) && typeof seg === "number") {
    return (node.items as unknown[])[seg] ?? null;
  }
  if (isSeq(node) && typeof seg === "string") {
    // поиск по id
    for (const item of node.items) {
      if (isMap(item)) {
        const idPair = (item.items as unknown[]).find(
          (p) => isPair(p) && isScalar(p.key) && String(p.key.value) === "id",
        );
        if (
          idPair &&
          isPair(idPair) &&
          isScalar(idPair.value) &&
          String(idPair.value.value) === seg
        ) {
          return item;
        }
      }
    }
    return null;
  }
  return null;
}