import type { ContextSnippet } from "./contextSnippets";
import { getContextSnippets } from "./contextSnippets";


export type SnippetCatalogItem = ContextSnippet & {
  category: string;
};

/**
 * Возвращает все сниппеты, доступные в текущем контексте,
 * плюс общие сниппеты верхнего уровня.
 */
export function getAllSnippets(
  cursorPath: (string | number)[],
  parsed: unknown,
): SnippetCatalogItem[] {
  const contextual = getContextSnippets(cursorPath, parsed);

  // добавляем «верхнеуровневые» сниппеты всегда
  const topLevel = getContextSnippets([], parsed);

  const all = [...contextual, ...topLevel];

  // убираем дубликаты по id
  const seen = new Set<string>();
  const unique: ContextSnippet[] = [];
  for (const s of all) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    unique.push(s);
  }

  return unique.map((s) => ({
    ...s,
    category: inferCategory(s.id),
  }));
}

function inferCategory(id: string): string {
  if (id.startsWith("entity.")) return "Сущность";
  if (id.startsWith("attr.")) return "Атрибут";
  if (id.startsWith("linkage.")) return "Связь";
  if (id.startsWith("view.")) return "Представление";
  if (id.startsWith("action.")) return "Действие";
  if (id.startsWith("menu.")) return "Меню";
  if (id.startsWith("rule.")) return "Правило данных";
  if (id.startsWith("add.")) return "Общее";
  return "Прочее";
}
