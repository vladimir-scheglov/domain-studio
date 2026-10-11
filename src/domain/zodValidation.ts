import type { ZodIssue } from "zod";
import { DomainZodSchema } from "./domain.zod";
import { findRangeByPath } from "./findRange";
import type { Document } from "yaml";

export type ZodDiagnostic = {
  severity: "error" | "warning";
  message: string;
  path: (string | number)[];
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  code?: string;
};

/**
 * Прогоняет Zod-схему домена.
 * Возвращает список диагностик, привязанных к позициям в YAML.
 */
export function runZodValidation(
  parsed: unknown,
  doc: Document.Parsed | null,
): ZodDiagnostic[] {
  if (!parsed || typeof parsed !== "object") return [];

  const result = DomainZodSchema.safeParse(parsed);
  if (result.success) return [];

  // Множество issues, которые относятся к значению, а не к ключу.
  // Для этих issues маркер ставится на valueNode, а не на keyNode.
  const valueIssues = new Set<string>([
    "invalid_literal",
    "invalid_enum_value",
    "too_small",
    "too_big",
  ]);

  const diagnostics: ZodDiagnostic[] = [];

  for (const issue of result.error.issues) {
    const path = normalizePath(issue.path);
    const mode = valueIssues.has(issue.code) ? "value" : "key";

    // 1) пробуем точную позицию
    let range = doc ? findRangeByPath(doc, path, mode) : null;

    // 2) если не нашли — идём по предкам вверх, пока не найдём
    if (!range && doc) {
      for (let i = path.length - 1; i > 0; i--) {
        const parentPath = path.slice(0, i);
        const parentRange = findRangeByPath(doc, parentPath, "key");
        if (parentRange) {
          range = parentRange;
          break;
        }
      }
    }

    diagnostics.push({
      severity: "error",
      message: formatIssue(issue),
      path,
      code: inferZodCode(issue),
      startLine: range?.startLine ?? 1,
      startColumn: range?.startColumn ?? 1,
      endLine: range?.endLine ?? 1,
      endColumn: range?.endColumn ?? 1,
    });
  }

  return diagnostics;
}

/* ------------------------------------------------------------------ */
/*                          Утилиты                                    */
/* ------------------------------------------------------------------ */

function normalizePath(path: (string | number)[]): (string | number)[] {
  // Zod возвращает путь в виде массива с числами и строками.
  // Совместимо с findRangeByPath.
  return path;
}

function formatIssue(issue: ZodIssue): string {
  // Zod возвращает разные типы issues. Собираем человеческое сообщение.

  // Специальный случай: missing required field
  if (issue.code === "invalid_type" && issue.received === "undefined") {
    const field = String(issue.path[issue.path.length - 1] ?? "");

    // Специальные подсказки для неправильного раздела
    if (issue.path[0] === "actions" && field === "type") {
      return `Поле «type» не задано. Возможно, это правило данных — перенесите блок в dataRules`;
    }
    if (issue.path[0] === "dataRules" && field === "target") {
      return `Поле «target» не задано. Возможно, это действие — перенесите блок в actions`;
    }

    return `Обязательное поле «${field}» не задано`;
  }

  // Специальный случай: wrong enum
  if (issue.code === "invalid_enum_value") {
    const field = issue.path[issue.path.length - 1];
    const allowed = (issue.options as string[]).join(", ");
    return `Поле «${String(field)}»: ожидается одно из (${allowed}), получено «${
      issue.received
    }»`;
  }

  // Специальный случай: invalid literal
  if (issue.code === "invalid_literal") {
    const field = issue.path[issue.path.length - 1];
    return `Поле «${String(field)}» должно быть «${String(issue.expected)}»`;
  }

  // Специальный случай: too_small / too_big
  if (issue.code === "too_small") {
    const field = issue.path[issue.path.length - 1];
    return `Поле «${String(field)}»: слишком маленькое значение (${
      issue.minimum
    })`;
  }
  if (issue.code === "too_big") {
    const field = issue.path[issue.path.length - 1];
    return `Поле «${String(field)}»: слишком большое значение (${
      issue.maximum
    })`;
  }

  // Общий случай
  const field = issue.path.length ? `«${issue.path.join(" › ")}»: ` : "";
  return field + issue.message;
}

function inferZodCode(issue: ZodIssue): string {
  switch (issue.code) {
    case "invalid_type": {
      const field = String(issue.path[issue.path.length - 1] ?? "");
      if (issue.received === "undefined") {
        return `zod:required|${field}`;
      }
      return `zod:invalid_type|${field}`;
    }
    case "invalid_enum_value": {
      const field = String(issue.path[issue.path.length - 1] ?? "");
      const opts = (issue.options as string[]).join(",");
      return `zod:invalid_enum|${field}|${opts}`;
    }
    case "invalid_literal": {
      const field = String(issue.path[issue.path.length - 1] ?? "");
      return `zod:invalid_literal|${field}|${String(issue.expected)}`;
    }
    case "too_small":
    case "too_big":
      return `zod:${issue.code}`;
    case "custom": {
      const msg = issue.message;
      if (msg.startsWith("Дубликат id")) {
        const m = msg.match(/«([^»]+)»/);
        return `zod:duplicate_id|${m?.[1] ?? "id"}`;
      }
      if (msg.includes("зарезервирован системой")) {
        const m = msg.match(/«([^»]+)»/);
        return `zod:system_id|${m?.[1] ?? "attr"}`;
      }
      if (msg.includes("не задано поле by")) {
        const m = msg.match(/«([^»]+)»/);
        return `zod:missing_by|${m?.[1] ?? ""}`;
      }
      return `zod:custom`;
    }
    default:
      return `zod:${String(issue.code)}`;
  }
}
