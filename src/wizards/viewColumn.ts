import { wizardRegistry } from "@/services/wizardRegistry";
import { useDocumentStore } from "@/store/documentStore";

/* ------------------------------------------------------------------ */
/*                       Утилиты                                       */
/* ------------------------------------------------------------------ */

type ListView = {
  id: string;
  label?: string;
  source?: { entity?: string };
  table?: {
    columns?: Array<Record<string, unknown>>;
    selection?: boolean;
  };
};

function readParsed(): Record<string, unknown> {
  const p = useDocumentStore.getState().parsed;
  if (typeof p !== "object" || p === null) return {};
  return p as Record<string, unknown>;
}

function findListView(id: string): ListView | null {
  const parsed = readParsed();
  const views = Array.isArray(parsed.views) ? parsed.views : [];
  for (const v of views) {
    if (typeof v !== "object" || v === null) continue;
    const r = v as Record<string, unknown>;
    if (r.id === id && r.type === "list") {
      return r as unknown as ListView;
    }
  }
  return null;
}

function entityAttributeIds(entityId: string): string[] {
  const parsed = readParsed();
  const entities = Array.isArray(parsed.entities) ? parsed.entities : [];
  for (const e of entities) {
    if (typeof e !== "object" || e === null) continue;
    const r = e as Record<string, unknown>;
    if (r.id === entityId) {
      const attrs = Array.isArray(r.attributes) ? r.attributes : [];
      return attrs
        .map((a) =>
          typeof a === "object" && a !== null
            ? (a as Record<string, unknown>).id
            : null,
        )
        .filter((x): x is string => typeof x === "string");
    }
  }
  return [];
}

// @ts-expect-error expected
function attributeInfo(entityId: string, attrId: string) {
  const parsed = readParsed();
  const entities = Array.isArray(parsed.entities) ? parsed.entities : [];
  for (const e of entities) {
    if (typeof e !== "object" || e === null) continue;
    const r = e as Record<string, unknown>;
    if (r.id !== entityId) continue;
    const attrs = Array.isArray(r.attributes) ? r.attributes : [];
    for (const a of attrs) {
      if (typeof a !== "object" || a === null) continue;
      const ar = a as Record<string, unknown>;
      if (ar.id === attrId) return ar;
    }
  }
  return null;
}

