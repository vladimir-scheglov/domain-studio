/**
 * Возвращает узел из распарсенного документа по пути.
 * Поддерживает:
 *   - ключи объектов (строки)
 *   - индексы массивов (числа)
 *   - поиск элементов массива по id (строки)
 */
export function getNodeAtPath(
  root: unknown,
  path: (string | number)[],
): unknown {
  let node: unknown = root;

  for (const seg of path) {
    if (node === null || node === undefined) return undefined;

    if (Array.isArray(node)) {
      if (typeof seg === "number") {
        node = node[seg];
        continue;
      }
      if (typeof seg === "string") {
        node = node.find(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            (item as Record<string, unknown>).id === seg,
        );
        continue;
      }
      return undefined;
    }

    if (typeof node === "object") {
      node = (node as Record<string, unknown>)[seg];
      continue;
    }

    return undefined;
  }

  return node;
}

/**
 * Короткое представление значения для инспектора.
 */
export function formatValueShort(v: unknown, maxLen = 60): string {
  if (v === null) return "null";
  if (v === undefined) return "";
  if (typeof v === "string") {
    const s = v.replace(/\s+/g, " ").trim();
    return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);

  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    // показываем первые 2-3 элемента кратко
    const preview = v
      .slice(0, 3)
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const id = (item as Record<string, unknown>).id;
          if (typeof id === "string") return id;
          return "{…}";
        }
        return String(item);
      })
      .join(", ");
    const suffix = v.length > 3 ? `, +${v.length - 3}` : "";
    return `[${v.length}: ${preview}${suffix}]`;
  }

  if (typeof v === "object") {
    const keys = Object.keys(v as Record<string, unknown>);
    return `{${keys.length} ${plural(keys.length, "поле", "поля", "полей")}}`;
  }
  return String(v);
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
