import type * as monaco from "monaco-editor";

export type QuickFixEdit = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  newText: string;
};

export type QuickFix = {
  id: string;
  title: string;
  /** Показать этот fix первым в списке. */
  isPreferred?: boolean;
  edits: QuickFixEdit[];
};

/**
 * Для каждого поля — список предшественников (в порядке приоритета).
 * Вставляем сразу после первого найденного.
 */
const FIELD_ANCHORS: Record<string, string[]> = {
  // Метаданные верхнего уровня
  id: [],
  type: ['id'],
  version: ['id', 'type'],
  name: ['id', 'type', 'version'],
  description: ['id', 'type', 'version', 'name'],
  status: ['description', 'name'],
  date: ['status', 'description'],
  author: ['date', 'status', 'description'],
  tags: ['author', 'date', 'status'],
  // Содержимое
  entities: ['tags', 'author', 'date', 'status', 'description', 'name'],
  linkages: ['tags', 'author', 'date', 'status', 'description', 'name'],
  dataTypes: ['tags', 'author', 'date', 'status', 'description', 'name'],
  views: ['tags', 'author', 'date', 'status', 'description', 'name'],
  actions: ['tags', 'author', 'date', 'status', 'description', 'name'],
  menus: ['tags', 'author', 'date', 'status', 'description', 'name'],
  sequences: ['tags', 'author', 'date', 'status', 'description', 'name'],
  dataRules: ['tags', 'author', 'date', 'status', 'description', 'name'],
  counterColorPattern: ['tags', 'author', 'date', 'status', 'description', 'name'],

  // Вложенные (в сущности, связи, атрибуте)
  label: ['id', 'name'],
  attributes: ['name', 'description', 'label'],
  sorting: ['attributes', 'name', 'description'],
  identification: ['sorting', 'attributes', 'name'],
  reconciliation: ['identification', 'attributes', 'name'],
  projection: ['attributes', 'name'],
  searching: ['projection', 'attributes', 'name'],
  inherits: ['id', 'name'],
  icons: ['inherits', 'id', 'name'],
  graphView: ['icons', 'inherits', 'id', 'name'],
  scanTarget: ['id', 'name'],
  scanTargetGroup: ['id', 'name'],
  kind: ['id', 'name'],

  // Связь
  side1: ['id', 'name', 'description'],
  side2: ['side1', 'id', 'name'],
  undirected: ['side2', 'side1'],
  nameFrom: ['side2', 'side1'],
  useForSearch: ['nameFrom', 'side2'],

  // Атрибут
  dataType: ['id', 'name', 'description'],
  constraints: ['dataType', 'id', 'name'],
  readonly: ['constraints', 'dataType'],
  entity: ['dataType', 'id'],
  item: ['dataType', 'id'],
  sequence: ['dataType', 'id'],
  template: ['dataType', 'id'],
  defaultPrefix: ['template', 'dataType'],
  incrementTemplate: ['defaultPrefix', 'template', 'dataType'],
  segment: ['template', 'dataType'],
  comments: ['dataType', 'id'],
  calculation: ['dataType', 'id'],

  // Действия
  operation: ['type', 'name', 'id'],
  modal: ['operation', 'type'],
  panel: ['operation', 'type'],
  view: ['type', 'name', 'id'],
  scenario: ['type', 'name'],
  automation: ['type', 'name'],

  // Меню
  route: ['id', 'label'],
  placement: ['route', 'id'],
  priority: ['placement', 'route'],
  items: ['placement', 'route', 'id'],

  // Правила
  target: ['id', 'name', 'description'],
  linkage: ['target', 'id', 'name'],
  attribute: ['target', 'id', 'name'],
  condition: ['target', 'entity', 'linkage', 'attribute'],
  rule: ['condition', 'target'],
  message: ['rule', 'condition'],
  help: ['message', 'rule'],
  effect: ['rule', 'condition'],
};

/* ------------------------------------------------------------------ */
/*                        Якоря для полей                              */
/* ------------------------------------------------------------------ */

/**
 * Для каждого поля — список предшественников (в порядке приоритета).
 * Вставляем сразу после первого найденного.
 */
const FIELD_DEFAULTS: Record<string, string> = {
  type: "domain",
  id: "example.domain.tld",
  version: "0.0.1",
  name: "New Domain",
  description: "",
  status: "draft",
  date: "",
  author: "",
  tags: "[]",
  entities: "[]",
  linkages: "[]",
  dataTypes: "[]",
  views: "[]",
  actions: "[]",
  menus: "[]",
  label: '"{id}"',
  attributes: "[]",
  sorting: "[]",
  inherits: "",
  side1: "",
  side2: "",
  dataType: "String",
  constraints: "[]",
  readonly: "false",
  entity: "",
  item: "",
  operation: "create",
  target: "entity",
  condition: "true",
  effect: "required",
  route: "/section",
  placement: "top",
};

