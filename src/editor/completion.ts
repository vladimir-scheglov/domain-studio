import type * as monaco from "monaco-editor";
import { BUILTIN_SNIPPETS } from "./snippets.builtin";
import type { Snippet } from "@/store/snippetStore";
import { useSnippetStore } from "@/store/snippetStore";
import { useDocumentStore } from "@/store/documentStore";
import {
  collectReferences,
  getEntityIds,
  getLinkageIds,
  getDataTypeIds,
  getSequenceIds,
} from "@/domain/references";

const VIEW_TYPES: string[] = [
  "entity",
  "list",
  "tabs_list",
  "dashboard",
  "dashboard_tree",
  "tree",
];

const WIDGET_TYPES: string[] = [
  "attribute",
  "action",
  "linkage",
  "linkage_list",
  "linked_objects_groups",
  "join",
  "visualization",
  "history",
  "runs_history",
  "comments",
  "card",
  "conversation",
];

const ACTION_TYPES: string[] = [
  "open_panel",
  "open_modal",
  "open_page",
  "open_graph_view",
  "open_board_view",
  "open_list",
  "open_tree",
  "open_view",
  "remove",
  "bulk",
  "tree_bulk",
  "set_attribute_value",
  "automation",
  "scenario",
  "generate_qr_code",
  "copy_entity_link",
];

const TOP_LEVEL_KEYS = [
  "id",
  "type",
  "version",
  "name",
  "description",
  "status",
  "date",
  "author",
  "tags",
  "entities",
  "linkages",
  "trees",
  "transitiveLinkages",
  "dataTypes",
  "sequences",
  "counterColorPattern",
  "mixins",
  "dataRules",
  "actions",
  "medias",
  "views",
  "menus",
  "uiRules",
  "uiPresets",
  "exchangeSettings",
  "permissions",
  "accessRules",
  "localizations",
];

const ENTITY_KEYS = [
  "id",
  "name",
  "description",
  "label",
  "attributes",
  "sorting",
  "identification",
  "reconciliation",
  "projection",
  "searching",
  "inherits",
  "icons",
  "graphView",
  "scanTarget",
  "scanTargetGroup",
  "kind",
];

const ATTRIBUTE_KEYS = [
  "id",
  "name",
  "description",
  "dataType",
  "constraints",
  "readonly",
  "entity",
  "item",
  "sequence",
  "template",
  "defaultPrefix",
  "prefixRules",
  "incrementTemplate",
  "segment",
  "comments",
  "calculation",
];

const LINKAGE_KEYS = [
  "id",
  "name",
  "description",
  "side1",
  "side2",
  "type",
  "undirected",
  "nameFrom",
  "useForSearch",
  "attributes",
  "sorting",
  "view",
];

const DATA_TYPE_VALUES = [
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
];

/* ------------------------------------------------------------------ */
/*                             Провайдер                               */
/* ------------------------------------------------------------------ */

