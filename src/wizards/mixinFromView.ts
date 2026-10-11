import { wizardRegistry } from "@/services/wizardRegistry";
import { useDocumentStore } from "@/store/documentStore";

/* ------------------------------------------------------------------ */
/*                       Утилиты                                       */
/* ------------------------------------------------------------------ */

function readParsed(): Record<string, unknown> {
  const p = useDocumentStore.getState().parsed;
  if (typeof p !== "object" || p === null) return {};
  return p as Record<string, unknown>;
}

function findEntityView(id: string): Record<string, unknown> | null {
  const parsed = readParsed();
  const views = Array.isArray(parsed.views) ? parsed.views : [];
  for (const v of views) {
    if (typeof v === "object" && v !== null) {
      const view = v as Record<string, unknown>;
      if (view.id === id && view.type === "entity") return view;
    }
  }
  return null;
}

/**
 * Собирает компоненты, которые можно встроить как примесь.
 */
type ComponentItem = {
  kind: "tab" | "block" | "form" | "panel" | "list" | "widget";
  id: string;
  label?: string;
};

function collectComponents(view: Record<string, unknown>): ComponentItem[] {
  const result: ComponentItem[] = [];

  // inner views (panel, modal, page)
  const innerViews = Array.isArray(view.views) ? view.views : [];
  for (const iv of innerViews) {
    if (typeof iv !== "object" || iv === null) continue;
    const r = iv as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : null;
    if (!id) continue;
    const type = String(r.type ?? "");
    if (type === "panel") {
      result.push({ kind: "panel", id, label: labelOf(r) });
    } else if (type === "modal") {
      result.push({ kind: "form", id, label: labelOf(r) });
    }
  }

  // groups (tab, form, block)
  const groups = Array.isArray(view.groups) ? view.groups : [];
  for (const g of groups) {
    if (typeof g !== "object" || g === null) continue;
    const r = g as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : null;
    if (!id) continue;
    const type = String(r.type ?? "");
    if (type === "tab") result.push({ kind: "tab", id, label: labelOf(r) });
    else if (type === "form")
      result.push({ kind: "form", id, label: labelOf(r) });
    else if (type === "block")
      result.push({ kind: "block", id, label: labelOf(r) });
  }

  // widgets (action, card)
  const widgets = Array.isArray(view.widgets) ? view.widgets : [];
  for (const w of widgets) {
    if (typeof w !== "object" || w === null) continue;
    const r = w as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : null;
    if (!id) continue;
    const type = String(r.type ?? "");
    if (type === "action") {
      result.push({ kind: "widget", id, label: labelOf(r) });
    }
  }

  return result;
}

function labelOf(o: Record<string, unknown>): string | undefined {
  if (typeof o.label === "string") return o.label;
  if (typeof o.name === "string") return o.name;
  return undefined;
}

