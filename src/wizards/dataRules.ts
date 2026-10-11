import { wizardRegistry } from "@/services/wizardRegistry";

/* ------------------------------------------------------------------ */
/*                            Общие поля                                */
/* ------------------------------------------------------------------ */

const commonTopFields = [
  {
    name: "id",
    label: "ID правила",
    type: "text" as const,
    required: true,
    placeholder: "required_baseAttr",
    help: "Уникальный идентификатор правила. Латиница, цифры, _.",
  },
  {
    name: "name",
    label: "Название правила",
    type: "text" as const,
    required: true,
    placeholder: "Обязательность основного атрибута",
  },
  {
    name: "description",
    label: "Описание",
    type: "textarea" as const,
    placeholder: "Кратко: что делает правило",
  },
  {
    name: "entityId",
    label: "Сущность",
    type: "entity-ref" as const,
    required: true,
    placeholder: "Incident",
  },
  {
    name: "attributeId",
    label: "Атрибут",
    type: "attribute-ref" as const,
    required: true,
    placeholder: "responsible",
    help: "ID атрибута внутри выбранной сущности.",
  },
  {
    name: "condition",
    label: "Условие (RQL)",
    type: "rql" as const,
    placeholder: "@doc.incidentStatus = 'REGISTERED'",
    help: "Правило срабатывает, когда выражение возвращает true. Оставьте пустым или введите true, чтобы правило действовало всегда.",
  },
];

const effectSpecificFields = {
  required: [
    {
      name: "message",
      label: "Сообщение об ошибке",
      type: "text" as const,
      placeholder: "Укажите ответственного",
    },
    {
      name: "help",
      label: "Подсказка",
      type: "text" as const,
      placeholder: "Обязательно для подтверждённых инцидентов",
    },
  ],
  hidden: [
    {
      name: "help",
      label: "Подсказка",
      type: "text" as const,
      placeholder: "Поле скрыто по условию",
    },
  ],
  readonly: [
    {
      name: "message",
      label: "Сообщение об ошибке",
      type: "text",
      placeholder: "Поле недоступно для редактирования",
    },
    {
      name: "help",
      label: "Подсказка",
      type: "text",
      placeholder: "Задано системой",
    },
  ],
  allowed: [
    {
      name: "expression",
      label: "Выражение допустимых значений (RQL)",
      type: "rql" as const,
      placeholder:
        "SELECT @user.id FROM 'users.example.com' @users @user WHERE @user.isActive = true",
      help: "Список допустимых значений. Можно оставить пустым — тогда будет использоваться constraint.",
    },
    {
      name: "constraint",
      label: "Ограничение (RQL)",
      type: "rql" as const,
      placeholder:
        "responsible IN SELECT(@user.id, FROM('users.example.com', @users, @user), WHERE(eq(@user.isActive, true)))",
      help: "Условие, которому должно удовлетворять значение атрибута.",
    },
    {
      name: "message",
      label: "Сообщение об ошибке",
      type: "text" as const,
      placeholder: "Можно выбрать только активных пользователей",
    },
    {
      name: "help",
      label: "Подсказка",
      type: "text" as const,
      placeholder: "Выберите активного пользователя",
    },
  ],
};

/* ------------------------------------------------------------------ */
/*                            Валидация                                 */
/* ------------------------------------------------------------------ */

function validateBase(
  values: Record<string, unknown>,
): Record<string, string> | null {
  const id = String(values.id ?? "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
    return { id: "Только латиница, цифры и _, начинается с буквы" };
  }
  if (!String(values.entityId ?? "").trim()) {
    return { entityId: "Укажите сущность" };
  }
  if (!String(values.attributeId ?? "").trim()) {
    return { attributeId: "Укажите атрибут" };
  }
  return null;
}