export function registerCompletionProvider(
  monacoApi: typeof import("monaco-editor"),
): monaco.IDisposable {
  return monacoApi.languages.registerCompletionItemProvider("yaml", {
    triggerCharacters: [":", " ", "-", ".", "@"],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const line = model.getLineContent(position.lineNumber);
      const beforeCursor = line.slice(0, position.column - 1);

      // ключ на текущей строке (например "side1:" или "- id:")
      const currentLineKey = getCurrentLineKey(line);

      // ключи-предки (по отступам)
      const keyPath = collectKeyPath(model, position.lineNumber);
      const rootKey = keyPath[0] ?? "";
      const lastKey = currentLineKey ?? keyPath[keyPath.length - 1] ?? "";

      // курсор стоит после ":"?
      const afterColon = /:\s*[^\s]*$/.test(beforeCursor);

      const suggestions: monaco.languages.CompletionItem[] = [];

      // 1) сниппеты
      if (!afterColon) {
        const userSnippets = useSnippetStore.getState().userSnippets;
        const allSnippets: Snippet[] = [...userSnippets, ...BUILTIN_SNIPPETS];
        for (const s of allSnippets) {
          if (
            word.word &&
            !s.prefix.toLowerCase().startsWith(word.word.toLowerCase())
          ) {
            continue;
          }
          suggestions.push({
            label: { label: s.prefix, description: s.description ?? "сниппет" },
            kind: monacoApi.languages.CompletionItemKind.Snippet,
            insertText: s.body,
            insertTextRules:
              monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: s.description ?? "сниппет",
            range,
            sortText: sortTextFor("snippet", s.prefix, word.word),
          });
        }
      }

      // 2) значения по контексту
      if (afterColon) {
        const refs = collectReferences(useDocumentStore.getState().parsed);

        if (lastKey === "dataType") {
          for (const v of DATA_TYPE_VALUES) {
            suggestions.push(value(v, range, monacoApi));
          }
          for (const v of getDataTypeIds(refs)) {
            suggestions.push(
              value(v, range, monacoApi, "пользовательский тип"),
            );
          }
          return { suggestions };
        }

        if (lastKey === "type") {
          // 1) linkages[*].type
          if (rootKey === "linkages") {
            for (const v of ["1_1", "1_n", "n_n"]) {
              suggestions.push(value(v, range, monacoApi, "связь"));
            }
            return { suggestions };
          }

          // 2) views[*].type
          if (rootKey === "views") {
            const viewTypes = [
              "entity",
              "list",
              "tabs_list",
              "dashboard",
              "dashboard_tree",
              "tree",
            ];
            for (const v of viewTypes) {
              suggestions.push(value(v, range, monacoApi, "представление"));
            }
            return { suggestions };
          }

          // 3) views[*].views[*].type (карточки объектов)
          if (
            rootKey === "views" &&
            keyPath.includes("views") &&
            keyPath.indexOf("views") !== 0
          ) {
            for (const v of ["panel", "modal", "page"]) {
              suggestions.push(value(v, range, monacoApi, "карточка"));
            }
            return { suggestions };
          }

          // 4) views[*].widgets[*].type
          if (rootKey === "views" && keyPath.includes("widgets")) {
            const widgetTypes = [
              "attribute",
              "action",
              "linkage",
              "linkage_list",
              "linked_objects_groups",
              "join",
              "visualization",
              "history",
              "runs_history",
              "comments",
              "card",
              "conversation",
              "addressBook",
              "calculation",
            ];
            for (const v of widgetTypes) {
              suggestions.push(value(v, range, monacoApi, "виджет"));
            }
            return { suggestions };
          }

          // 5) views[*].groups[*].type
          if (rootKey === "views" && keyPath.includes("groups")) {
            for (const v of [
              "block",
              "tab",
              "form",
              "tabs",
              "resizable_block_pair",
            ]) {
              suggestions.push(value(v, range, monacoApi, "группа"));
            }
            return { suggestions };
          }

          // 6) actions[*].type
          if (rootKey === "actions") {
            const actionTypes = [
              "open_panel",
              "open_modal",
              "open_page",
              "open_graph_view",
              "open_board_view",
              "open_list",
              "open_tree",
              "open_view",
              "remove",
              "bulk",
              "tree_bulk",
              "set_attribute_value",
              "automation",
              "scenario",
              "generate_qr_code",
              "copy_entity_link",
            ];
            for (const v of actionTypes) {
              suggestions.push(value(v, range, monacoApi, "действие"));
            }
            return { suggestions };
          }

          // 7) dataTypes[*].dataType
          if (rootKey === "dataTypes") {
            for (const v of ["Enum", "Workflow", "Table"]) {
              suggestions.push(
                value(v, range, monacoApi, "пользовательский тип"),
              );
            }
            return { suggestions };
          }

          // 8) menus[*].type
          if (rootKey === "menus") {
            for (const v of ["root_group", "root_menu"]) {
              suggestions.push(value(v, range, monacoApi, "меню"));
            }
            return { suggestions };
          }

          // 9) uiRules[*].target / rules[*].target
          if (rootKey === "uiRules") {
            for (const v of ["entity_view", "list_view", "entity_attribute"]) {
              suggestions.push(value(v, range, monacoApi, "UI-правило"));
            }
            return { suggestions };
          }

          // 10) dataRules[*].target
          if (rootKey === "dataRules") {
            for (const v of ["entity", "entityAttribute", "linkage"]) {
              suggestions.push(value(v, range, monacoApi, "правило данных"));
            }
            return { suggestions };
          }

          // 11) общий случай
          for (const v of [...VIEW_TYPES, ...WIDGET_TYPES, ...ACTION_TYPES]) {
            suggestions.push(value(v, range, monacoApi));
          }

          return { suggestions };
        }

        // сущности: entity в entities или linkages, side1, side2, inherits
        if (
          lastKey === "entity" ||
          lastKey === "side1" ||
          lastKey === "side2" ||
          lastKey === "inherits"
        ) {
          for (const id of getEntityIds(refs)) {
            suggestions.push(value(id, range, monacoApi));
          }
          return { suggestions };
        }

        if (lastKey === "linkage") {
          for (const id of getLinkageIds(refs)) {
            suggestions.push(value(id, range, monacoApi));
          }
          return { suggestions };
        }

        if (lastKey === "view") {
          for (const v of refs.views) {
            suggestions.push(value(v.id, range, monacoApi, v.type));
          }
          return { suggestions };
        }

        if (lastKey === "modal" || lastKey === "panel") {
          for (const v of refs.views) {
            suggestions.push(value(v.id, range, monacoApi, v.type));
          }
          return { suggestions };
        }

        if (lastKey === "sequence") {
          for (const id of getSequenceIds(refs)) {
            suggestions.push(value(id, range, monacoApi));
          }
          return { suggestions };
        }

        if (
          lastKey === "undirected" ||
          lastKey === "readonly" ||
          lastKey === "scanTarget" ||
          lastKey === "scanTargetGroup" ||
          lastKey === "useForSearch"
        ) {
          for (const v of ["true", "false"]) {
            suggestions.push(value(v, range, monacoApi));
          }
          return { suggestions };
        }

        if (lastKey === "operation") {
          for (const v of [
            "create",
            "edit",
            "view",
            "remove",
            "edit_attribute",
          ]) {
            suggestions.push(value(v, range, monacoApi, "операция"));
          }
          return { suggestions };
        }

        return { suggestions };
      }

      // 3) ключи по контексту
      let keys: string[] = [];
      if (keyPath.length === 0) {
        keys = TOP_LEVEL_KEYS;
      } else if (rootKey === "entities") {
        if (keyPath.length === 1) {
          keys = ENTITY_KEYS;
        } else if (keyPath[1] === "attributes") {
          keys = ATTRIBUTE_KEYS;
        }
      } else if (rootKey === "linkages") {
        keys = LINKAGE_KEYS;
      } else if (rootKey === "dataTypes") {
        keys = [
          "id",
          "name",
          "description",
          "dataType",
          "values",
          "statuses",
          "initial",
          "transitions",
          "attributes",
          "maxRows",
          "sorting",
          "view",
        ];
      } else if (rootKey === "actions") {
        keys = [
          "id",
          "name",
          "description",
          "type",
          "entity",
          "operation",
          "modal",
          "panel",
          "view",
          "automation",
          "scenario",
        ];
      } else if (rootKey === "views") {
        keys = [
          "id",
          "type",
          "label",
          "description",
          "entity",
          "source",
          "table",
          "widgets",
          "groups",
          "views",
          "inherits",
        ];
      } else if (rootKey === "menus") {
        keys = [
          "id",
          "route",
          "label",
          "type",
          "placement",
          "view",
          "items",
          "icon",
          "default",
        ];
      } else if (rootKey === "dataRules") {
        keys = [
          "id",
          "name",
          "description",
          "target",
          "entity",
          "linkage",
          "attribute",
          "condition",
          "rule",
          "message",
          "help",
        ];
      } else if (rootKey === "uiRules") {
        keys = [
          "id",
          "name",
          "description",
          "target",
          "view",
          "condition",
          "rule",
        ];
      } else if (rootKey === "sequences") {
        keys = ["id", "startFrom", "description"];
      }

      for (const k of keys) {
        suggestions.push({
          label: k,
          kind: monacoApi.languages.CompletionItemKind.Field,
          insertText: `${k}: `,
          range,
          sortText: "2" + k,
        });
      }

      return { suggestions };
    },
  });
}

