import { wizardRegistry } from "@/services/wizardRegistry";
import { useDocumentStore } from "@/store/documentStore";
import { buildMixinTargetsIndex } from "@/domain/mixinTargets";

type ViewTypeKey = "panel" | "tab" | "form" | "list" | "page";
type Mode = "add" | "delete" | "replace";

const VIEW_TYPES: Array<{ value: ViewTypeKey; label: string }> = [
  { value: "panel", label: "Панель (panel)" },
  { value: "tab", label: "Вкладка (tab)" },
  { value: "form", label: "Форма (form)" },
  { value: "list", label: "Список (list)" },
  { value: "page", label: "Полноэкранная карточка (page)" },
];

const MODES: Array<{ value: Mode; label: string }> = [
  { value: "add", label: "Добавить (change.add)" },
  { value: "delete", label: "Удалить (change.delete)" },
  { value: "replace", label: "Заменить (replace)" },
];

// @ts-expect-error expected
const PAGE_CONTENT_KINDS: Array<{ value: string; label: string }> = [
  { value: "block", label: "Блок (block)" },
  { value: "tabs", label: "Вкладки (tabs)" },
  { value: "actionPanel", label: "Панель действий (actionPanel)" },
];

function readParsed(): Record<string, unknown> {
  const p = useDocumentStore.getState().parsed;
  if (typeof p !== "object" || p === null) return {};
  return p as Record<string, unknown>;
}

function findMixin(id: string): Record<string, unknown> | null {
  const parsed = readParsed();
  const arr = Array.isArray(parsed.mixins) ? parsed.mixins : [];
  for (const m of arr) {
    if (typeof m === "object" && m !== null) {
      const mixin = m as Record<string, unknown>;
      if (mixin.id === id) return mixin;
    }
  }
  return null;
}

function existingViewIds(mixinId: string): Set<string> {
  const result = new Set<string>();
  const mixin = findMixin(mixinId);
  if (!mixin) return result;

  const views = Array.isArray(mixin.views) ? mixin.views : [];
  for (const v of views) {
    if (typeof v === "object" && v !== null) {
      const id = (v as Record<string, unknown>).id;
      if (typeof id === "string") result.add(id);
    }
  }
  return result;
}