function existingColumnIds(view: ListView): Set<string> {
  const result = new Set<string>();
  if (!view.table || !Array.isArray(view.table.columns)) return result;
  for (const c of view.table.columns) {
    if (typeof c === "object" && c !== null) {
      const id = (c as Record<string, unknown>).id;
      if (typeof id === "string") result.add(id);
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*                       Регистрация                                   */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "view.column",
  title: "Колонка в список",
  description: "Добавляет столбец в существующее списочное представление",
  category: "view",
  command: "view.column",

  steps: [
    {
      id: "main",
      title: "Параметры колонки",
      fields: [
        {
          name: "viewId",
          label: "Списочное представление",
          type: "select",
          dynamicOptions: "listViews",
          required: true,
          help: "Существующее представление типа list",
        },
        {
          name: "columnId",
          label: "ID колонки",
          type: "text",
          required: true,
          placeholder: "deviceStatus",
          help: "Уникальный идентификатор колонки в этом списке",
        },
        {
          name: "sourceType",
          label: "Источник данных",
          type: "select",
          required: true,
          defaultValue: "attribute",
          options: [
            { value: "attribute", label: "Атрибут сущности" },
            { value: "system", label: "Системный атрибут" },
          ],
        },
        {
          name: "attributeId",
          label: "ID атрибута",
          type: "attribute-ref",
          required: true,
          help: "Для системных — createdAt, label, updatedAt и т.п.",
        },
        {
          name: "label",
          label: "Заголовок колонки",
          type: "text",
          placeholder: "Статус",
        },
        {
          name: "control",
          label: "Элемент управления",
          type: "select",
          defaultValue: "",
          options: [
            { value: "", label: "Автоматически" },
            { value: "text", label: "Текст" },
            { value: "text_area", label: "Многострочный текст" },
            { value: "level", label: "Уровень" },
            { value: "tag", label: "Тег" },
            { value: "bool_text", label: "True/False" },
            { value: "link", label: "Ссылка" },
          ],
        },
        {
          name: "trueText",
          label: "Текст для true",
          type: "text",
          placeholder: "Да",
          help: "Только для control: bool_text",
        },
        {
          name: "falseText",
          label: "Текст для false",
          type: "text",
          placeholder: "Нет",
          help: "Только для control: bool_text",
        },
        {
          name: "defaultWidth",
          label: "Ширина по умолчанию (px)",
          type: "number",
          placeholder: "120",
        },
        {
          name: "minWidth",
          label: "Минимальная ширина (px)",
          type: "number",
          placeholder: "60",
        },
        {
          name: "maxWidth",
          label: "Максимальная ширина (px)",
          type: "number",
          placeholder: "300",
        },
        {
          name: "visible",
          label: "Видима по умолчанию",
          type: "boolean",
          defaultValue: true,
        },
      ],

      validate: (values): Record<string, string> | null => {
        const colId = String(values.columnId ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(colId)) {
          return { columnId: "Только латиница, цифры и _" };
        }

        if (!values.viewId) {
          return { viewId: "Выберите список" };
        }

        const view = findListView(String(values.viewId));
        if (!view) {
          return { viewId: "Список не найден" };
        }

        const existing = existingColumnIds(view);
        if (existing.has(colId)) {
          return {
            columnId: `Колонка «${colId}» уже есть в этом списке`,
          };
        }

        if (!values.attributeId) {
          return { attributeId: "Укажите атрибут" };
        }

        // Проверка существования атрибута в сущности источника
        const entityId = view.source?.entity;
        if (entityId) {
          const attrs = entityAttributeIds(entityId);
          const isSystem = [
            "id",
            "label",
            "createdAt",
            "createdBy",
            "updatedAt",
            "updatedBy",
            "organizationId",
            "domainId",
            "entityId",
            "entityName",
            "tenantId",
            "version",
          ].includes(String(values.attributeId));

          if (!isSystem && !attrs.includes(String(values.attributeId))) {
            return {
              attributeId: `Атрибут «${values.attributeId}» не найден в сущности «${entityId}»`,
            };
          }
        }

        const minW = values.minWidth ? Number(values.minWidth) : null;
        const maxW = values.maxWidth ? Number(values.maxWidth) : null;
        const defW = values.defaultWidth ? Number(values.defaultWidth) : null;

        if (minW !== null && maxW !== null && minW > maxW) {
          return { minWidth: "Минимум не может быть больше максимума" };
        }
        if (defW !== null && minW !== null && defW < minW) {
          return { defaultWidth: "Ширина по умолчанию меньше минимальной" };
        }
        if (defW !== null && maxW !== null && defW > maxW) {
          return { defaultWidth: "Ширина по умолчанию больше максимальной" };
        }

        return null;
      },
    },
  ],

  generate: (values) => {
    const viewId = String(values.viewId ?? "").trim();
    const columnId = String(values.columnId ?? "").trim();
    const attributeId = String(values.attributeId ?? "").trim();
    const label = String(values.label ?? "").trim();
    const control = String(values.control ?? "").trim();
    const trueText = String(values.trueText ?? "").trim();
    const falseText = String(values.falseText ?? "").trim();

    const defW = values.defaultWidth ? Number(values.defaultWidth) : null;
    const minW = values.minWidth ? Number(values.minWidth) : null;
    const maxW = values.maxWidth ? Number(values.maxWidth) : null;
    const visible = Boolean(values.visible ?? true);

    const lines: string[] = [];
    lines.push("views:");
    lines.push(`  - id: ${viewId}`);
    lines.push(`    table:`);
    lines.push(`      columns:`);
    lines.push(`        - id: ${columnId}`);
    lines.push(`          attribute: ${attributeId}`);
    if (label) {
      lines.push(`          label: "${label.replace(/"/g, '\\"')}"`);
    }

    // control
    if (control) {
      lines.push(`          control:`);
      lines.push(`            type: ${control}`);
      if (control === "bool_text") {
        if (trueText) lines.push(`            trueText: "${trueText}"`);
        if (falseText) lines.push(`            falseText: "${falseText}"`);
      }
    }

    // layout
    if (!visible || defW !== null || minW !== null || maxW !== null) {
      lines.push(`          layout:`);
      lines.push(`            visible: ${visible}`);
      if (defW !== null || minW !== null || maxW !== null) {
        lines.push(`            width:`);
        if (defW !== null) lines.push(`              default: ${defW}`);
        if (minW !== null) lines.push(`              min: ${minW}`);
        if (maxW !== null) lines.push(`              max: ${maxW}`);
      }
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Колонка «${columnId}» в списке «${viewId}»`,
    };
  },
});