/* ------------------------------------------------------------------ */
/*                        Emmet-подобное раскрытие                     */
/* ------------------------------------------------------------------ */

export function registerEmmetTabCommand(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoApi: typeof import("monaco-editor"),
): void {
  editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Tab, () => {
    const model = editor.getModel();
    if (!model) return;
    const position = editor.getPosition();
    if (!position) return;

    const word = model.getWordUntilPosition(position);
    if (!word.word) return;

    const userSnippets = useSnippetStore.getState().userSnippets;
    const all: Snippet[] = [...userSnippets, ...BUILTIN_SNIPPETS];
    const match = all.find((s) => s.prefix === word.word);
    if (!match) return;

    const range = new monacoApi.Range(
      position.lineNumber,
      word.startColumn,
      position.lineNumber,
      word.endColumn,
    );

    editor.executeEdits("emmet-expand", [
      { range, text: match.body, forceMoveMarkers: true },
    ]);
  });
}

/* ------------------------------------------------------------------ */
/*                        Вспомогательные                              */
/* ------------------------------------------------------------------ */

function value(
  v: string,
  range: monaco.IRange,
  monacoApi: typeof import("monaco-editor"),
  detail?: string,
  typed: string = "",
): monaco.languages.CompletionItem {
  return {
    label: v,
    kind: monacoApi.languages.CompletionItemKind.Value,
    insertText: v,
    detail,
    range,
    sortText: sortTextFor("value", v, typed),
  };
}