/* ------------------------------------------------------------------ */
/*                    Поиск позиции вставки                            */
/* ------------------------------------------------------------------ */

/**
 * Возвращает номер строки, ПОСЛЕ которой нужно вставить поле.
 * Идём от начала документа и запоминаем последний найденный анкер.
 */
function findInsertLineForField(
  model: monaco.editor.ITextModel,
  field: string,
): number {
  const anchors = FIELD_ANCHORS[field] ?? [];
  if (anchors.length === 0) {
    // Нет анкоров — в начало документа
    return 1;
  }

  const lineCount = model.getLineCount();
  const anchorSet = new Set(anchors);
  let lastAnchorLine = 0;

  // Ищем на уровне корня документа (без отступа).
  // Если нужен вложенный уровень — работаем по отступу того поля,
  // где сейчас курсор/маркер.
  for (let line = 1; line <= lineCount; line++) {
    const content = model.getLineContent(line);

    // только строки без отступа (корневые ключи)
    const match = content.match(/^([A-Za-z_][\w]*)\s*:/);
    if (!match) continue;

    const key = match[1];
    if (anchorSet.has(key)) {
      lastAnchorLine = line;
    }
  }

  if (lastAnchorLine > 0) {
    return lastAnchorLine;
  }

  // Ничего не нашли — в конец документа
  return lineCount;
}

/**
 * Определяет отступ по строке-анкеру.
 * Сейчас все корневые поля без отступа.
 */
function indentForLine(model: monaco.editor.ITextModel, line: number): string {
  const content = model.getLineContent(line);
  const m = content.match(/^(\s*)/);
  return m ? m[1] : "";
}

/* ------------------------------------------------------------------ */
/*                          Точка входа                                */
/* ------------------------------------------------------------------ */

/**
 * Возвращает список quick fix для маркера Monaco.
 * Код маркера имеет формат:
 *   zod:<kind>|<param1>|<param2>...
 * например:
 *   zod:required|type
 *   zod:invalid_enum|type|1_1,1_n,n_n
 *   zod:unknown_key|name1
 */
export function getQuickFixesForMarker(
  marker: monaco.editor.IMarkerData,
  model: monaco.editor.ITextModel,
): QuickFix[] {
  const code =
    typeof marker.code === "string" ? marker.code : marker.code?.value;
  if (!code) return [];

  const colon = code.indexOf(":");
  if (colon < 0) return [];
  const scheme = code.slice(0, colon);
  const rest = code.slice(colon + 1);
  const pipe = rest.indexOf("|");
  const kind = pipe < 0 ? rest : rest.slice(0, pipe);
  const params = pipe < 0 ? [] : rest.slice(pipe + 1).split("|");

  switch (`${scheme}:${kind}`) {
    case "zod:required":
      return requiredFix(marker, model, params);
    case "zod:invalid_enum":
      return invalidEnumFix(marker, params);
    case "zod:invalid_literal":
      return invalidLiteralFix(marker, params); // ← добавить
    case "zod:unknown_key":
      return unknownKeyFix(marker, model);
    case "zod:duplicate_id":
      return duplicateIdFix(marker, model, params);
    case "zod:system_id":
      return systemIdFix(marker, model, params);
    case "zod:missing_by":
      return missingByFix(marker, model, params);
    case "check:semver":
      return semverFix(marker, model);
    case "check:broken_entity_ref":
      return brokenEntityRefFix(marker, model, params);
    case "check:broken_view_ref":
      return brokenViewRefFix(marker, model, params);
    case "check:broken_attribute_ref":
      return brokenAttributeRefFix(marker, model, params);
    case "check:broken_action_ref":
      return brokenActionRefFix(marker, model, params);
    case "check:broken_linkage_ref":
      return brokenLinkageRefFix(marker, model, params);
    default:
      return [];
  }
}

/* ------------------------------------------------------------------ */
/*                    Fix: broken_entity_ref                            */
/* ------------------------------------------------------------------ */

/**
 * params: [<linkageOrViewId>, <side>, <targetEntityId>]
 */