/* ------------------------------------------------------------------ */
/*                       Регистрация                                   */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "mixin.fromView",
  title: "Создать миксин из представления",
  description:
    "Автоматически создаёт примесь, копируя компоненты существующей entity view",
  category: "scenario",
  command: "mixin.fromView",

  steps: [
    {
      id: "main",
      title: "Параметры",
      fields: [
        {
          name: "id",
          label: "ID примеси",
          type: "text",
          required: true,
          placeholder: "mixin_from_source",
          help: "Уникальный идентификатор примеси",
        },
        {
          name: "name",
          label: "Название примеси",
          type: "text",
        },
        {
          name: "fromView",
          label: "Исходная entity view",
          type: "select",
          dynamicOptions: "entityViews",
          required: true,
          help: "Из какой view заимствуются компоненты",
        },
        {
          name: "targetEntity",
          label: "Целевая сущность",
          type: "entity-ref",
          required: true,
          help: "В какую сущность встраивается примесь",
        },
        {
          name: "targetView",
          label: "Целевая entity view",
          type: "select",
          dynamicOptions: "entityViews",
          required: true,
          help: "В какую view встраиваются компоненты",
        },
        {
          name: "weight",
          label: "Приоритет",
          type: "number",
          placeholder: "100",
        },
        {
          name: "useForChild",
          label: "Применять к дочерним сущностям",
          type: "boolean",
          defaultValue: true,
        },
        {
          name: "components",
          label: "Какие компоненты встроить",
          type: "multiselect",
          required: true,
          help: "Заполнится после выбора fromView",
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры и _" };
        }
        if (!values.fromView) return { fromView: "Выберите исходную view" };
        if (!values.targetView) return { targetView: "Выберите целевую view" };
        if (!values.targetEntity) {
          return { targetEntity: "Выберите целевую сущность" };
        }

        const comps = Array.isArray(values.components) ? values.components : [];
        if (comps.length === 0) {
          return { components: "Выберите хотя бы один компонент" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const name = String(values.name ?? "").trim();
    const fromView = String(values.fromView ?? "").trim();
    const targetEntity = String(values.targetEntity ?? "").trim();
    const targetView = String(values.targetView ?? "").trim();
    const weightRaw = values.weight;
    const useForChild = Boolean(values.useForChild);
    const components = Array.isArray(values.components)
      ? (values.components as string[])
      : [];

    const source = findEntityView(fromView);
    if (!source) {
      return {
        yaml: `# Исходная view «${fromView}» не найдена`,
        mergeStrategy: "merge",
        summary: "Ошибка: view не найдена",
      };
    }

    const allComponents = collectComponents(source);
    const byId = new Map(allComponents.map((c) => [c.id, c]));

    const lines: string[] = [];
    lines.push("mixins:");
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    lines.push(`    type: view`);
    lines.push(`    entity: ${targetEntity}`);
    if (weightRaw !== undefined && weightRaw !== "") {
      lines.push(`    weight: ${Number(weightRaw)}`);
    }
    lines.push(`    useForChild: ${useForChild}`);
    lines.push(`    views:`);

    // Для каждого выбранного компонента создаём запись
    for (const compId of components) {
      const comp = byId.get(compId);
      if (!comp) continue;

      // viewId примеси: mixin_<compId>
      const viewRecId = `mixin_${compId}`;

      // viewType зависит от kind
      let viewType: "panel" | "tab" | "form" | "list" | "page";
      switch (comp.kind) {
        case "panel":
          viewType = "panel";
          break;
        case "tab":
          viewType = "tab";
          break;
        case "form":
          viewType = "form";
          break;
        case "block":
          viewType = "tab";
          break;
        case "list":
          viewType = "list";
          break;
        case "widget":
          viewType = "tab";
          break;
        default:
          viewType = "tab";
      }

      lines.push(`      - id: ${viewRecId}`);
      lines.push(`        type: ${viewType}`);
      lines.push(`        fromView: ${fromView}`);
      lines.push(`        to:`);
      lines.push(`          ${viewType}: ${targetView}`);
      lines.push(`        change:`);
      lines.push(`          add:`);

      if (viewType === "tab") {
        lines.push(`            components:`);
        lines.push(
          `              - ${comp.kind === "widget" ? "widget" : "block"}: ${compId}`,
        );
        lines.push(`            position:`);
        lines.push(`              type: end`);
      } else if (viewType === "panel") {
        lines.push(`            tabs:`);
        lines.push(`              tabs:`);
        lines.push(`                - tab: ${compId}`);
        lines.push(`              position:`);
        lines.push(`                type: end`);
      } else if (viewType === "form") {
        lines.push(`            form: ${compId}`);
        lines.push(`            position:`);
        lines.push(`              type: end`);
      } else if (viewType === "list") {
        lines.push(`            list: ${compId}`);
        lines.push(`            position:`);
        lines.push(`              type: end`);
      }
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Примесь «${id}»: ${components.length} компонентов из «${fromView}»`,
    };
  },
});
