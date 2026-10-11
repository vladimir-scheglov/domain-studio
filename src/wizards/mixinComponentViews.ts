import { wizardRegistry } from "@/services/wizardRegistry";
import { useDocumentStore } from "@/store/documentStore";
import { buildMixinTargetsIndex } from "@/domain/mixinTargets";

type ComponentType = "form" | "tab" | "panel" | "list" | "page";
type Mode = "add" | "delete" | "replace";

const COMPONENT_TYPES: Array<{ value: ComponentType; label: string }> = [
  { value: "form", label: "Форма (form)" },
  { value: "tab", label: "Вкладка (tab)" },
  { value: "panel", label: "Панель (panel)" },
  { value: "list", label: "Список (list)" },
  { value: "page", label: "Полноэкранная карточка (page)" },
];

function readParsed(): Record<string, unknown> {
  const p = useDocumentStore.getState().parsed;
  if (typeof p !== "object" || p === null) return {};
  return p as Record<string, unknown>;
}

// @ts-expect-error expected
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

wizardRegistry.register({
  id: "mixin.view.views",
  title: "Примесь компонентов интерфейса",
  description:
    "Создаёт/обновляет примесь типа view — встраивает компоненты из другого представления",
  category: "view",
  command: "mixin.view.views",

  steps: [
    {
      id: "main",
      title: "Основные параметры",
      fields: [
        {
          name: "id",
          label: "ID примеси",
          type: "text",
          required: true,
          placeholder: "view_mixin",
          help: "Идентификатор примеси в разделе mixins",
        },
        {
          name: "name",
          label: "Название примеси",
          type: "text",
          placeholder: "Примесь интерфейса",
        },
        {
          name: "entity",
          label: "Целевая сущность",
          type: "entity-ref",
          required: true,
          help: "Сущность, в представления которой встраивается примесь",
        },
        {
          name: "weight",
          label: "Приоритет (вес)",
          type: "number",
          placeholder: "100",
          help: "Меньше — выше приоритет",
        },
        {
          name: "useForChild",
          label: "Применять к дочерним сущностям",
          type: "boolean",
          defaultValue: true,
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры и _" };
        }
        if (!values.entity) {
          return { entity: "Выберите целевую сущность" };
        }
        return null;
      },
    },
    {
      id: "component",
      title: "Компонент",
      description: "Что встраивается и куда",
      fields: [
        {
          name: "componentType",
          label: "Тип компонента",
          type: "select",
          required: true,
          defaultValue: "tab",
          options: COMPONENT_TYPES,
        },
        {
          name: "componentId",
          label: "ID записи примеси",
          type: "text",
          required: true,
          placeholder: "view_mixin_tab",
          help: "Уникальный ID внутри mixins[].views[]",
        },
        {
          name: "fromView",
          label: "Источник (fromView)",
          type: "select",
          dynamicOptions: "mixinTargets",
          required: true,
          help: "Представление, из которого подмешиваются компоненты",
        },
        {
          name: "targetId",
          label: "Целевой компонент",
          type: "select",
          dynamicOptions: "mixinTargets",
          required: true,
          help: "Компонент, в который встраиваемся",
        },
        {
          name: "mode",
          label: "Режим",
          type: "select",
          required: true,
          defaultValue: "add",
          options: [
            { value: "add", label: "Добавить" },
            { value: "delete", label: "Удалить" },
            { value: "replace", label: "Заменить" },
          ],
        },
        {
          name: "contentKind",
          label: "Тип встраиваемого компонента",
          type: "select",
          defaultValue: "block",
          options: [
            { value: "block", label: "Блок" },
            { value: "tab", label: "Вкладка" },
            { value: "form", label: "Форма" },
            { value: "tabs", label: "Группа вкладок" },
            { value: "actionPanel", label: "Виджет действия" },
          ],
        },
        {
          name: "contentId",
          label: "ID встраиваемого компонента",
          type: "select",
          dynamicOptions: "mixinContents",
          required: true,
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.componentId ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { componentId: "Только латиница, цифры и _" };
        }
        if (!values.fromView) {
          return { fromView: "Выберите источник" };
        }
        if (!values.targetId) {
          return { targetId: "Выберите целевой компонент" };
        }
        if (!values.contentId) {
          return { contentId: "Выберите встраиваемый компонент" };
        }

        // Проверка существования targetId, fromView, contentId
        const index = buildMixinTargetsIndex(readParsed());

        if (!index.has(String(values.fromView))) {
          return { fromView: `Компонент «${values.fromView}» не найден` };
        }
        if (!index.has(String(values.targetId))) {
          return { targetId: `Компонент «${values.targetId}» не найден` };
        }
        if (!index.has(String(values.contentId))) {
          return { contentId: `Компонент «${values.contentId}» не найден` };
        }
        
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const name = String(values.name ?? "").trim();
    const entityId = String(values.entity ?? "").trim();
    const weightRaw = values.weight;
    const useForChild = Boolean(values.useForChild);
    const componentType = String(
      values.componentType ?? "tab",
    ) as ComponentType;
    const componentId = String(values.componentId ?? "").trim();
    const fromView = String(values.fromView ?? "").trim();
    const targetId = String(values.targetId ?? "").trim();
    const mode = String(values.mode ?? "add") as Mode;
    const contentKind = String(values.contentKind ?? "block").trim();
    const contentId = String(values.contentId ?? "").trim();

    const lines: string[] = [];
    lines.push("mixins:");
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    lines.push(`    type: view`);
    lines.push(`    entity: ${entityId}`);
    if (weightRaw !== undefined && weightRaw !== "") {
      lines.push(`    weight: ${Number(weightRaw)}`);
    }
    lines.push(`    useForChild: ${useForChild}`);
    lines.push(`    views:`);
    lines.push(`      - id: ${componentId}`);
    lines.push(`        type: ${componentType}`);
    lines.push(`        fromView: ${fromView}`);

    // to: { form | tab | panel | list | page: targetId }
    lines.push(`        to:`);
    lines.push(`          ${componentType}: ${targetId}`);

    if (mode === "replace") {
      lines.push(`        replace:`);
      if (componentType === "form") {
        lines.push(`          form: ${contentId}`);
      } else if (componentType === "tab") {
        lines.push(`          components:`);
        lines.push(`            - ${contentKind}: ${contentId}`);
      } else if (componentType === "panel") {
        lines.push(`          tabs:`);
        lines.push(`            - tab: ${contentId}`);
      } else if (componentType === "list") {
        lines.push(`          list: ${contentId}`);
      } else if (componentType === "page") {
        lines.push(`          ${contentKind}: ${contentId}`);
      }
    } else {
      lines.push(`        change:`);
      lines.push(`          ${mode === "delete" ? "delete" : "add"}:`);

      if (componentType === "form") {
        if (mode === "add") {
          lines.push(`            form: ${contentId}`);
          lines.push(`            position:`);
          lines.push(`              type: end`);
        } else {
          lines.push(`            components:`);
          lines.push(`              - ${contentKind}: ${contentId}`);
        }
      } else if (componentType === "tab") {
        lines.push(`            components:`);
        lines.push(`              - ${contentKind}: ${contentId}`);
      } else if (componentType === "panel") {
        lines.push(`            tabs:`);
        lines.push(`              tabs:`);
        lines.push(`                - tab: ${contentId}`);
        if (mode === "add") {
          lines.push(`              position:`);
          lines.push(`                type: end`);
        }
      } else if (componentType === "list") {
        lines.push(`            list: ${contentId}`);
      } else if (componentType === "page") {
        lines.push(`            ${contentKind}: ${contentId}`);
      }
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Примесь компонентов «${componentId}» (${componentType}, ${mode})`,
    };
  },
});