function brokenEntityRefFix(
  marker: monaco.editor.IMarkerData,
  model: monaco.editor.ITextModel,
  params: string[]
): QuickFix[] {
  const target = params[params.length - 1] ?? '';
  if (!target) return [];

  // Собираем существующие сущности из документа
  const entities = readEntityIds(model);

  const fixes: QuickFix[] = [
    {
      id: `broken-entity:replace:${target}`,
      title: `Удалить ссылку на «${target}»`,
      isPreferred: false,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: '',
        },
      ],
    },
  ];

  // Предлагаем заменить на существующую сущность
  for (const id of entities.slice(0, 4)) {
    fixes.push({
      id: `broken-entity:${id}`,
      title: `Заменить на «${id}»`,
      isPreferred: false,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: id,
        },
      ],
    });
  }

  return fixes;
}

/**
 * Читает существующие id сущностей из YAML-модели.
 * Простой regex — ищем `- id: <name>` внутри `entities:`.
 */
function readEntityIds(model: monaco.editor.ITextModel): string[] {
  const text = model.getValue();
  const ids: string[] = [];
  const lines = text.split('\n');
  let inEntities = false;

  for (const line of lines) {
    if (/^entities:\s*$/.test(line)) {
      inEntities = true;
      continue;
    }
    if (/^[A-Za-z_][\w]*:\s*$/.test(line) && !line.startsWith(' ')) {
      if (!line.startsWith('entities')) inEntities = false;
    }
    if (!inEntities) continue;

    const m = line.match(/^\s*-\s*id:\s*([A-Za-z_][\w]*)/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

/* ------------------------------------------------------------------ */
/*                    Fix: broken_view_ref                              */
/* ------------------------------------------------------------------ */

function brokenViewRefFix(
  marker: monaco.editor.IMarkerData,
  model: monaco.editor.ITextModel,
  _params: string[]
): QuickFix[] {
  const views = readViewIds(model);
  const fixes: QuickFix[] = [
    {
      id: 'broken-view:remove',
      title: 'Удалить ссылку на представление',
      isPreferred: false,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: '',
        },
      ],
    },
  ];
  for (const id of views.slice(0, 5)) {
    fixes.push({
      id: `broken-view:${id}`,
      title: `Заменить на «${id}»`,
      isPreferred: false,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: id,
        },
      ],
    });
  }
  return fixes;
}

function readViewIds(model: monaco.editor.ITextModel): string[] {
  const text = model.getValue();
  const ids: string[] = [];
  const lines = text.split('\n');
  let inViews = false;

  for (const line of lines) {
    if (/^views:\s*$/.test(line)) {
      inViews = true;
      continue;
    }
    if (inViews) {
      const match = line.match(/^(\s*)-\s*id:\s*([A-Za-z_][\w-]*)/);
      if (match && match[1].length <= 2) {
        ids.push(match[2]);
      }
      if (/^[A-Za-z_][\w]*:\s*$/.test(line) && !line.startsWith(' ')) {
        inViews = false;
      }
    }
  }
  return ids;
}

/* ------------------------------------------------------------------ */
/*                    Fix: broken_attribute_ref                         */
/* ------------------------------------------------------------------ */

function brokenAttributeRefFix(
  marker: monaco.editor.IMarkerData,
  model: monaco.editor.ITextModel,
  _params: string[]
): QuickFix[] {
  const attrs = readAttributeIds(model);
  const fixes: QuickFix[] = [];
  for (const id of attrs.slice(0, 6)) {
    fixes.push({
      id: `broken-attr:${id}`,
      title: `Заменить на «${id}»`,
      isPreferred: fixes.length === 0,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: id,
        },
      ],
    });
  }
  return fixes;
}

function readAttributeIds(model: monaco.editor.ITextModel): string[] {
  const text = model.getValue();
  const ids = new Set<string>();
  const lines = text.split('\n');
  let inAttributes = false;

  for (const line of lines) {
    if (/^\s+attributes:\s*$/.test(line)) {
      inAttributes = true;
      continue;
    }
    if (/^\s*[A-Za-z_][\w]*:\s*$/.test(line) && !line.match(/^\s+/)) {
      inAttributes = false;
    }
    if (/^\s+[A-Za-z_][\w]*:\s*$/.test(line) && !line.includes('attributes')) {
      // вышли из attributes, если вернулись на уровень сущности
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      if (indent <= 2) inAttributes = false;
    }
    if (!inAttributes) continue;

    const m = line.match(/^\s+-\s*id:\s*([A-Za-z_][\w]*)/);
    if (m) ids.add(m[1]);
  }
  return Array.from(ids);
}

