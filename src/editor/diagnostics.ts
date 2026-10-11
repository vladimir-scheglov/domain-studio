import type * as monaco from "monaco-editor";
import { parseYaml } from "@/services/yamlService";
import type { Diagnostic as StoreDiagnostic } from "@/store/validationStore";
import { findUnknownKeys } from "@/domain/unknownKeys";
import { findRangeByPath } from "@/domain/findRange";
import { collectReferences } from "@/domain/references";
import { runZodValidation } from "@/domain/zodValidation";
import { useSettingsStore, categorizeDiagnostic } from "@/store/settingsStore";
import { buildMixinTargetsIndex } from "@/domain/mixinTargets";

/* ------------------------------------------------------------------ */
/*                       Severity mapping                              */
/* ------------------------------------------------------------------ */

function toMonacoSeverity(
  s: StoreDiagnostic["severity"],
  monacoApi: typeof import("monaco-editor"),
): monaco.MarkerSeverity {
  switch (s) {
    case "error":
      return monacoApi.MarkerSeverity.Error;
    case "warning":
      return monacoApi.MarkerSeverity.Warning;
    case "info":
    default:
      return monacoApi.MarkerSeverity.Info;
  }
}

/* ------------------------------------------------------------------ */
/*                       Лимит маркеров                                */
/* ------------------------------------------------------------------ */

const MAX_MARKERS = 150;

function severityRank(s: monaco.MarkerSeverity): number {
  if (s === 8 /* Error */) return 0;
  if (s === 4 /* Warning */) return 1;
  return 2;
}

/**
 * Системные атрибуты, которые доступны в любой сущности без объявления.
 */
const SYSTEM_ATTRIBUTE_IDS = new Set([
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
  "linkageId",
  "side1",
  "side2",
  "totalCount",
]);

function isSystemAttribute(id: string): boolean {
  return SYSTEM_ATTRIBUTE_IDS.has(id);
}

/* ------------------------------------------------------------------ */
/*                       Основная функция                              */
/* ------------------------------------------------------------------ */

/**
 * Регистрирует диагностику YAML и схемы домена.
 *
 * Работает в двух режимах:
 *  - «быстрая» валидация (YAML + ссылки) — с коротким debounce;
 *  - «полная» валидация (+ Zod) — с длинным debounce.
 *
 * Кэширует результат: если текст не менялся, повторный вызов
 * переиспользует прошлые диагностики без пересчёта.
 */