/**
 * Ключ на текущей строке. Учитывает и "- key:", и "key:".
 */
function getCurrentLineKey(line: string): string | null {
  const m = line.match(/^\s*-?\s*([A-Za-z_][\w]*)\s*:/);
  return m ? m[1] : null;
}

/**
 * Возвращает путь ключей-предков.
 * Служебные поля элементов массивов (id, name, label, description,
 * type, dataType и т.п.) не попадают в путь — они описывают сам элемент,
 * а не открывают новый блок.
 */
function collectKeyPath(
  model: monaco.editor.ITextModel,
  startLine: number,
): string[] {
  // ключи, которые мы НЕ считаем блоками для вложенного контекста
  const LEAF_KEYS = new Set([
    "id",
    "name",
    "label",
    "description",
    "type",
    "dataType",
    "side1",
    "side2",
    "entity",
    "inherits",
    "operation",
    "modal",
    "panel",
    "view",
    "linkage",
    "attribute",
    "action",
    "automation",
    "scenario",
    "route",
    "placement",
    "icon",
    "condition",
    "effect",
    "message",
    "help",
  ]);

  const path: string[] = [];
  let indent = getIndent(model.getLineContent(startLine));

  for (let ln = startLine - 1; ln >= 1; ln--) {
    const text = model.getLineContent(ln);
    if (!text.trim() || text.trimStart().startsWith("#")) continue;

    const curIndent = getIndent(text);
    if (curIndent >= indent) continue;

    const m = text.match(/^\s*(-\s+)?([A-Za-z_][\w]*)\s*:/);
    if (!m) continue;

    const key = m[2];

    // если это служебный лист — не добавляем в путь,
    // но продолжаем спускаться вверх
    if (LEAF_KEYS.has(key)) {
      indent = curIndent;
      continue;
    }

    path.unshift(key);
    indent = curIndent;

    if (indent === 0 && path.length > 0) break;
  }

  return path;
}

function getIndent(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

/**
 * Возвращает sortText для подсказки.
 * Формат: <group><score><label>
 * Меньше — выше.
 */
function sortTextFor(
  kind: "key" | "value" | "snippet",
  label: string,
  typed: string,
): string {
  // групповой префикс
  const group = kind === "key" ? "1" : kind === "value" ? "2" : "3";

  // если префикс совпадает точно — поднимаем на уровень выше
  const exact = typed && label.toLowerCase() === typed.toLowerCase();
  const score = exact ? "0" : "5";

  return group + score + label;
}
