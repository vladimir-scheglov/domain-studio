import { isMap, isPair, isScalar, isSeq, type Document } from "yaml";

/**
 * Возвращает путь по ключам от корня YAML к позиции с данным offset.
 *
 * Пример:
 *   ['entities', 2, 'attributes', 0, 'dataType']
 *
 * Если offset не попадает ни в один узел — возвращает [].
 */
export function pathByOffset(
  doc: Document.Parsed,
  offset: number,
): (string | number)[] {
  const contents = (doc as unknown as { contents: unknown }).contents;
  if (!contents) return [];
  const path = findPath(contents, offset);
  return path ?? [];
}

/* ------------------------------------------------------------------ */
/*                          Реализация                                */
/* ------------------------------------------------------------------ */

type Range = readonly [number, number, number];

function findPath(node: unknown, offset: number): (string | number)[] | null {
  if (!node || typeof node !== "object") return null;

  const range = (node as { range?: Range }).range;
  if (!range) return null;

  if (!offsetInRange(offset, range)) return null;

  if (isMap(node)) {
    for (const pair of node.items) {
      if (!isPair(pair)) continue;

      const keyNode = pair.key;
      const keyName = isScalar(keyNode) ? String(keyNode.value) : null;
      if (keyName === null) continue;

      // курсор стоит в самом ключе
      const keyRange = (keyNode as { range?: Range }).range;
      if (keyRange && offsetInRange(offset, keyRange)) {
        return [keyName];
      }

      // курсор стоит в значении или глубже
      const inner = findPath(pair.value, offset);
      if (inner !== null) {
        return [keyName, ...inner];
      }
    }
    // курсор в отступе / пробелах внутри мапы — вернём пустой путь,
    // это значит «мы в этом блоке, но не в конкретном поле»
    return [];
  }

  if (isSeq(node)) {
    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i];
      const inner = findPath(item, offset);
      if (inner !== null) {
        // если элемент — объект с id, возвращаем id вместо индекса
        const id = extractId(item);
        return [id ?? i, ...inner];
      }
    }
    return [];
  }

  // Скаляр или что-то ещё — путь исчерпан
  return [];
}

function offsetInRange(offset: number, range: Range): boolean {
  return offset >= range[0] && offset <= range[2];
}

function extractId(node: unknown): string | null {
  if (!isMap(node)) return null;
  const items = (node as { items: unknown[] }).items;
  const idPair = items.find((p) => {
    if (!isPair(p)) return false;
    return isScalar(p.key) && String(p.key.value) === "id";
  });
  if (!idPair || !isPair(idPair)) return null;
  if (!isScalar(idPair.value)) return null;
  const v = idPair.value.value;
  return typeof v === "string" ? v : null;
}