wizardRegistry.register({
  id: "mixin.linkage.views",
  title: "Примесь → view (add / delete / replace)",
  description:
    "Добавляет, удаляет или заменяет компонент интерфейса в mixins[].views[]",
  category: "view",
  command: "mixin.linkage.views",

  steps: [
    {
      id: "main",
      title: "Параметры",
      fields: [
        {
          name: "components",
          label: "Какие компоненты встроить",
          type: "multiselect",
          dynamicOptions: "entityViewComponents",
          required: true,
        },
        {
          name: "mixinId",
          label: "Примесь",
          type: "select",
          dynamicOptions: "existingMixins",
          required: true,
        },
        {
          name: "viewId",
          label: "ID записи примеси",
          type: "text",
          placeholder: "mixin_view_panel",
          required: true,
          help: "Уникальный ID внутри mixins[].views[]",
        },
        {
          name: "viewType",
          label: "Тип встраиваемого представления",
          type: "select",
          required: true,
          defaultValue: "panel",
          options: VIEW_TYPES,
        },
        {
          name: "targetId",
          label: "ID целевой view",
          type: "select",
          dynamicOptions: "mixinTargets",
          required: true,
          help: "Существующий компонент верхнего уровня",
        },
        {
          name: "mode",
          label: "Режим",
          type: "select",
          required: true,
          defaultValue: "add",
          options: MODES,
          help: "add — добавить компонент, delete — удалить, replace — заменить",
        },
      ],
      validate: (values): Record<string, string> | null => {
        if (!values.mixinId) return { mixinId: "Выберите примесь" };

        const viewId = String(values.viewId ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(viewId)) {
          return { viewId: "Только латиница, цифры и _" };
        }

        const mixinId = String(values.mixinId ?? "").trim();
        const existing = existingViewIds(mixinId);
        if (values.mode === "add" && existing.has(viewId)) {
          return { viewId: `ID «${viewId}» уже используется в этой примеси` };
        }

        if (!values.targetId) {
          return { targetId: "Выберите целевую view" };
        }

        // Проверка существования targetId
        const index = buildMixinTargetsIndex(readParsed());
        if (!index.has(String(values.targetId))) {
          return {
            targetId: `Компонент «${values.targetId}» не найден в документе`,
          };
        }

        return null;
      },
    },
    {
      id: "content",
      title: "Компонент",
      description:
        "Заполняется для режимов add и replace. Для delete укажите только то, что удаляете.",
      fields: [
        {
          name: "contentKind",
          label: "Тип встраиваемого компонента",
          type: "select",
          required: true,
          defaultValue: "block",
          options: [
            { value: "block", label: "Блок (block)" },
            { value: "tab", label: "Вкладка (tab)" },
            { value: "form", label: "Форма (form)" },
            { value: "tabs", label: "Группа вкладок (tabs)" },
            { value: "list", label: "Список (list)" },
            { value: "actionPanel", label: "Виджет действия (actionPanel)" },
          ],
        },
        {
          name: "contentId",
          label: "ID компонента",
          type: "select",
          dynamicOptions: "mixinContents",
          required: true,
        },
        {
          name: "positionType",
          label: "Позиция",
          type: "select",
          defaultValue: "end",
          options: [
            { value: "begin", label: "В начало" },
            { value: "after", label: "После указанного" },
            { value: "end", label: "В конец" },
          ],
          help: "Используется только в режиме add",
        },
        {
          name: "afterId",
          label: "ID элемента для позиции after",
          type: "text",
          placeholder: "tabs_existing / blocks_existing",
          help: "Обязательно, если position = after и mode = add",
        },
      ],
      validate: (values): Record<string, string> | null => {
        const mode = String(values.mode ?? "add");

        if (!values.contentId) {
          return { contentId: "Выберите компонент" };
        }

        // Проверка существования contentId
        const index = buildMixinTargetsIndex(readParsed());
        if (!index.has(String(values.contentId))) {
          return {
            contentId: `Компонент «${values.contentId}» не найден`,
          };
        }

        if (mode === "add" && values.positionType === "after") {
          if (!String(values.afterId ?? "").trim()) {
            return { afterId: "Для позиции after укажите ID" };
          }
        }

        return null;
      },
    },
  ],

  generate: (values) => {
    const mixinId = String(values.mixinId ?? "").trim();
    const viewId = String(values.viewId ?? "").trim();
    const viewType = String(values.viewType ?? "panel") as ViewTypeKey;
    const targetId = String(values.targetId ?? "").trim();
    const mode = String(values.mode ?? "add") as Mode;
    const contentKind = String(values.contentKind ?? "block").trim();
    const contentId = String(values.contentId ?? "").trim();
    const positionType = String(values.positionType ?? "end");
    const afterId = String(values.afterId ?? "").trim();

    const lines: string[] = [];
    lines.push("mixins:");
    lines.push(`  - id: ${mixinId}`);
    lines.push(`    views:`);
    lines.push(`      - id: ${viewId}`);
    lines.push(`        type: ${viewType}`);
    lines.push(`        to:`);
    lines.push(`          ${viewType}: ${targetId}`);

    if (mode === "replace") {
      // replace — компоненты целевой view заменяются
      lines.push(`        replace:`);
      if (viewType === "page") {
        lines.push(`          ${contentKind}: ${contentId}`);
      } else if (viewType === "list") {
        lines.push(`          list: ${contentId}`);
      } else if (viewType === "form") {
        lines.push(`          form: ${contentId}`);
      } else if (viewType === "panel") {
        lines.push(`          tabs:`);
        lines.push(`            - tab: ${contentId}`);
      } else if (viewType === "tab") {
        lines.push(`          components:`);
        lines.push(`            - ${contentKind}: ${contentId}`);
      }
    } else if (mode === "delete") {
      // delete — удаляем из целевой view
      lines.push(`        change:`);
      lines.push(`          delete:`);
      if (viewType === "page") {
        if (contentKind === "tabs") {
          lines.push(`            tabs:`);
          lines.push(`              - tab: ${contentId}`);
        } else if (contentKind === "actionPanel") {
          lines.push(`            actionPanel:`);
          lines.push(`              - widget: ${contentId}`);
        } else {
          lines.push(`            ${contentKind}: ${contentId}`);
        }
      } else if (viewType === "panel") {
        lines.push(`            tabs:`);
        lines.push(`              - tab: ${contentId}`);
      } else if (viewType === "tab") {
        lines.push(`            components:`);
        lines.push(`              - ${contentKind}: ${contentId}`);
      } else if (viewType === "form") {
        lines.push(`            components:`);
        lines.push(`              - ${contentKind}: ${contentId}`);
      } else if (viewType === "list") {
        if (contentKind === "actionPanel") {
          lines.push(`            actionPanel:`);
          lines.push(`              - widget: ${contentId}`);
        } else {
          lines.push(`            columns:`);
          lines.push(`              - column: ${contentId}`);
        }
      }
    } else {
      // add
      lines.push(`        change:`);
      lines.push(`          add:`);

      if (viewType === "panel") {
        lines.push(`            tabs:`);
        lines.push(`              tabs:`);
        lines.push(`                - tab: ${contentId}`);
        lines.push(`              position:`);
        lines.push(`                type: ${positionType}`);
        if (positionType === "after" && afterId) {
          lines.push(`                after:`);
          lines.push(`                  tab: ${afterId}`);
        }
      } else if (viewType === "tab") {
        lines.push(`            components:`);
        lines.push(`              - ${contentKind}: ${contentId}`);
        lines.push(`            position:`);
        lines.push(`              type: ${positionType}`);
        if (positionType === "after" && afterId) {
          lines.push(`              after:`);
          lines.push(`                ${contentKind}: ${afterId}`);
        }
      } else if (viewType === "form") {
        lines.push(`            form: ${contentId}`);
        lines.push(`            position:`);
        lines.push(`              type: ${positionType}`);
        if (positionType === "after" && afterId) {
          lines.push(`              after:`);
          lines.push(`                form: ${afterId}`);
        }
      } else if (viewType === "list") {
        lines.push(`            list: ${contentId}`);
        lines.push(`            position:`);
        lines.push(`              type: ${positionType}`);
        if (positionType === "after" && afterId) {
          lines.push(`              after:`);
          lines.push(`                column: ${afterId}`);
        }
      } else if (viewType === "page") {
        // Для page — выбор block / tabs / actionPanel
        if (contentKind === "tabs") {
          lines.push(`            tabs:`);
          lines.push(`              tabs:`);
          lines.push(`                - tab: ${contentId}`);
          lines.push(`              position:`);
          lines.push(`                type: ${positionType}`);
          if (positionType === "after" && afterId) {
            lines.push(`                after:`);
            lines.push(`                  tab: ${afterId}`);
          }
        } else if (contentKind === "actionPanel") {
          lines.push(`            actionPanel:`);
          lines.push(`              actionPanel:`);
          lines.push(`                - widget: ${contentId}`);
          lines.push(`              position:`);
          lines.push(`                type: ${positionType}`);
          if (positionType === "after" && afterId) {
            lines.push(`                after:`);
            lines.push(`                  widget: ${afterId}`);
          }
        } else {
          // block
          lines.push(`            block: ${contentId}`);
        }
      }
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Примесь «${mixinId}»: ${mode} ${viewType} «${contentId}» в «${targetId}»`,
    };
  },
});