/* ------------------------------------------------------------------ */
/*                    Fix: broken_action_ref                            */
/* ------------------------------------------------------------------ */

function brokenActionRefFix(
  marker: monaco.editor.IMarkerData,
  model: monaco.editor.ITextModel,
  _params: string[]
): QuickFix[] {
  const actions = readIdsForKey(model, 'actions');
  const fixes: QuickFix[] = [];
  for (const id of actions.slice(0, 6)) {
    fixes.push({
      id: `broken-action:${id}`,
      title: `Заменить на «${id}»`,
      isPreferred: fixes.length === 0,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: id,
        },
      ],
    });
  }
  return fixes;
}

/* ------------------------------------------------------------------ */
/*                    Fix: broken_linkage_ref                           */
/* ------------------------------------------------------------------ */

function brokenLinkageRefFix(
  marker: monaco.editor.IMarkerData,
  model: monaco.editor.ITextModel,
  _params: string[],
): QuickFix[] {
  const linkages = readIdsForKey(model, "linkages");
  const fixes: QuickFix[] = [];
  for (const id of linkages.slice(0, 6)) {
    fixes.push({
      id: `broken-linkage:${id}`,
      title: `Заменить на «${id}»`,
      isPreferred: fixes.length === 0,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: id,
        },
      ],
    });
  }
  return fixes;
}

/**
 * Универсальная функция — читает id всех элементов в разделе `<key>:`.
 */
function readIdsForKey(
  model: monaco.editor.ITextModel,
  key: string
): string[] {
  const text = model.getValue();
  const ids: string[] = [];
  const lines = text.split('\n');
  let inSection = false;

  const startRe = new RegExp(`^${key}:\\s*$`);
  for (const line of lines) {
    if (startRe.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (/^[A-Za-z_][\w]*:\s*/.test(line) && !line.match(/^\s/)) {
        inSection = false;
        continue;
      }
      const m = line.match(/^\s*-\s*id:\s*([A-Za-z_][\w-]*)/);
      if (m) ids.push(m[1]);
    }
  }
  return ids;
}

/* ------------------------------------------------------------------ */
/*                          Fix: required                              */
/* ------------------------------------------------------------------ */