function validateAllowed(
  values: Record<string, unknown>,
): Record<string, string> | null {
  const base = validateBase(values);
  if (base) return base;
  const expr = String(values.expression ?? "").trim();
  const constraint = String(values.constraint ?? "").trim();
  if (!expr && !constraint) {
    return {
      expression: "Заполните хотя бы одно поле: выражение или ограничение",
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*                       Вспомогательный билдер                         */
/* ------------------------------------------------------------------ */

function buildRuleYaml(
  values: Record<string, unknown>,
  effect: "required" | "hidden" | "allowed" | "readonly",
): string {
  const id = String(values.id ?? "").trim();
  const name = String(values.name ?? "").trim();
  const description = String(values.description ?? "").trim();
  const entityId = String(values.entityId ?? "").trim();
  const attributeId = String(values.attributeId ?? "").trim();
  const condition = String(values.condition ?? "").trim();
  const message = String(values.message ?? "").trim();
  const help = String(values.help ?? "").trim();
  const expression = String(values.expression ?? "").trim();
  const constraint = String(values.constraint ?? "").trim();

  const lines: string[] = [];
  lines.push("dataRules:");
  lines.push(`  - id: ${id}`);
  if (name) lines.push(`    name: ${name}`);
  if (description) lines.push(`    description: ${description}`);
  lines.push(`    target: entity`);
  lines.push(`    entity: ${entityId}`);

  // условие
  if (condition) {
    // многострочный RQL — используем YAML block-scalar с тегом !rql
    if (condition.includes("\n") || condition.startsWith("@")) {
      lines.push(`    condition: !rql |`);
      for (const l of condition.split("\n")) {
        lines.push(`      ${l}`);
      }
    } else {
      lines.push(`    condition: !rql ${condition}`);
    }
  } else {
    lines.push(`    condition: true`);
  }

  if (message && effect !== "allowed") {
    lines.push(`    message: "${message}"`);
  }

  if (help && effect !== "hidden") {
    lines.push(`    help: "${help}"`);
  }

  lines.push(`    rule:`);
  lines.push(`      effect: ${effect}`);

  if (effect === "allowed") {
    lines.push(`      attributes:`);
    lines.push(`        - attribute: ${attributeId}`);
    if (constraint) {
      if (constraint.includes("\n")) {
        lines.push(`          constraint: !rql |`);
        for (const l of constraint.split("\n")) {
          lines.push(`            ${l}`);
        }
      } else {
        lines.push(`          constraint: !rql ${constraint}`);
      }
    }
    if (expression) {
      if (expression.includes("\n")) {
        lines.push(`          expression: !rql |`);
        for (const l of expression.split("\n")) {
          lines.push(`            ${l}`);
        }
      } else {
        lines.push(`          expression: !rql ${expression}`);
      }
    }
    if (message) {
      lines.push(`          message: "${message}"`);
    }
    if (help) {
      lines.push(`          help: "${help}"`);
    }
  } else {
    lines.push(`      attributes:`);
    lines.push(`        - attribute: ${attributeId}`);
    if (message) {
      lines.push(`          message: "${message}"`);
    }
    if (help) {
      lines.push(`          help: "${help}"`);
    }
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*                          Регистрация визардов                        */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "rule.required",
  title: "Правило данных: обязательность",
  description: "Делает атрибут обязательным при выполнении условия",
  category: "rule",
  command: "rule.create.required",

  steps: [
    {
      id: "main",
      title: "Параметры правила",
      fields: [...commonTopFields, ...effectSpecificFields.required],
      validate: validateBase,
    },
  ],

  generate: (values) => {
    const entityId = String(values.entityId ?? "").trim();
    const attributeId = String(values.attributeId ?? "").trim();
    return {
      yaml: buildRuleYaml(values, "required"),
      mergeStrategy: "merge",
      summary: `Атрибут «${attributeId}» станет обязательным в сущности «${entityId}» при выполнении условия`,
    };
  },
});

wizardRegistry.register({
  id: "rule.hidden",
  title: "Правило данных: скрытие",
  description: "Скрывает атрибут при выполнении условия",
  category: "rule",
  command: "rule.create.hidden",

  steps: [
    {
      id: "main",
      title: "Параметры правила",
      fields: [...commonTopFields, ...effectSpecificFields.hidden],
      validate: validateBase,
    },
  ],

  generate: (values) => {
    const entityId = String(values.entityId ?? "").trim();
    const attributeId = String(values.attributeId ?? "").trim();
    return {
      yaml: buildRuleYaml(values, "hidden"),
      mergeStrategy: "merge",
      summary: `Атрибут «${attributeId}» будет скрыт в сущности «${entityId}» при выполнении условия`,
    };
  },
});

wizardRegistry.register({
  id: "rule.allowed",
  title: "Правило данных: допустимые значения",
  description: "Ограничивает выбор значений атрибута",
  category: "rule",
  command: "rule.create.allowed",

  steps: [
    {
      id: "main",
      title: "Параметры правила",
      fields: [...commonTopFields, ...effectSpecificFields.allowed],
      validate: validateAllowed,
    },
  ],

  generate: (values) => {
    const entityId = String(values.entityId ?? "").trim();
    const attributeId = String(values.attributeId ?? "").trim();
    return {
      yaml: buildRuleYaml(values, "allowed"),
      mergeStrategy: "merge",
      summary: `Для атрибута «${attributeId}» в сущности «${entityId}» будет ограничен список значений`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                      Правило: default                               */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: 'rule.default',
  title: 'Правило данных: значение по умолчанию',
  description: 'Подставляет значение атрибута, если пользователь не задал',
  category: 'rule',
  command: 'rule.create.default',

  steps: [
    {
      id: 'main',
      title: 'Параметры правила',
      fields: [
        {
          name: 'id',
          label: 'ID правила',
          type: 'text',
          required: true,
          placeholder: 'default_responsible',
        },
        {
          name: 'name',
          label: 'Название',
          type: 'text',
          required: true,
          placeholder: 'Ответственный по умолчанию',
        },
        {
          name: 'entityId',
          label: 'Сущность',
          type: 'entity-ref',
          required: true,
        },
        {
          name: 'attributeId',
          label: 'Атрибут',
          type: 'attribute-ref',
          required: true,
        },
        {
          name: 'condition',
          label: 'Условие (RQL)',
          type: 'rql',
          placeholder: '@doc.incidentStatus IS NULL',
          help: 'Пустое или true — правило применяется всегда',
        },
        {
          name: 'value',
          label: 'Значение',
          type: 'text',
          placeholder: 'Новое значение',
          help: 'Для строк — строка, для чисел — число, для bool — true/false',
        },
        {
          name: 'expression',
          label: 'Или RQL-выражение',
          type: 'rql',
          placeholder: "SELECT @CurrentUser.username",
          help: 'Если задано — используется вместо value',
        },
        {
          name: 'help',
          label: 'Подсказка',
          type: 'text',
          placeholder: 'Значение подставляется автоматически',
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? '').trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: 'Только латиница, цифры, _' };
        }
        const hasValue =
          values.value !== undefined && String(values.value).length > 0;
        const hasExpr =
          values.expression !== undefined &&
          String(values.expression).length > 0;
        if (!hasValue && !hasExpr) {
          return { value: 'Укажите value или expression' };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? '').trim();
    const name = String(values.name ?? '').trim();
    const entityId = String(values.entityId ?? '').trim();
    const attributeId = String(values.attributeId ?? '').trim();
    const condition = String(values.condition ?? '').trim();
    const value = values.value;
    const expression = String(values.expression ?? '').trim();
    const help = String(values.help ?? '').trim();

    const lines: string[] = [];
    lines.push('dataRules:');
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    lines.push(`    target: entity`);
    lines.push(`    entity: ${entityId}`);
    if (condition) {
      if (condition.startsWith('@') || condition.includes('\n')) {
        lines.push(`    condition: !rql |`);
        for (const l of condition.split('\n')) lines.push(`      ${l}`);
      } else {
        lines.push(`    condition: !rql ${condition}`);
      }
    } else {
      lines.push(`    condition: true`);
    }
    if (help) lines.push(`    help: "${help}"`);
    lines.push(`    rule:`);
    lines.push(`      effect: default`);
    lines.push(`      attributes:`);
    lines.push(`        - attribute: ${attributeId}`);
    if (expression) {
      if (expression.startsWith('@') || expression.includes('\n')) {
        lines.push(`          expression: !rql |`);
        for (const l of expression.split('\n')) lines.push(`            ${l}`);
      } else {
        lines.push(`          expression: !rql ${expression}`);
      }
    } else {
      // value — приведение типов
      const valueStr = String(value ?? '');
      const isNumber = /^-?\d+(\.\d+)?$/.test(valueStr);
      const isBool = valueStr === 'true' || valueStr === 'false';
      if (isNumber || isBool) {
        lines.push(`          value: ${valueStr}`);
      } else {
        lines.push(`          value: "${valueStr.replace(/"/g, '\\"')}"`);
      }
    }

    return {
      yaml: lines.join('\n'),
      mergeStrategy: 'merge',
      summary: `Значение по умолчанию для «${attributeId}»`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                      Правило: readonly                              */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: 'rule.readonly',
  title: 'Правило данных: только для чтения',
  description: 'Запрещает редактирование атрибута при выполнении условия',
  category: 'rule',
  command: 'rule.create.readonly',

  steps: [
    {
      id: 'main',
      title: 'Параметры правила',
      fields: [...commonTopFields, ...effectSpecificFields.hidden],
      validate: validateBase,
    },
  ],

  generate: (values) => {
    const entityId = String(values.entityId ?? '').trim();
    const attributeId = String(values.attributeId ?? '').trim();
    return {
      yaml: buildRuleYaml(values, 'readonly'),
      mergeStrategy: 'merge',
      summary: `Атрибут «${attributeId}» — только чтение в сущности «${entityId}»`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                    Правило для связи                                */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: 'rule.linkage',
  title: 'Правило данных: связь',
  description: 'Ограничивает операции со связью или её атрибутами',
  category: 'rule',
  command: 'rule.create.linkage',

  steps: [
    {
      id: 'main',
      title: 'Параметры правила',
      fields: [
        {
          name: 'id',
          label: 'ID правила',
          type: 'text',
          required: true,
          placeholder: 'required_incident_link',
        },
        {
          name: 'name',
          label: 'Название',
          type: 'text',
          required: true,
        },
        {
          name: 'linkage',
          label: 'Связь',
          type: 'select',
          dynamicOptions: 'existingLinkages',
          required: true,
        },
        {
          name: 'condition',
          label: 'Условие (RQL)',
          type: 'rql',
          placeholder: '@doc.incidentStatus = "REGISTERED"',
        },
        {
          name: 'effect',
          label: 'Эффект',
          type: 'select',
          defaultValue: 'required',
          options: [
            { value: 'required', label: 'Обязательная связь' },
            { value: 'readonly', label: 'Только для чтения' },
            { value: 'hidden', label: 'Скрыть связь' },
          ],
        },
        {
          name: 'side',
          label: 'Сторона',
          type: 'select',
          defaultValue: '1',
          options: [
            { value: '1', label: 'Сторона 1' },
            { value: '2', label: 'Сторона 2' },
          ],
          help: 'Для симметричной направленной связи',
        },
        {
          name: 'message',
          label: 'Сообщение об ошибке',
          type: 'text',
        },
        {
          name: 'help',
          label: 'Подсказка',
          type: 'text',
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? '').trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: 'Только латиница, цифры, _' };
        }
        if (!values.linkage) return { linkage: 'Выберите связь' };
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? '').trim();
    const name = String(values.name ?? '').trim();
    const linkageId = String(values.linkage ?? '').trim();
    const condition = String(values.condition ?? '').trim();
    const effect = String(values.effect ?? 'required');
    const side = String(values.side ?? '1');
    const message = String(values.message ?? '').trim();
    const help = String(values.help ?? '').trim();

    const lines: string[] = [];
    lines.push('dataRules:');
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    lines.push(`    target: linkage`);
    lines.push(`    linkage: ${linkageId}`);
    if (condition) {
      if (condition.startsWith('@') || condition.includes('\n')) {
        lines.push(`    condition: !rql |`);
        for (const l of condition.split('\n')) lines.push(`      ${l}`);
      } else {
        lines.push(`    condition: !rql ${condition}`);
      }
    } else {
      lines.push(`    condition: true`);
    }
    if (message && effect !== 'default') {
      lines.push(`    message: "${message}"`);
    }
    if (help && effect !== 'hidden') {
      lines.push(`    help: "${help}"`);
    }
    lines.push(`    rule:`);
    lines.push(`      effect: ${effect}`);
    lines.push(`      linkages:`);
    lines.push(`        - linkage: ${linkageId}`);
    lines.push(`          side: ${side}`);

    return {
      yaml: lines.join('\n'),
      mergeStrategy: 'merge',
      summary: `Правило «${effect}» для связи «${linkageId}»`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                    Правило для таблицы/массива                      */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: 'rule.nested',
  title: 'Правило данных: элементы таблицы/массива',
  description: 'Ограничивает операции над колонками таблицы или элементами массива',
  category: 'rule',
  command: 'rule.create.nested',

  steps: [
    {
      id: 'main',
      title: 'Параметры правила',
      fields: [
        {
          name: 'id',
          label: 'ID правила',
          type: 'text',
          required: true,
          placeholder: 'required_table_columns',
        },
        {
          name: 'name',
          label: 'Название',
          type: 'text',
          required: true,
        },
        {
          name: 'entityId',
          label: 'Сущность',
          type: 'entity-ref',
          required: true,
        },
        {
          name: 'attributeId',
          label: 'Атрибут типа Table или Array',
          type: 'attribute-ref',
          required: true,
          help: 'ID атрибута-таблицы или массива внутри сущности',
        },
        {
          name: 'nestedType',
          label: 'Тип',
          type: 'select',
          defaultValue: 'table',
          options: [
            { value: 'table', label: 'Таблица (колонки)' },
            { value: 'array', label: 'Массив (элементы)' },
          ],
        },
        {
          name: 'targets',
          label: 'Элементы',
          type: 'text',
          placeholder: 'col1, col2 или *',
          required: true,
          help: 'Для массива: 0, 1, 2 или *. Для таблицы: ID колонок через запятую',
        },
        {
          name: 'condition',
          label: 'Условие (RQL)',
          type: 'rql',
          placeholder: '@row.status = "DRAFT"',
          help: 'Для условия по конкретной строке используйте @row',
        },
        {
          name: 'effect',
          label: 'Эффект',
          type: 'select',
          defaultValue: 'required',
          options: [
            { value: 'required', label: 'Обязательность' },
            { value: 'readonly', label: 'Только для чтения' },
            { value: 'hidden', label: 'Скрытие' },
          ],
        },
        {
          name: 'message',
          label: 'Сообщение об ошибке',
          type: 'text',
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? '').trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: 'Только латиница, цифры, _' };
        }
        if (!values.attributeId) {
          return { attributeId: 'Укажите атрибут' };
        }
        if (!values.targets) {
          return { targets: 'Укажите колонки или элементы' };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? '').trim();
    const name = String(values.name ?? '').trim();
    const entityId = String(values.entityId ?? '').trim();
    const attributeId = String(values.attributeId ?? '').trim();
    const nestedType = String(values.nestedType ?? 'table');
    const targetsRaw = String(values.targets ?? '').trim();
    const condition = String(values.condition ?? '').trim();
    const effect = String(values.effect ?? 'required');
    const message = String(values.message ?? '').trim();

    const lines: string[] = [];
    lines.push('dataRules:');
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    lines.push(`    target: entityAttribute`);
    lines.push(`    entity: ${entityId}`);
    lines.push(`    attribute: ${attributeId}`);
    if (condition) {
      if (condition.startsWith('@') || condition.includes('\n')) {
        lines.push(`    condition: !rql |`);
        for (const l of condition.split('\n')) lines.push(`      ${l}`);
      } else {
        lines.push(`    condition: !rql ${condition}`);
      }
    } else {
      lines.push(`    condition: true`);
    }
    lines.push(`    rule:`);
    lines.push(`      effect: ${effect}`);
    lines.push(`      nested:`);
    lines.push(`        type: ${nestedType}`);

    if (nestedType === 'table') {
      lines.push(`        attributes:`);
      const cols = targetsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const c of cols) {
        lines.push(`          - attribute: ${c}`);
        if (message) lines.push(`            message: "${message}"`);
      }
    } else {
      lines.push(`        items:`);
      const items = targetsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const it of items) {
        lines.push(`          - item: ${it === '*' ? '"*"' : it}`);
        if (message) lines.push(`            message: "${message}"`);
      }
    }

    return {
      yaml: lines.join('\n'),
      mergeStrategy: 'merge',
      summary: `Правило «${effect}» для ${nestedType}`,
    };
  },
});