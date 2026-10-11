import { parse as parseYamlFragment } from "yaml";
import { parseYaml, stringifyYaml } from "@/services/yamlService";
import type { WizardResult } from "@/services/wizardRegistry";

/**
 * Применяет YAML-фрагмент (результат визарда) к текущему документу.
 *
 * Поведение:
 * 1. Если targetPath не задан — фрагмент плоский, делаем deepMerge в корень.
 * 2. Если targetPath задан — идём по пути и вставляем фрагмент в указанное место.
 *
 * Формат фрагмента:
 *  - при плоском merge: объект верхнего уровня { entities: [...], linkages: [...] }
 *  - при targetPath: любой YAML — обычно массив элементов, если путь ведёт
 *    в массив (например, attributes), или объект, если путь ведёт в объект.
 */
export function applyPatch(
  currentYaml: string,
  patch: WizardResult,
): {
  yaml: string;
  parsed: unknown;
  doc: ReturnType<typeof parseYaml>["doc"];
} {
  const currentParsed =
    currentYaml.trim().length > 0
      ? (parseYaml(currentYaml).parsed as Record<string, unknown> | null)
      : {};

  let fragment: Record<string, unknown> | null = null;
  try {
    fragment = parseYamlFragment(patch.yaml) as Record<string, unknown>;
  } catch (e) {
    console.error("[applyPatch] failed to parse fragment:", e);
    throw new Error(
      `Не удалось применить фрагмент: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (!fragment) {
    return {
      yaml: currentYaml,
      parsed: currentParsed,
      doc: parseYaml(currentYaml).doc,
    };
  }

  let merged: unknown;

  if (!patch.targetPath || patch.targetPath.length === 0) {
    // Плоский merge
    merged = deepMerge(
      (currentParsed ?? {}) as Record<string, unknown>,
      (fragment ?? {}) as Record<string, unknown>,
    );
  } else {
    // Точечная вставка по пути
    merged = insertByPath(
      (currentParsed ?? {}) as Record<string, unknown>,
      patch.targetPath,
      fragment,
      patch.mergeStrategy,
    );
  }

  const yaml = stringifyYaml(merged);
  const reparsed = parseYaml(yaml);

  return {
    yaml,
    parsed: reparsed.parsed,
    doc: reparsed.doc,
  };
}

/* ------------------------------------------------------------------ */
/*                      Вставка по пути                                */
/* ------------------------------------------------------------------ */

/**
 * Идёт по пути и вставляет `fragment` в указанное место.
 *
 * Примеры:
 *  - path = ['entities', 'Device', 'attributes']
 *    → находит элемент массива entities с id === 'Device',
 *      берёт его атрибут attributes (массив),
 *      и append'ит элементы fragment'а (если fragment — массив),
 *      либо мержит (если fragment — объект).
 *
 *  - path = ['entities']
 *    → append'ит fragment к массиву entities.
 *
 *  - path = ['entities', 0, 'attributes']
 *    → работает с сущностью по индексу 0.
 */
function insertByPath(
  root: Record<string, unknown>,
  path: (string | number)[],
  fragment: unknown,
  strategy: "merge" | "replace",
): Record<string, unknown> {
  if (path.length === 0) {
    return deepMerge(root, (fragment ?? {}) as Record<string, unknown>);
  }

  // Клонируем корень, чтобы не мутировать оригинал
  const cloned = structuredClone(root);

  // Идём по пути, на каждом шаге спускаясь всё глубже
  // Последний сегмент — это место, куда вставляем.
  const lastSegment = path[path.length - 1];
  const parentPath = path.slice(0, -1);

  const parent = getByPath(cloned, parentPath);
  if (parent === undefined || parent === null) {
    // родителя нет — создаём
    createByPath(cloned, parentPath);
  }

  const parentNode = getByPath(cloned, parentPath) as
    Record<string, unknown> | unknown[] | undefined;

  if (!parentNode) {
    // всё ещё нет — некуда вставлять
    return cloned;
  }

  // Случай 1: родитель — массив, последний сегмент — id элемента (строка)
  if (Array.isArray(parentNode) && typeof lastSegment === "string") {
    // Ищем элемент массива с id === lastSegment
    const target = parentNode.find(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        (item as Record<string, unknown>).id === lastSegment,
    );

    if (target === undefined) {
      // Нет такого элемента — создаём новый
      parentNode.push({
        id: lastSegment,
        ...(isPlainObject(fragment) ? fragment : {}),
      });
      return cloned;
    }

    if (strategy === "replace") {
      Object.assign(target as Record<string, unknown>, fragment);
      return cloned;
    }

    // merge: сливаем fragment в target
    if (isPlainObject(fragment)) {
      deepMergeInto(
        target as Record<string, unknown>,
        fragment as Record<string, unknown>,
      );
    }
    return cloned;
  }

  // Случай 2: родитель — объект, последний сегмент — имя ключа
  if (isPlainObject(parentNode) && typeof lastSegment === "string") {
    const existing = (parentNode as Record<string, unknown>)[lastSegment];

    if (existing === undefined) {
      (parentNode as Record<string, unknown>)[lastSegment] = fragment;
      return cloned;
    }

    // Существующее значение: массив или объект?
    if (Array.isArray(existing) && Array.isArray(fragment)) {
      (parentNode as Record<string, unknown>)[lastSegment] = [
        ...existing,
        ...fragment,
      ];
      return cloned;
    }

    if (Array.isArray(existing) && !Array.isArray(fragment)) {
      // fragment — одиночный элемент, добавляем
      (parentNode as Record<string, unknown>)[lastSegment] = [
        ...existing,
        fragment,
      ];
      return cloned;
    }

    if (isPlainObject(existing) && isPlainObject(fragment)) {
      (parentNode as Record<string, unknown>)[lastSegment] = deepMerge(
        existing,
        fragment,
      );
      return cloned;
    }

    // конфликт типов — побеждает fragment
    (parentNode as Record<string, unknown>)[lastSegment] = fragment;
    return cloned;
  }

  return cloned;
}

/* ------------------------------------------------------------------ */
/*                    Хождение по пути                                */
/* ------------------------------------------------------------------ */

function getByPath(root: unknown, path: (string | number)[]): unknown {
  let node: unknown = root;
  for (const seg of path) {
    if (node === null || node === undefined) return undefined;

    if (Array.isArray(node)) {
      if (typeof seg === "number") {
        node = node[seg];
      } else {
        // ищем по id
        node = node.find(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            (item as Record<string, unknown>).id === seg,
        );
      }
    } else if (typeof node === "object") {
      node = (node as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return node;
}

function createByPath(
  root: Record<string, unknown>,
  path: (string | number)[],
) {
  let node: unknown = root;
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    if (node === null || node === undefined) return;

    if (Array.isArray(node)) {
      if (typeof seg === "number") {
        if (!node[seg]) node[seg] = {};
        node = node[seg];
      } else {
        let item = node.find(
          (it) =>
            typeof it === "object" &&
            it !== null &&
            (it as Record<string, unknown>).id === seg,
        );
        if (!item) {
          item = { id: seg };
          node.push(item);
        }
        node = item;
      }
    } else if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (obj[seg] === undefined) obj[seg] = {};
      node = obj[seg];
    }
  }
}

/* ------------------------------------------------------------------ */
/*                          Утилиты                                    */
/* ------------------------------------------------------------------ */

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = { ...target };

  for (const [key, srcVal] of Object.entries(source)) {
    const tgtVal = result[key];

    if (tgtVal === undefined) {
      result[key] = srcVal;
      continue;
    }

    if (Array.isArray(tgtVal) && Array.isArray(srcVal)) {
      // Сливаем массивы по id: если элемент с таким id уже есть — мержим,
      // иначе добавляем.
      result[key] = mergeArraysById(tgtVal, srcVal);
      continue;
    }

    if (isPlainObject(tgtVal) && isPlainObject(srcVal)) {
      result[key] = deepMerge(tgtVal, srcVal);
      continue;
    }

    // скаляры и конфликты — побеждает source
    result[key] = srcVal;
  }

  return result as T;
}

function deepMergeInto(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  for (const [key, srcVal] of Object.entries(source)) {
    const tgtVal = target[key];

    if (tgtVal === undefined) {
      target[key] = srcVal;
      continue;
    }

    if (Array.isArray(tgtVal) && Array.isArray(srcVal)) {
      target[key] = mergeArraysById(tgtVal, srcVal);
      continue;
    }

    if (isPlainObject(tgtVal) && isPlainObject(srcVal)) {
      deepMergeInto(tgtVal, srcVal);
      continue;
    }

    target[key] = srcVal;
  }
}

/**
 * Сливает два массива: если у элементов есть id и они совпадают — мержим,
 * иначе добавляем как отдельный элемент.
 */
function mergeArraysById(a: unknown[], b: unknown[]): unknown[] {
  const result = [...a];
  for (const bItem of b) {
    if (
      typeof bItem !== "object" ||
      bItem === null ||
      !("id" in (bItem as Record<string, unknown>))
    ) {
      result.push(bItem);
      continue;
    }
    const bId = (bItem as Record<string, unknown>).id;
    const idx = result.findIndex(
      (aItem) =>
        typeof aItem === "object" &&
        aItem !== null &&
        (aItem as Record<string, unknown>).id === bId,
    );
    if (idx >= 0) {
      const aItem = result[idx];
      if (isPlainObject(aItem) && isPlainObject(bItem)) {
        result[idx] = deepMerge(aItem, bItem);
      } else {
        result[idx] = bItem;
      }
    } else {
      result.push(bItem);
    }
  }
  return result;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}