function requiredFix(
  _marker: monaco.editor.IMarkerData,
  model: monaco.editor.ITextModel,
  params: string[],
): QuickFix[] {
  const field = params[0] ?? "";
  if (!field) return [];

  const value = FIELD_DEFAULTS[field] ?? "";

  // Определяем позицию вставки: после последнего найденного анкера
  const anchorLine = findInsertLineForField(model, field);
  const indent = indentForLine(model, anchorLine);

  const insertAt = {
    line: anchorLine + 1,
    column: 1,
  };

  return [
    {
      id: `required:${field}`,
      title: `Добавить поле «${field}${value ? ": " + value : ""}»`,
      isPreferred: true,
      edits: [
        {
          startLine: insertAt.line,
          startColumn: 1,
          endLine: insertAt.line,
          endColumn: 1,
          newText: `${indent}${field}${value ? ": " + value : ":"}\n`,
        },
      ],
    },
    {
      id: `required-comment:${field}`,
      title: `Добавить пустое поле «${field}» с комментарием`,
      edits: [
        {
          startLine: insertAt.line,
          startColumn: 1,
          endLine: insertAt.line,
          endColumn: 1,
          newText: `${indent}${field}: # укажите значение\n`,
        },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*                          Fix: invalid_enum                          */
/* ------------------------------------------------------------------ */

function invalidEnumFix(
  marker: monaco.editor.IMarkerData,
  params: string[],
): QuickFix[] {
  const field = params[0] ?? "значение";
  const options = (params[1] ?? "").split(",").filter(Boolean);
  if (options.length === 0) return [];

  return options.slice(0, 4).map((opt, idx) => ({
    id: `enum:${field}:${opt}`,
    title: `Заменить на «${opt}»`,
    isPreferred: idx === 0,
    edits: [
      {
        startLine: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLine: marker.endLineNumber,
        endColumn: marker.endColumn,
        newText: opt,
      },
    ],
  }));
}

/* ------------------------------------------------------------------ */
/*                          Fix: unknown_key                           */
/* ------------------------------------------------------------------ */

function unknownKeyFix(
  marker: monaco.editor.IMarkerData,
  model: monaco.editor.ITextModel,
): QuickFix[] {
  // удаляем всю строку
  return [
    {
      id: "unknown:delete",
      title: "Удалить строку",
      isPreferred: true,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: 1,
          endLine: marker.startLineNumber + 1,
          endColumn: 1,
          newText: "",
        },
      ],
    },
    {
      id: "unknown:comment",
      title: "Закомментировать",
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.startLineNumber,
          endColumn: marker.startColumn,
          newText: "# ",
        },
      ],
    },
  ].filter(() => {
    // не предлагаем удалять первое поле, если оно последнее в документе
    void model;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/*                          Fix: duplicate_id                          */
/* ------------------------------------------------------------------ */

function duplicateIdFix(
  marker: monaco.editor.IMarkerData,
  _model: monaco.editor.ITextModel,
  params: string[],
): QuickFix[] {
  const id = params[0] ?? "id";
  const variants = [`${id}2`, `${id}3`, `${id}_new`];
  return variants.map((v, idx) => ({
    id: `dup:${v}`,
    title: `Переименовать в «${v}»`,
    isPreferred: idx === 0,
    edits: [
      {
        startLine: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLine: marker.endLineNumber,
        endColumn: marker.endColumn,
        newText: v,
      },
    ],
  }));
}

/* ------------------------------------------------------------------ */
/*                          Fix: system_id                             */
/* ------------------------------------------------------------------ */

function systemIdFix(
  marker: monaco.editor.IMarkerData,
  _model: monaco.editor.ITextModel,
  params: string[],
): QuickFix[] {
  const id = params[0] ?? "attr";
  const candidates = [
    `custom_${id}`,
    `${id}Custom`,
    `user${id[0].toUpperCase()}${id.slice(1)}`,
  ];
  return candidates.map((v, idx) => ({
    id: `sys:${v}`,
    title: `Переименовать в «${v}»`,
    isPreferred: idx === 0,
    edits: [
      {
        startLine: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLine: marker.endLineNumber,
        endColumn: marker.endColumn,
        newText: v,
      },
    ],
  }));
}

/* ------------------------------------------------------------------ */
/*                          Fix: missing_by                            */
/* ------------------------------------------------------------------ */

function missingByFix(
  marker: monaco.editor.IMarkerData,
  model: monaco.editor.ITextModel,
  _params: string[],
): QuickFix[] {
  // Вставляем by: после строки с id правила
  const lineContent = model.getLineContent(marker.startLineNumber);
  const indent = (lineContent.match(/^(\s*)/)?.[1] ?? "") + "  ";
  const insertAt = { line: marker.startLineNumber + 1, column: 1 };

  const templates: Array<{ title: string; body: string }> = [
    {
      title: "Сортировка по name (asc)",
      body: ["by:", "  - attribute: name", "    direction: asc"].join("\n"),
    },
    {
      title: "Сортировка по createdAt (desc)",
      body: ["by:", "  - attribute: createdAt", "    direction: desc"].join(
        "\n",
      ),
    },
  ];

  return templates.map((t, idx) => {
    const indented = t.body
      .split("\n")
      .map((l) => indent + l)
      .join("\n");
    return {
      id: `by:${idx}`,
      title: t.title,
      isPreferred: idx === 0,
      edits: [
        {
          startLine: insertAt.line,
          startColumn: 1,
          endLine: insertAt.line,
          endColumn: 1,
          newText: `${indented}\n`,
        },
      ],
    };
  });
}

/* ------------------------------------------------------------------ */
/*                          Fix: semver                                */
/* ------------------------------------------------------------------ */

function semverFix(
  marker: monaco.editor.IMarkerData,
  _model: monaco.editor.ITextModel,
): QuickFix[] {
  return [
    {
      id: "semver:0.0.1",
      title: "Заменить на 0.0.1",
      isPreferred: true,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: "0.0.1",
        },
      ],
    },
    {
      id: "semver:1.0.0",
      title: "Заменить на 1.0.0",
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: "1.0.0",
        },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*                       Fix: invalid_literal                          */
/* ------------------------------------------------------------------ */

/**
 * Zod не принимает значение, потому что оно должно быть строго задано.
 * Например: type: должен быть 'domain' — а пользователь написал 'domai'.
 *
 * params: [<field>, <expectedValue>]
 */
function invalidLiteralFix(
  marker: monaco.editor.IMarkerData,
  params: string[],
): QuickFix[] {
  const field = params[0] ?? "";
  const expected = params[1] ?? "";

  if (!expected) return [];

  return [
    {
      id: `literal:${field}:${expected}`,
      title: `Заменить на «${expected}»`,
      isPreferred: true,
      edits: [
        {
          startLine: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLine: marker.endLineNumber,
          endColumn: marker.endColumn,
          newText: expected,
        },
      ],
    },
  ];
}