export function registerDiagnostics(
  monacoApi: typeof import("monaco-editor"),
  editor: monaco.editor.IStandaloneCodeEditor,
  onDiagnostics: (diags: StoreDiagnostic[]) => void,
): monaco.IDisposable {
  const model = editor.getModel();
  if (!model) return { dispose: () => void 0 };

  /* ------------------- Состояние ------------------- */

  let fastTimer: ReturnType<typeof setTimeout> | null = null;
  let fullTimer: ReturnType<typeof setTimeout> | null = null;

  // Кэш текста: если не менялся — не пересчитываем
  let lastText = "";
  let lastFastDiags: StoreDiagnostic[] = [];
  let lastZodDiags: StoreDiagnostic[] = [];

  /* ------------------- Установка маркеров ------------------- */

  const applyMarkers = (all: StoreDiagnostic[]) => {
    const rawMarkers: monaco.editor.IMarkerData[] = all.map((d) => ({
      severity: toMonacoSeverity(d.severity, monacoApi),
      message: d.message,
      code: d.code,
      startLineNumber: d.startLine,
      startColumn: d.startColumn,
      endLineNumber: d.endLine,
      endColumn: d.endColumn,
    }));

    // Сортируем по severity: сначала error, потом warning, потом info.
    // Ограничиваем количество, чтобы Monaco не тормозил.
    const sorted = [...rawMarkers].sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity),
    );

    let visibleMarkers = sorted;
    if (sorted.length > MAX_MARKERS) {
      visibleMarkers = sorted.slice(0, MAX_MARKERS);
      visibleMarkers.push({
        severity: monacoApi.MarkerSeverity.Info,
        message: `Показаны первые ${MAX_MARKERS} из ${sorted.length} проблем. Полный список — в панели проблем.`,
        code: "check:truncated",
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      });
    }

    monacoApi.editor.setModelMarkers(model, "domain-studio", visibleMarkers);
    onDiagnostics(all);
  };

  const combineAndApply = () => {
    const all = [...lastZodDiags, ...lastFastDiags];

    // Фильтруем для маркеров редактора
    const settings = useSettingsStore.getState();
    const forMarkers = all.filter((d) => {
      if (d.severity !== "warning") return true;
      if (!settings.warningsEnabled) return false;
      const cat = categorizeDiagnostic(d.code);
      if (settings.hiddenCategories.includes(cat)) return false;
      return true;
    });

    // Для редактора — отфильтрованные
    applyMarkers(forMarkers);

    // Для панели проблем — все
    onDiagnostics(all);
  };

  /* ------------------- Быстрая валидация ------------------- */

  const runFastValidation = () => {
    const text = model.getValue();

    // Кэш: текст не менялся — переиспользуем
    if (text === lastText && lastFastDiags.length > 0) {
      combineAndApply();
      return;
    }

    const t0 = performance.now();

    const result = parseYaml(text);
    const diags: StoreDiagnostic[] = [];

    /* ---------- 1. YAML-ошибки ---------- */
    if (result.error && result.doc) {
      for (const err of result.doc.errors) {
        const pos = result.lineCounter.linePos(err.pos[0]);
        const endPos = result.lineCounter.linePos(err.pos[1] ?? err.pos[0] + 1);
        diags.push({
          severity: "error",
          message: err.message,
          path: [],
          code: "check:yaml_parse",
          startLine: pos.line,
          startColumn: pos.col,
          endLine: endPos.line,
          endColumn: endPos.col,
        });
      }
    }

    /* ---------- 2. Неизвестные ключи ---------- */
    if (result.parsed && result.doc) {
      try {
        const unknown = findUnknownKeys(result.parsed);
        for (const u of unknown) {
          const range = findRangeByPath(result.doc, u.path);
          if (!range) continue;
          diags.push({
            severity: "warning",
            message: `Неизвестное свойство «${u.key}»`,
            path: u.path,
            code: `zod:unknown_key|${u.key}`,
            startLine: range.startLine,
            startColumn: range.startColumn,
            endLine: range.endLine,
            endColumn: range.endColumn,
          });
        }
      } catch (e) {
        console.warn("unknownKeys validation failed:", e);
      }
    }

    /* ---------- 3. Проверка версии SemVer ---------- */
    if (result.parsed && result.doc) {
      try {
        const parsed = result.parsed as Record<string, unknown>;
        const version = parsed.version;

        if (typeof version === "string") {
          const semverRe =
            /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

          if (!semverRe.test(version)) {
            const range = findRangeByPath(result.doc, ["version"]);
            if (range) {
              diags.push({
                severity: "warning",
                message: `Версия «${version}» не соответствует SemVer (ожидается MAJOR.MINOR.PATCH, например 0.0.1)`,
                path: ["version"],
                code: "check:semver",
                startLine: range.startLine,
                startColumn: range.startColumn,
                endLine: range.endLine,
                endColumn: range.endColumn,
              });
            }
          }
        }
      } catch (e) {
        console.warn("version validation failed:", e);
      }
    }

    /* ---------- 4. Валидация ссылок ---------- */
    if (result.parsed && result.doc) {
      try {
        const refs = collectReferences(result.parsed);
        const entityIds = new Set(refs.entities.map((e) => e.id));
        const dataTypeIds = new Set(refs.dataTypes.map((d) => d.id));

        const parsedObj = result.parsed as Record<string, unknown>;
        const entities = Array.isArray(parsedObj.entities)
          ? (parsedObj.entities as Array<Record<string, unknown>>)
          : [];

        const linkageIds = new Set(
          (Array.isArray(parsedObj.linkages)
            ? (parsedObj.linkages as Array<Record<string, unknown>>)
            : []
          )
            .map((l) => (typeof l.id === "string" ? l.id : null))
            .filter((x): x is string => x !== null),
        );  

        /* ---------- 4.1. side1/side2 у связей ---------- */
        const linkages = Array.isArray(parsedObj.linkages)
          ? (parsedObj.linkages as Array<Record<string, unknown>>)
          : [];

        for (let i = 0; i < linkages.length; i++) {
          const l = linkages[i];
          if (typeof l !== "object" || l === null) continue;
          const linkageId = String(l.id ?? `#${i}`);

          for (const side of ["side1", "side2"] as const) {
            const target = l[side];
            if (typeof target !== "string" || !target) continue;
            if (target.includes("/")) continue;

            if (!entityIds.has(target)) {
              const range = findRangeByPath(result.doc, [
                "linkages",
                String(l.id ?? i),
                side,
              ]);
              if (range) {
                diags.push({
                  severity: "warning",
                  message: `Связь «${linkageId}» ссылается на несуществующую сущность «${target}»`,
                  path: ["linkages", i, side],
                  code: `check:broken_entity_ref|${linkageId}|${side}|${target}`,
                  startLine: range.startLine,
                  startColumn: range.startColumn,
                  endLine: range.endLine,
                  endColumn: range.endColumn,
                });
              }
            }
          }
        }

        /* ---------- 4.2. inherits у сущностей ---------- */
        for (let i = 0; i < refs.entities.length; i++) {
          const ent = entities[i];
          const inherits = ent?.inherits;
          if (typeof inherits !== "string" || !inherits) continue;
          if (inherits.includes("/")) continue;

          if (!entityIds.has(inherits)) {
            const range = findRangeByPath(result.doc, [
              "entities",
              String(ent.id ?? i),
              "inherits",
            ]);
            if (range) {
              diags.push({
                severity: "warning",
                message: `Сущность «${ent.id}» наследуется от несуществующей «${inherits}»`,
                path: ["entities", i, "inherits"],
                code: `check:broken_entity_ref|${ent.id}|inherits|${inherits}`,
                startLine: range.startLine,
                startColumn: range.startColumn,
                endLine: range.endLine,
                endColumn: range.endColumn,
              });
            }
          }
        }

        /* ---------- 4.3. dataType у атрибутов ---------- */
        const builtinTypes = new Set([
          "Uuid",
          "Identifier",
          "Timestamp",
          "Date",
          "Time",
          "TimestampRange",
          "String",
          "Text",
          "MAC",
          "Integer",
          "Decimal",
          "Float",
          "Bool",
          "Enum",
          "IpAddress",
          "CIDR",
          "Attachment",
          "Reference",
          "Workflow",
          "Array",
          "Table",
          "Calculation",
          "Counter",
          "URL",
          "Configuration",
          "Variable",
          "Automation",
          "RQL",
        ]);

        for (let ei = 0; ei < refs.entities.length; ei++) {
          const ent = entities[ei];
          if (!Array.isArray(ent?.attributes)) continue;

          const attrs = ent.attributes as Array<Record<string, unknown>>;
          for (let ai = 0; ai < attrs.length; ai++) {
            const attr = attrs[ai];
            const dt = attr?.dataType;
            if (typeof dt !== "string" || !dt) continue;
            if (dt.includes("/")) continue;
            if (builtinTypes.has(dt)) continue;
            if (dataTypeIds.has(dt)) continue;

            const range = findRangeByPath(result.doc, [
              "entities",
              String(ent.id ?? ei),
              "attributes",
              String(attr.id ?? ai),
              "dataType",
            ]);
            if (range) {
              diags.push({
                severity: "warning",
                message: `Атрибут «${attr.id}»: неизвестный тип данных «${dt}»`,
                path: ["entities", ei, "attributes", ai, "dataType"],
                code: `check:broken_data_type|${attr.id}|${dt}`,
                startLine: range.startLine,
                startColumn: range.startColumn,
                endLine: range.endLine,
                endColumn: range.endColumn,
              });
            }
          }
        }

        /* ---------- 4.4. views[*].entity / source.entity ---------- */
        const views = Array.isArray(parsedObj.views)
          ? (parsedObj.views as Array<Record<string, unknown>>)
          : [];

        const viewIds = new Set<string>();
        const innerViewIds = new Set<string>();

        for (const v of views) {
          if (typeof v !== "object" || v === null) continue;
          if (typeof v.id === "string") viewIds.add(v.id);

          const innerViews = Array.isArray(v.views) ? v.views : [];
          for (const iv of innerViews) {
            if (
              typeof iv === "object" &&
              iv !== null &&
              typeof (iv as Record<string, unknown>).id === "string"
            ) {
              innerViewIds.add(String((iv as Record<string, unknown>).id));
            }
          }
        }

        for (let vi = 0; vi < views.length; vi++) {
          const v = views[vi];
          if (typeof v !== "object" || v === null) continue;
          const viewId = String(v.id ?? `#${vi}`);
          const viewType = String(v.type ?? "");

          // entity view
          if (viewType === "entity" && typeof v.entity === "string") {
            const target = v.entity;
            if (!target.includes("/") && !entityIds.has(target)) {
              const range = findRangeByPath(result.doc, [
                "views",
                viewId,
                "entity",
              ]);
              if (range) {
                diags.push({
                  severity: "warning",
                  message: `Представление «${viewId}»: сущность «${target}» не найдена`,
                  path: ["views", vi, "entity"],
                  code: `check:broken_entity_ref|${viewId}|entity|${target}`,
                  startLine: range.startLine,
                  startColumn: range.startColumn,
                  endLine: range.endLine,
                  endColumn: range.endColumn,
                });
              }
            }
          }

          // list view
          if (viewType === "list") {
            const source = v.source;
            if (
              typeof source === "object" &&
              source !== null &&
              typeof (source as Record<string, unknown>).entity === "string"
            ) {
              const target = String((source as Record<string, unknown>).entity);
              if (!target.includes("/") && !entityIds.has(target)) {
                const range = findRangeByPath(result.doc, [
                  "views",
                  viewId,
                  "source",
                  "entity",
                ]);
                if (range) {
                  diags.push({
                    severity: "warning",
                    message: `Список «${viewId}»: сущность «${target}» не найдена`,
                    path: ["views", vi, "source", "entity"],
                    code: `check:broken_entity_ref|${viewId}|source|${target}`,
                    startLine: range.startLine,
                    startColumn: range.startColumn,
                    endLine: range.endLine,
                    endColumn: range.endColumn,
                  });
                }
              }
            }
          }

          /* ---------- 4.4.3. views[*].widgets[*].attribute ---------- */
          if (viewType === "entity" && typeof v.entity === "string") {
            const viewEntity = String(v.entity);
            const viewEntityData = entities.find((e) => e.id === viewEntity);

            if (viewEntityData) {
              const entAttributes = Array.isArray(viewEntityData.attributes)
                ? (viewEntityData.attributes as Array<Record<string, unknown>>)
                : [];
              const entAttrIds = new Set(
                entAttributes
                  .map((a) => (typeof a.id === "string" ? a.id : null))
                  .filter((x): x is string => x !== null),
              );

              const widgets = Array.isArray(v.widgets)
                ? (v.widgets as Array<Record<string, unknown>>)
                : [];

              for (let wi = 0; wi < widgets.length; wi++) {
                const w = widgets[wi];
                if (typeof w !== "object" || w === null) continue;
                if (w.type !== "attribute") continue;
                if (typeof w.attribute !== "string") continue;

                const attrId = String(w.attribute);

                // Пропускаем без проверки:
                //  1) FQID с доменом: a/b.c
                //  2) ссылки вида Entity.Attr — проверим отдельно
                //  3) системные атрибуты
                if (attrId.includes("/")) continue;

                if (isSystemAttribute(attrId)) continue;

                // Ссылка вида "Entity.attr"
                if (attrId.includes(".")) {
                  const [refEntityId, refAttrId] = attrId.split(".");
                  const refEntity = entities.find((e) => e.id === refEntityId);

                  if (!refEntity) {
                    // сущность, на которую ссылаемся, не найдена
                    const range = findRangeByPath(result.doc, [
                      "views",
                      viewId,
                      "widgets",
                      wi,
                      "attribute",
                    ]);
                    if (range) {
                      diags.push({
                        severity: "warning",
                        message: `Виджет «${w.id ?? wi}»: сущность «${refEntityId}» в ссылке на атрибут не найдена`,
                        path: ["views", vi, "widgets", wi, "attribute"],
                        code: `check:broken_entity_ref|${viewId}|widget|${refEntityId}`,
                        startLine: range.startLine,
                        startColumn: range.startColumn,
                        endLine: range.endLine,
                        endColumn: range.endColumn,
                      });
                    }
                    continue;
                  }

                  if (isSystemAttribute(refAttrId)) {
                    continue;
                  }

                  const refAttrs = Array.isArray(refEntity.attributes)
                    ? (refEntity.attributes as Array<Record<string, unknown>>)
                    : [];
                  const refAttrIds = new Set(
                    refAttrs
                      .map((a) => (typeof a.id === "string" ? a.id : null))
                      .filter((x): x is string => x !== null),
                  );

                  if (!refAttrIds.has(refAttrId)) {
                    const range = findRangeByPath(result.doc, [
                      "views",
                      viewId,
                      "widgets",
                      wi,
                      "attribute",
                    ]);
                    if (range) {
                      diags.push({
                        severity: "warning",
                        message: `Виджет «${w.id ?? wi}»: атрибут «${refAttrId}» не найден в сущности «${refEntityId}»`,
                        path: ["views", vi, "widgets", wi, "attribute"],
                        code: `check:broken_attribute_ref|${viewId}|${String(w.id ?? wi)}|${refAttrId}`,
                        startLine: range.startLine,
                        startColumn: range.startColumn,
                        endLine: range.endLine,
                        endColumn: range.endColumn,
                      });
                    }
                  }
                  continue;
                }

                // Простой id — должен быть в сущности самой view
                if (!entAttrIds.has(attrId)) {
                  const range = findRangeByPath(result.doc, [
                    "views",
                    viewId,
                    "widgets",
                    wi,
                    "attribute",
                  ]);
                  if (range) {
                    diags.push({
                      severity: "warning",
                      message: `Виджет «${w.id ?? wi}»: атрибут «${attrId}» не найден в сущности «${viewEntity}»`,
                      path: ["views", vi, "widgets", wi, "attribute"],
                      code: `check:broken_attribute_ref|${viewId}|${String(w.id ?? wi)}|${attrId}`,
                      startLine: range.startLine,
                      startColumn: range.startColumn,
                      endLine: range.endLine,
                      endColumn: range.endColumn,
                    });
                  }
                }
              }
            }
          }
        }

        /* ---------- 4.5. menus[*].items[*].view ---------- */
        const menus = Array.isArray(parsedObj.menus)
          ? (parsedObj.menus as Array<Record<string, unknown>>)
          : [];

        for (let mi = 0; mi < menus.length; mi++) {
          const m = menus[mi];
          if (typeof m !== "object" || m === null) continue;

          if (m.type === "root_menu" && typeof m.view === "string") {
            const target = String(m.view);
            if (!target.includes("/") && !viewIds.has(target)) {
              const range = findRangeByPath(result.doc, [
                "menus",
                String(m.id ?? mi),
                "view",
              ]);
              if (range) {
                diags.push({
                  severity: "warning",
                  message: `Меню «${m.id ?? mi}»: представление «${target}» не найдено`,
                  path: ["menus", mi, "view"],
                  code: `check:broken_view_ref|${String(m.id ?? mi)}|${target}`,
                  startLine: range.startLine,
                  startColumn: range.startColumn,
                  endLine: range.endLine,
                  endColumn: range.endColumn,
                });
              }
            }
          }

          if (Array.isArray(m.items)) {
            const items = m.items as Array<Record<string, unknown>>;
            for (let ii = 0; ii < items.length; ii++) {
              const it = items[ii];
              if (typeof it !== "object" || it === null) continue;
              if (typeof it.view !== "string") continue;

              const target = String(it.view);
              if (target.includes("/")) continue;
              if (viewIds.has(target)) continue;

              const range = findRangeByPath(result.doc, [
                "menus",
                String(m.id ?? mi),
                "items",
                ii,
                "view",
              ]);
              if (range) {
                diags.push({
                  severity: "warning",
                  message: `Пункт меню «${it.id ?? ii}»: представление «${target}» не найдено`,
                  path: ["menus", mi, "items", ii, "view"],
                  code: `check:broken_view_ref|${String(it.id ?? ii)}|${target}`,
                  startLine: range.startLine,
                  startColumn: range.startColumn,
                  endLine: range.endLine,
                  endColumn: range.endColumn,
                });
              }
            }
          }
        }

        /* ---------- 4.6. actions[*] ---------- */
        const actions = Array.isArray(parsedObj.actions)
          ? (parsedObj.actions as Array<Record<string, unknown>>)
          : [];

        for (let ai = 0; ai < actions.length; ai++) {
          const a = actions[ai];
          if (typeof a !== "object" || a === null) continue;
          const actionId = String(a.id ?? `#${ai}`);

          if (typeof a.entity === "string" && !a.entity.includes("/")) {
            if (!entityIds.has(a.entity)) {
              const range = findRangeByPath(result.doc, [
                "actions",
                actionId,
                "entity",
              ]);
              if (range) {
                diags.push({
                  severity: "warning",
                  message: `Действие «${actionId}»: сущность «${a.entity}» не найдена`,
                  path: ["actions", ai, "entity"],
                  code: `check:broken_entity_ref|${actionId}|entity|${a.entity}`,
                  startLine: range.startLine,
                  startColumn: range.startColumn,
                  endLine: range.endLine,
                  endColumn: range.endColumn,
                });
              }
            }
          }

          if (typeof a.modal === "string" && !a.modal.includes("/")) {
            if (!innerViewIds.has(a.modal)) {
              const range = findRangeByPath(result.doc, [
                "actions",
                actionId,
                "modal",
              ]);
              if (range) {
                diags.push({
                  severity: "warning",
                  message: `Действие «${actionId}»: модальное окно «${a.modal}» не найдено`,
                  path: ["actions", ai, "modal"],
                  code: `check:broken_view_ref|${actionId}|${a.modal}`,
                  startLine: range.startLine,
                  startColumn: range.startColumn,
                  endLine: range.endLine,
                  endColumn: range.endColumn,
                });
              }
            }
          }

          if (typeof a.panel === "string" && !a.panel.includes("/")) {
            if (!innerViewIds.has(a.panel)) {
              const range = findRangeByPath(result.doc, [
                "actions",
                actionId,
                "panel",
              ]);
              if (range) {
                diags.push({
                  severity: "warning",
                  message: `Действие «${actionId}»: панель «${a.panel}» не найдена`,
                  path: ["actions", ai, "panel"],
                  code: `check:broken_view_ref|${actionId}|${a.panel}`,
                  startLine: range.startLine,
                  startColumn: range.startColumn,
                  endLine: range.endLine,
                  endColumn: range.endColumn,
                });
              }
            }
          }

          if (typeof a.view === "string" && !a.view.includes("/")) {
            if (!viewIds.has(a.view)) {
              const range = findRangeByPath(result.doc, [
                "actions",
                actionId,
                "view",
              ]);
              if (range) {
                diags.push({
                  severity: "warning",
                  message: `Действие «${actionId}»: представление «${a.view}» не найдено`,
                  path: ["actions", ai, "view"],
                  code: `check:broken_view_ref|${actionId}|${a.view}`,
                  startLine: range.startLine,
                  startColumn: range.startColumn,
                  endLine: range.endLine,
                  endColumn: range.endColumn,
                });
              }
            }
          }
        }

        /* ---------- 4.7. Проверка миксинов ---------- */
        const mixins = Array.isArray(parsedObj.mixins)
          ? (parsedObj.mixins as Array<Record<string, unknown>>)
          : [];

        if (mixins.length > 0) {
          const targets = buildMixinTargetsIndex(parsedObj);
          const mixinIds = new Set<string>();
          for (const m of mixins) {
            if (
              typeof m === "object" &&
              m !== null &&
              typeof m.id === "string"
            ) {
              mixinIds.add(m.id);
            }
          }

          for (let mi = 0; mi < mixins.length; mi++) {
            const m = mixins[mi];
            if (typeof m !== "object" || m === null) continue;
            const mixinId = String(m.id ?? `#${mi}`);
            const mixinType = String(m.type ?? "");

            // 4.7.1. Проверка linkage у миксинов типа linkage
            if (mixinType === "linkage" && typeof m.linkage === "string") {
              const target = m.linkage;
              if (!target.includes("/") && !linkageIds.has(target)) {
                const range = findRangeByPath(result.doc, [
                  "mixins",
                  mixinId,
                  "linkage",
                ]);
                if (range) {
                  diags.push({
                    severity: "warning",
                    message: `Примесь «${mixinId}»: связь «${target}» не найдена`,
                    path: ["mixins", mi, "linkage"],
                    code: `check:broken_linkage_ref|${mixinId}|mixin|${target}`,
                    startLine: range.startLine,
                    startColumn: range.startColumn,
                    endLine: range.endLine,
                    endColumn: range.endColumn,
                  });
                }
              }
            }

            // 4.7.2. Проверка entity у миксинов
            if (typeof m.entity === "string" && !m.entity.includes("/")) {
              if (!entityIds.has(m.entity)) {
                const range = findRangeByPath(result.doc, [
                  "mixins",
                  mixinId,
                  "entity",
                ]);
                if (range) {
                  diags.push({
                    severity: "warning",
                    message: `Примесь «${mixinId}»: сущность «${m.entity}» не найдена`,
                    path: ["mixins", mi, "entity"],
                    code: `check:broken_entity_ref|${mixinId}|mixin|${m.entity}`,
                    startLine: range.startLine,
                    startColumn: range.startColumn,
                    endLine: range.endLine,
                    endColumn: range.endColumn,
                  });
                }
              }
            }

            // entity может быть объектом { from, to }
            if (typeof m.entity === "object" && m.entity !== null) {
              const ent = m.entity as Record<string, unknown>;
              for (const side of ["from", "to"]) {
                const target = ent[side];
                if (typeof target !== "string" || target.includes("/"))
                  continue;
                if (!entityIds.has(target)) {
                  const range = findRangeByPath(result.doc, [
                    "mixins",
                    mixinId,
                    "entity",
                    side,
                  ]);
                  if (range) {
                    diags.push({
                      severity: "warning",
                      message: `Примесь «${mixinId}»: сущность «${target}» в entity.${side} не найдена`,
                      path: ["mixins", mi, "entity", side],
                      code: `check:broken_entity_ref|${mixinId}|mixin|${target}`,
                      startLine: range.startLine,
                      startColumn: range.startColumn,
                      endLine: range.endLine,
                      endColumn: range.endColumn,
                    });
                  }
                }
              }
            }

            // 4.7.3. Проверка views[].to.* и contentId
            const views = Array.isArray(m.views) ? m.views : [];
            for (let vi = 0; vi < views.length; vi++) {
              const v = views[vi];
              if (typeof v !== "object" || v === null) continue;
              const viewRef = v as Record<string, unknown>;
              const viewRecId = String(viewRef.id ?? `#${vi}`);

              // to.* — целевой компонент
              if (typeof viewRef.to === "object" && viewRef.to !== null) {
                const to = viewRef.to as Record<string, unknown>;
                for (const [k, targetRaw] of Object.entries(to)) {
                  if (typeof targetRaw !== "string" || targetRaw.includes("/"))
                    continue;
                  if (!targets.has(targetRaw)) {
                    const range = findRangeByPath(result.doc, [
                      "mixins",
                      mixinId,
                      "views",
                      viewRecId,
                      "to",
                      k,
                    ]);
                    if (range) {
                      diags.push({
                        severity: "warning",
                        message: `Примесь «${mixinId}» › views «${viewRecId}»: компонент «${targetRaw}» (to.${k}) не найден`,
                        path: ["mixins", mi, "views", vi, "to", k],
                        code: `check:broken_view_ref|${mixinId}|mixin|${targetRaw}`,
                        startLine: range.startLine,
                        startColumn: range.startColumn,
                        endLine: range.endLine,
                        endColumn: range.endColumn,
                      });
                    }
                  }
                }
              }

              // fromView — источник
              if (typeof viewRef.fromView === "string") {
                const from = viewRef.fromView;
                if (!from.includes("/") && !targets.has(from)) {
                  const range = findRangeByPath(result.doc, [
                    "mixins",
                    mixinId,
                    "views",
                    viewRecId,
                    "fromView",
                  ]);
                  if (range) {
                    diags.push({
                      severity: "warning",
                      message: `Примесь «${mixinId}» › views «${viewRecId}»: источник «${from}» не найден`,
                      path: ["mixins", mi, "views", vi, "fromView"],
                      code: `check:broken_view_ref|${mixinId}|mixin|${from}`,
                      startLine: range.startLine,
                      startColumn: range.startColumn,
                      endLine: range.endLine,
                      endColumn: range.endColumn,
                    });
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("reference validation failed:", e);
      }
    }

    lastFastDiags = diags;
    lastText = text;
    combineAndApply();

    const elapsed = performance.now() - t0;
    if (elapsed > 300) {
      console.warn(
        `[diagnostics] fast validation: ${Math.round(
          elapsed,
        )} ms for ${text.split("\n").length} lines`,
      );
    }
  };

  /* ------------------- Полная валидация (Zod) ------------------- */

  const runFullValidation = () => {
    const text = model.getValue();

    // если текст изменился после последней быстрой — отложим Zod
    if (text !== lastText) return;

    // Zod включён?
    const zodEnabled = useSettingsStore.getState().zodEnabled;

    if (!zodEnabled) {
      lastZodDiags = [];
      combineAndApply();
      return;
    }

    const t0 = performance.now();
    const result = parseYaml(text);
    if (!result.parsed) {
      lastZodDiags = [];
      combineAndApply();
      return;
    }

    const zodDiags: StoreDiagnostic[] = [];

    try {
      const zres = runZodValidation(result.parsed, result.doc);
      for (const zd of zres) {
        zodDiags.push({
          severity: "error",
          message: `[Схема] ${zd.message}`,
          path: zd.path,
          code: zd.code,
          startLine: zd.startLine,
          startColumn: zd.startColumn,
          endLine: zd.endLine,
          endColumn: zd.endColumn,
        });
      }
    } catch (e) {
      console.warn("zod validation failed:", e);
    }

    lastZodDiags = zodDiags;
    combineAndApply();

    const elapsed = performance.now() - t0;
    if (elapsed > 500) {
      console.warn(
        `[diagnostics] full validation (Zod): ${Math.round(
          elapsed,
        )} ms for ${text.split("\n").length} lines`,
      );
    }
  };

  /* ------------------- Debounce-планировщик ------------------- */

  const onChange = () => {
    const text = model.getValue();
    const lines = text.split("\n").length;

    // Fast: 200–500 мс в зависимости от размера
    if (fastTimer) clearTimeout(fastTimer);
    const baseDelay = useSettingsStore.getState().validationDebounce;
    fastTimer = setTimeout(
      runFastValidation,
      lines > 3000 ? baseDelay + 200 : baseDelay,
    );
    // Full: 1–2 секунды после последнего нажатия
    if (fullTimer) clearTimeout(fullTimer);
    fullTimer = setTimeout(runFullValidation, lines > 3000 ? 2000 : 1000);
  };

  const disposable = model.onDidChangeContent(onChange);

  // Подписка на изменения настроек: пересобрать маркеры при смене фильтра
  const unsubscribeSettings = useSettingsStore.subscribe(() => {
    combineAndApply();
  });

  // Первый прогон
  runFastValidation();
  runFullValidation();

  return {
    dispose: () => {
      if (fastTimer) clearTimeout(fastTimer);
      if (fullTimer) clearTimeout(fullTimer);
      unsubscribeSettings();
      disposable.dispose();
    },
  };
}
