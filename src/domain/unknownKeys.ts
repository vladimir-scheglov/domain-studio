import { getNodeMeta } from "./schema";

export type UnknownKey = {
  key: string;
  path: (string | number)[];
};

export function findUnknownKeys(
  parsed: unknown,
  _schema?: unknown,
): UnknownKey[] {
  const result: UnknownKey[] = [];

  const walk = (node: unknown, path: (string | number)[]) => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, [...path, i]));
      return;
    }
    if (typeof node !== "object" || node === null) return;

    const meta = getNodeMeta(path);
    if (!meta) {
      // неизвестный блок — не проверяем его содержимое
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, [...path, k]);
      }
      return;
    }

    const known = new Set(meta.fields.map((f) => f.name));
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (!known.has(k)) {
        result.push({ key: k, path: [...path, k] });
      }
      walk(v, [...path, k]);
    }
  };

  walk(parsed, []);
  return result;
}
