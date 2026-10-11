/**
 * Собирает индексированную карту всех адресуемых компонентов домена.
 * Используется для валидации миксинов и для dynamicOptions.
 */
export type ComponentKind =
  | "entity_view"
  | "panel"
  | "modal"
  | "page"
  | "tab"
  | "block"
  | "form"
  | "tabs"
  | "resizable_block_pair"
  | "list"
  | "tabs_list"
  | "dashboard"
  | "dashboard_tree"
  | "tree"
  | "widget"
  | "action";

export type ComponentRef = {
  id: string;
  kind: ComponentKind;
  /** ID родителя (для вложенных — панель/группа) */
  parentId?: string;
  /** Название из label / name, если есть */
  label?: string;
};

export type MixinTargetsIndex = {
  byId: Map<string, ComponentRef>;
  byKind: Record<ComponentKind, ComponentRef[]>;
  has: (id: string) => boolean;
  get: (id: string) => ComponentRef | undefined;
  find: (kind: ComponentKind) => ComponentRef[];
};

export function buildMixinTargetsIndex(parsed: unknown): MixinTargetsIndex {
  const byId = new Map<string, ComponentRef>();
  const byKind = {
    entity_view: [] as ComponentRef[],
    panel: [] as ComponentRef[],
    modal: [] as ComponentRef[],
    page: [] as ComponentRef[],
    tab: [] as ComponentRef[],
    block: [] as ComponentRef[],
    form: [] as ComponentRef[],
    tabs: [] as ComponentRef[],
    resizable_block_pair: [] as ComponentRef[],
    list: [] as ComponentRef[],
    tabs_list: [] as ComponentRef[],
    dashboard: [] as ComponentRef[],
    dashboard_tree: [] as ComponentRef[],
    tree: [] as ComponentRef[],
    widget: [] as ComponentRef[],
    action: [] as ComponentRef[],
  };

  const add = (ref: ComponentRef) => {
    if (!ref.id) return;
    byId.set(ref.id, ref);
    byKind[ref.kind].push(ref);
  };

  if (typeof parsed !== "object" || parsed === null) {
    return buildEmptyIndex();
  }

  const obj = parsed as Record<string, unknown>;

  // Активности
  if (Array.isArray(obj.actions)) {
    for (const a of obj.actions) {
      if (typeof a !== "object" || a === null) continue;
      const id = (a as Record<string, unknown>).id;
      if (typeof id === "string") {
        add({ id, kind: "action", label: readLabel(a) });
      }
    }
  }

  // Views
  if (Array.isArray(obj.views)) {
    for (const v of obj.views) {
      if (typeof v !== "object" || v === null) continue;
      const vr = v as Record<string, unknown>;
      const id = typeof vr.id === "string" ? vr.id : null;
      if (!id) continue;
      const type = String(vr.type ?? "");

      // Верхнеуровневые view
      if (type === "list") add({ id, kind: "list", label: readLabel(vr) });
      else if (type === "tabs_list")
        add({ id, kind: "tabs_list", label: readLabel(vr) });
      else if (type === "dashboard")
        add({ id, kind: "dashboard", label: readLabel(vr) });
      else if (type === "dashboard_tree")
        add({ id, kind: "dashboard_tree", label: readLabel(vr) });
      else if (type === "tree") add({ id, kind: "tree", label: readLabel(vr) });

      // entity view содержит widgets, groups, views (inner)
      if (type === "entity") {
        add({ id, kind: "entity_view", label: readLabel(vr) });

        // widgets
        if (Array.isArray(vr.widgets)) {
          for (const w of vr.widgets) {
            if (typeof w !== "object" || w === null) continue;
            const wid = (w as Record<string, unknown>).id;
            if (typeof wid === "string") {
              add({
                id: wid,
                kind: "widget",
                parentId: id,
                label: readLabel(w),
              });
            }
          }
        }

        // groups
        if (Array.isArray(vr.groups)) {
          for (const g of vr.groups) {
            if (typeof g !== "object" || g === null) continue;
            const gr = g as Record<string, unknown>;
            const gid = typeof gr.id === "string" ? gr.id : null;
            if (!gid) continue;
            const gtype = String(gr.type ?? "");
            if (gtype === "block")
              add({
                id: gid,
                kind: "block",
                parentId: id,
                label: readLabel(g),
              });
            else if (gtype === "tab")
              add({ id: gid, kind: "tab", parentId: id, label: readLabel(g) });
            else if (gtype === "form")
              add({ id: gid, kind: "form", parentId: id, label: readLabel(g) });
            else if (gtype === "tabs")
              add({ id: gid, kind: "tabs", parentId: id, label: readLabel(g) });
            else if (gtype === "resizable_block_pair")
              add({
                id: gid,
                kind: "resizable_block_pair",
                parentId: id,
                label: readLabel(g),
              });
          }
        }

        // inner views: panel / modal / page
        if (Array.isArray(vr.views)) {
          for (const iv of vr.views) {
            if (typeof iv !== "object" || iv === null) continue;
            const ivr = iv as Record<string, unknown>;
            const iid = typeof ivr.id === "string" ? ivr.id : null;
            if (!iid) continue;
            const itype = String(ivr.type ?? "");
            if (itype === "panel")
              add({
                id: iid,
                kind: "panel",
                parentId: id,
                label: readLabel(iv),
              });
            else if (itype === "modal")
              add({
                id: iid,
                kind: "modal",
                parentId: id,
                label: readLabel(iv),
              });
            else if (itype === "page")
              add({
                id: iid,
                kind: "page",
                parentId: id,
                label: readLabel(iv),
              });
          }
        }
      }
    }
  }

  return {
    byId,
    byKind,
    has: (id) => byId.has(id),
    get: (id) => byId.get(id),
    find: (kind) => byKind[kind] ?? [],
  };
}

function buildEmptyIndex(): MixinTargetsIndex {
  const byId = new Map<string, ComponentRef>();
  const byKind = {
    entity_view: [],
    panel: [],
    modal: [],
    page: [],
    tab: [],
    block: [],
    form: [],
    tabs: [],
    resizable_block_pair: [],
    list: [],
    tabs_list: [],
    dashboard: [],
    dashboard_tree: [],
    tree: [],
    widget: [],
    action: [],
  } as Record<ComponentKind, ComponentRef[]>;
  return {
    byId,
    byKind,
    has: () => false,
    get: () => undefined,
    find: (kind) => byKind[kind] ?? [],
  };
}

function readLabel(o: unknown): string | undefined {
  if (typeof o !== "object" || o === null) return undefined;
  const r = o as Record<string, unknown>;
  if (typeof r.label === "string") return r.label;
  if (typeof r.name === "string") return r.name;
  return undefined;
}

export function readEntityViewById(
  parsed: unknown,
  id: string,
): Record<string, unknown> | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const views = (parsed as Record<string, unknown>).views;
  if (!Array.isArray(views)) return null;
  for (const v of views) {
    if (typeof v === "object" && v !== null) {
      const r = v as Record<string, unknown>;
      if (r.id === id && r.type === "entity") return r;
    }
  }
  return null;
}

export type EntityViewComponent = {
  kind: "tab" | "block" | "form" | "panel" | "list" | "widget";
  id: string;
  label?: string;
};

export function collectEntityViewComponents(
  view: Record<string, unknown>,
): EntityViewComponent[] {
  const result: EntityViewComponent[] = [];

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