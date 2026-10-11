export type MixinPresetCategory =
  | "audit"
  | "collaboration"
  | "history"
  | "security"
  | "info"
  | "links"
  | "workflow"
  | "integration";

export type MixinPresetComplexity = "simple" | "medium" | "advanced";

export type MixinPresetParameterType = "text" | "entity-ref" | "boolean";

export type MixinPresetParameter = {
  name: string;
  label: string;
  type: MixinPresetParameterType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  defaultValue?: string;
};

export type MixinPreset = {
  id: string;
  name: string;
  description: string;
  category: MixinPresetCategory;
  complexity: MixinPresetComplexity;
  tags?: string[];
  parameters: MixinPresetParameter[];
  generate: (params: Record<string, string>) => string;
};

export const MIXIN_PRESET_CATEGORIES: Record<MixinPresetCategory, string> = {
  audit: "Аудит",
  collaboration: "Коллаборация",
  history: "История",
  security: "Безопасность",
  info: "Информационные блоки",
  links: "Связанные объекты",
  workflow: "Рабочие процессы",
  integration: "Интеграция",
};

/* ------------------------------------------------------------------ */
/*                       Общие параметры                               */
/* ------------------------------------------------------------------ */

function baseParams(): MixinPresetParameter[] {
  return [
    {
      name: "targetEntity",
      label: "Целевая сущность",
      type: "entity-ref",
      required: true,
      help: "Сущность, в представления которой встраивается примесь",
    },
    {
      name: "targetTab",
      label: "Целевая вкладка",
      type: "text",
      required: true,
      placeholder: "tabs_infoIncident",
      help: "Существующая вкладка в entity view целевой сущности",
    },
    {
      name: "prefix",
      label: "Префикс id",
      type: "text",
      required: true,
      placeholder: "incident_audit",
      help: "Латиница, нижний регистр, подчёркивания",
    },
  ];
}

/**
 * Простой блок-миксин с одним виджетом.
 */
function simpleBlockMixin(opts: {
  label: string;
  widgetType: string;
  widgetExtra?: (p: string) => string[];
  tabLabel?: string;
}): MixinPreset["generate"] {
  return ({ targetEntity, targetTab, prefix }) => {
    const p = prefix;
    const widgetId = `${p}_widget`;
    const blockId = `${p}_block`;
    const tabId = `${p}_tab`;
    const tabLabel = opts.tabLabel ?? opts.label;

    const widgetLines: string[] = [
      `  - id: ${widgetId}`,
      `    type: ${opts.widgetType}`,
    ];
    if (opts.widgetExtra) {
      widgetLines.push(...opts.widgetExtra(p));
    }
    widgetLines.push(`    label: ${opts.label}`);

    return `widgets:
${widgetLines.join("\n")}

groups:
  - id: ${blockId}
    type: block
    layout:
      direction: column
    components:
      - widget: ${widgetId}
  - id: ${tabId}
    type: tab
    label: ${tabLabel}
    components:
      - block: ${blockId}

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
${widgetLines.join("\n")}
    groups:
      - id: ${blockId}
        type: block
        layout:
          direction: column
        components:
          - widget: ${widgetId}
      - id: ${tabId}
        type: tab
        label: ${tabLabel}
        components:
          - block: ${blockId}

mixins:
  - id: ${p}_mixin
    name: ${opts.label}
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${blockId}
`;
  };
}

/* ------------------------------------------------------------------ */
/*                       Библиотека                                    */
/* ------------------------------------------------------------------ */

export const MIXIN_PRESETS: MixinPreset[] = [
  /* ================== AUDIT ================== */

  {
    id: "audit_history",
    name: "История изменений",
    description:
      "Встраивает вкладку с историей изменений объекта через event storage",
    category: "audit",
    complexity: "simple",
    tags: ["audit", "history"],
    parameters: baseParams(),
    generate: ({ targetEntity, targetTab, prefix }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_historyWidget
    type: history
    eventStorageId: default
    label: История

groups:
  - id: ${p}_auditBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_historyWidget
  - id: ${p}_auditTab
    type: tab
    label: Аудит
    components:
      - block: ${p}_auditBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_historyWidget
        type: history
        eventStorageId: default
    groups:
      - id: ${p}_auditBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_historyWidget
      - id: ${p}_auditTab
        type: tab
        label: Аудит
        components:
          - block: ${p}_auditBlock

mixins:
  - id: ${p}_mixin
    name: История изменений
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_auditBlock
`;
    },
  },

  {
    id: "audit_trail",
    name: "Журнал аудита (расширенный)",
    description:
      "Комбинирует историю изменений и историю запусков в одной вкладке",
    category: "audit",
    complexity: "medium",
    tags: ["audit", "trail", "runs"],
    parameters: baseParams(),
    generate: ({ targetEntity, targetTab, prefix }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_historyWidget
    type: history
    eventStorageId: default
    label: Изменения
  - id: ${p}_runsWidget
    type: runs_history
    label: Запуски сценариев

groups:
  - id: ${p}_auditBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_historyWidget
      - widget: ${p}_runsWidget
  - id: ${p}_auditTab
    type: tab
    label: Журнал аудита
    components:
      - block: ${p}_auditBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_historyWidget
        type: history
        eventStorageId: default
      - id: ${p}_runsWidget
        type: runs_history
    groups:
      - id: ${p}_auditBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_historyWidget
          - widget: ${p}_runsWidget
      - id: ${p}_auditTab
        type: tab
        label: Журнал аудита
        components:
          - block: ${p}_auditBlock

mixins:
  - id: ${p}_mixin
    name: Журнал аудита
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_auditBlock
`;
    },
  },

  /* ================== COLLABORATION ================== */

  {
    id: "comments",
    name: "Комментарии",
    description: "Встраивает вкладку с комментариями",
    category: "collaboration",
    complexity: "simple",
    tags: ["comments", "collaboration"],
    parameters: baseParams(),
    generate: simpleBlockMixin({
      label: "Комментарии",
      widgetType: "comments",
    }),
  },

  {
    id: "conversation",
    name: "Переписки",
    description: "Встраивает вкладку с переписками (email, внутренние)",
    category: "collaboration",
    complexity: "medium",
    tags: ["conversation", "email", "messages"],
    parameters: [
      ...baseParams(),
      {
        name: "linkage",
        label: "Связь с сущностью Message",
        type: "text",
        required: true,
        placeholder: "Incident_Message_link",
        help: "Связь 1_N между целевой сущностью и Message",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, linkage }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_conversationWidget
    type: conversation
    linkage: ${linkage}
    conversationTransports:
      - uriSchema: int
      - uriSchema: mail-to
    label: Переписки

groups:
  - id: ${p}_convBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_conversationWidget
  - id: ${p}_convTab
    type: tab
    label: Переписки
    components:
      - block: ${p}_convBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_conversationWidget
        type: conversation
        linkage: ${linkage}
        conversationTransports:
          - uriSchema: int
          - uriSchema: mail-to
    groups:
      - id: ${p}_convBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_conversationWidget
      - id: ${p}_convTab
        type: tab
        label: Переписки
        components:
          - block: ${p}_convBlock

mixins:
  - id: ${p}_mixin
    name: Переписки
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_convBlock
`;
    },
  },

  /* ================== HISTORY ================== */

  {
    id: "runs_history",
    name: "История запусков сценариев",
    description: "Встраивает вкладку с историей запусков сценариев и скриптов",
    category: "history",
    complexity: "simple",
    tags: ["runs", "history", "scenarios"],
    parameters: baseParams(),
    generate: simpleBlockMixin({
      label: "История запусков",
      widgetType: "runs_history",
      tabLabel: "Запуски",
    }),
  },

  {
    id: "workflow_history",
    name: "История рабочего процесса",
    description:
      "История переходов статусов рабочего процесса (нужен атрибут workflow)",
    category: "workflow",
    complexity: "medium",
    tags: ["workflow", "status", "history"],
    parameters: [
      ...baseParams(),
      {
        name: "workflowAttr",
        label: "Атрибут рабочего процесса",
        type: "text",
        required: true,
        placeholder: "incidentStatus",
        help: "ID атрибута сущности с типом Workflow",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, workflowAttr }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_statusWidget
    type: attribute
    attribute: ${workflowAttr}
    label: Текущий статус
  - id: ${p}_historyWidget
    type: history
    eventStorageId: default
    label: Переходы

groups:
  - id: ${p}_wfBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_statusWidget
      - widget: ${p}_historyWidget
  - id: ${p}_wfTab
    type: tab
    label: Процесс
    components:
      - block: ${p}_wfBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_statusWidget
        type: attribute
        attribute: ${workflowAttr}
      - id: ${p}_historyWidget
        type: history
        eventStorageId: default
    groups:
      - id: ${p}_wfBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_statusWidget
          - widget: ${p}_historyWidget
      - id: ${p}_wfTab
        type: tab
        label: Процесс
        components:
          - block: ${p}_wfBlock

mixins:
  - id: ${p}_mixin
    name: Рабочий процесс
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_wfBlock
`;
    },
  },

  /* ================== SECURITY ================== */

  {
    id: "ioc_block",
    name: "Блок IOC",
    description:
      "Встраивает вкладку с индикаторами компрометации, связанными с объектом",
    category: "security",
    complexity: "medium",
    tags: ["ioc", "threat", "security"],
    parameters: [
      ...baseParams(),
      {
        name: "iocLinkage",
        label: "Связь с IOC",
        type: "text",
        required: true,
        placeholder: "Incident_Ioc",
        help: "ID существующей связи с сущностью IOC",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, iocLinkage }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_iocWidget
    type: linkage
    linkage: ${iocLinkage}
    label: Индикаторы
    side: 2
    control:
      type: table
      addLinksView: lists_iocs
      columns:
        - id: type
          attribute: iocType
        - id: value
          attribute: iocValue
        - id: confidence
          attribute: iocConfidence

groups:
  - id: ${p}_iocBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_iocWidget
  - id: ${p}_iocTab
    type: tab
    label: Индикаторы
    components:
      - block: ${p}_iocBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_iocWidget
        type: linkage
        linkage: ${iocLinkage}
        side: 2
        control:
          type: table
          addLinksView: lists_iocs
    groups:
      - id: ${p}_iocBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_iocWidget
      - id: ${p}_iocTab
        type: tab
        label: Индикаторы
        components:
          - block: ${p}_iocBlock

mixins:
  - id: ${p}_mixin
    name: Индикаторы
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_iocBlock
`;
    },
  },

  {
    id: "mitre_block",
    name: "MITRE ATT&CK",
    description: "Встраивает вкладку с привязкой к техникам MITRE",
    category: "security",
    complexity: "advanced",
    tags: ["mitre", "attack", "security"],
    parameters: [
      ...baseParams(),
      {
        name: "mitreAttr",
        label: "Атрибут MITRE",
        type: "text",
        placeholder: "mitreTechniques",
        help: "ID атрибута-массива со ссылками на MITRE",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, mitreAttr }) => {
      const p = prefix;
      const attrLine = mitreAttr ? `    attribute: ${mitreAttr}\n` : "";
      return `widgets:
  - id: ${p}_mitreWidget
    type: attribute
${attrLine}    label: Техники MITRE

groups:
  - id: ${p}_mitreBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_mitreWidget
  - id: ${p}_mitreTab
    type: tab
    label: MITRE ATT&CK
    components:
      - block: ${p}_mitreBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_mitreWidget
        type: attribute
${attrLine}
    groups:
      - id: ${p}_mitreBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_mitreWidget
      - id: ${p}_mitreTab
        type: tab
        label: MITRE ATT&CK
        components:
          - block: ${p}_mitreBlock

mixins:
  - id: ${p}_mixin
    name: MITRE ATT&CK
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_mitreBlock
`;
    },
  },

  {
    id: "vulnerability_info",
    name: "Информация об уязвимостях",
    description: "Встраивает вкладку со связанными уязвимостями",
    category: "security",
    complexity: "medium",
    tags: ["vulnerability", "cve", "security"],
    parameters: [
      ...baseParams(),
      {
        name: "vulnLinkage",
        label: "Связь с уязвимостями",
        type: "text",
        required: true,
        placeholder: "Asset_Vulnerability",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, vulnLinkage }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_vulnWidget
    type: linkage
    linkage: ${vulnLinkage}
    label: Уязвимости
    side: 2
    control:
      type: table
      addLinksView: lists_vulnerabilities
      columns:
        - id: cve
          attribute: cveId
        - id: cvss
          attribute: cvssScore
        - id: severity
          attribute: severity

groups:
  - id: ${p}_vulnBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_vulnWidget
  - id: ${p}_vulnTab
    type: tab
    label: Уязвимости
    components:
      - block: ${p}_vulnBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_vulnWidget
        type: linkage
        linkage: ${vulnLinkage}
        side: 2
        control:
          type: table
          addLinksView: lists_vulnerabilities
    groups:
      - id: ${p}_vulnBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_vulnWidget
      - id: ${p}_vulnTab
        type: tab
        label: Уязвимости
        components:
          - block: ${p}_vulnBlock

mixins:
  - id: ${p}_mixin
    name: Уязвимости
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_vulnBlock
`;
    },
  },

  /* ================== INFO ================== */

  {
    id: "attachments",
    name: "Вложения",
    description: "Встраивает вкладку с прикреплёнными файлами",
    category: "info",
    complexity: "simple",
    tags: ["attachments", "files"],
    parameters: [
      ...baseParams(),
      {
        name: "attachAttr",
        label: "Атрибут вложений",
        type: "text",
        required: true,
        placeholder: "documents",
        help: "ID атрибута типа Array или Attachment",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, attachAttr }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_attachWidget
    type: attribute
    attribute: ${attachAttr}
    label: Документы

groups:
  - id: ${p}_attachBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_attachWidget
  - id: ${p}_attachTab
    type: tab
    label: Вложения
    components:
      - block: ${p}_attachBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_attachWidget
        type: attribute
        attribute: ${attachAttr}
    groups:
      - id: ${p}_attachBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_attachWidget
      - id: ${p}_attachTab
        type: tab
        label: Вложения
        components:
          - block: ${p}_attachBlock

mixins:
  - id: ${p}_mixin
    name: Вложения
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_attachBlock
`;
    },
  },

  {
    id: "tags_block",
    name: "Блок тегов",
    description: "Встраивает вкладку со всеми тегами/метками объекта",
    category: "info",
    complexity: "simple",
    tags: ["tags", "labels"],
    parameters: [
      ...baseParams(),
      {
        name: "tagsAttr",
        label: "Атрибут тегов",
        type: "text",
        required: true,
        placeholder: "objectTags",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, tagsAttr }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_tagsWidget
    type: attribute
    attribute: ${tagsAttr}
    label: Теги

groups:
  - id: ${p}_tagsBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_tagsWidget
  - id: ${p}_tagsTab
    type: tab
    label: Теги
    components:
      - block: ${p}_tagsBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_tagsWidget
        type: attribute
        attribute: ${tagsAttr}
    groups:
      - id: ${p}_tagsBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_tagsWidget
      - id: ${p}_tagsTab
        type: tab
        label: Теги
        components:
          - block: ${p}_tagsBlock

mixins:
  - id: ${p}_mixin
    name: Теги
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_tagsBlock
`;
    },
  },

  {
    id: "external_links",
    name: "Внешние ссылки",
    description: "Встраивает вкладку с URL-ссылками на внешние ресурсы",
    category: "info",
    complexity: "simple",
    tags: ["url", "links", "external"],
    parameters: [
      ...baseParams(),
      {
        name: "urlAttr",
        label: "Атрибут URL",
        type: "text",
        required: true,
        placeholder: "externalUrl",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, urlAttr }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_urlWidget
    type: attribute
    attribute: ${urlAttr}
    label: Внешняя ссылка

groups:
  - id: ${p}_urlBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_urlWidget
  - id: ${p}_urlTab
    type: tab
    label: Внешние ссылки
    components:
      - block: ${p}_urlBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_urlWidget
        type: attribute
        attribute: ${urlAttr}
    groups:
      - id: ${p}_urlBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_urlWidget
      - id: ${p}_urlTab
        type: tab
        label: Внешние ссылки
        components:
          - block: ${p}_urlBlock

mixins:
  - id: ${p}_mixin
    name: Внешние ссылки
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_urlBlock
`;
    },
  },

  /* ================== LINKS ================== */

  {
    id: "related_objects",
    name: "Связанные объекты (группировка)",
    description:
      "Встраивает вкладку с группировкой связанных объектов по атрибутам",
    category: "links",
    complexity: "advanced",
    tags: ["related", "grouping", "linked"],
    parameters: [
      ...baseParams(),
      {
        name: "linkagesRaw",
        label: "Связи (через запятую)",
        type: "text",
        required: true,
        placeholder: "Incident_Ioc, Incident_Asset",
        help: "ID существующих связей через запятую",
      },
      {
        name: "groupingAttr",
        label: "Атрибут группировки",
        type: "text",
        required: true,
        placeholder: "iocType",
        help: "Атрибут связанной сущности для группировки",
      },
    ],
    generate: ({
      targetEntity,
      targetTab,
      prefix,
      linkagesRaw,
      groupingAttr,
    }) => {
      const p = prefix;
      const linkages = linkagesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const linkageLines = linkages
        .map((id) => `    - linkage: ${id}\n      side: 2`)
        .join("\n");

      return `widgets:
  - id: ${p}_groupsWidget
    type: linked_objects_groups
    linkages:
${linkageLines}
    groupingBy:
      - attribute: ${groupingAttr}
    control:
      type: table
      columns:
        - id: ${groupingAttr}
          attribute: ${groupingAttr}
        - id: totalCount
          attribute: totalCount
    label: Связанные объекты

groups:
  - id: ${p}_relBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_groupsWidget
  - id: ${p}_relTab
    type: tab
    label: Связанные
    components:
      - block: ${p}_relBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_groupsWidget
        type: linked_objects_groups
        linkages:
${linkageLines}
        groupingBy:
          - attribute: ${groupingAttr}
        control:
          type: table
          columns:
            - id: ${groupingAttr}
              attribute: ${groupingAttr}
            - id: totalCount
              attribute: totalCount
    groups:
      - id: ${p}_relBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_groupsWidget
      - id: ${p}_relTab
        type: tab
        label: Связанные
        components:
          - block: ${p}_relBlock

mixins:
  - id: ${p}_mixin
    name: Связанные объекты
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_relBlock
`;
    },
  },

  {
    id: "related_incidents",
    name: "Связанные инциденты",
    description: "Встраивает вкладку со связанными инцидентами",
    category: "links",
    complexity: "simple",
    tags: ["incidents", "related"],
    parameters: [
      ...baseParams(),
      {
        name: "linkage",
        label: "Связь с инцидентами",
        type: "text",
        required: true,
        placeholder: "Incident_Asset",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, linkage }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_incWidget
    type: linkage
    linkage: ${linkage}
    label: Инциденты
    side: 2

groups:
  - id: ${p}_incBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_incWidget
  - id: ${p}_incTab
    type: tab
    label: Инциденты
    components:
      - block: ${p}_incBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_incWidget
        type: linkage
        linkage: ${linkage}
        side: 2
    groups:
      - id: ${p}_incBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_incWidget
      - id: ${p}_incTab
        type: tab
        label: Инциденты
        components:
          - block: ${p}_incBlock

mixins:
  - id: ${p}_mixin
    name: Инциденты
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_incBlock
`;
    },
  },

  {
    id: "related_assets",
    name: "Связанные активы",
    description: "Встраивает вкладку со связанными активами",
    category: "links",
    complexity: "simple",
    tags: ["assets", "related"],
    parameters: [
      ...baseParams(),
      {
        name: "linkage",
        label: "Связь с активами",
        type: "text",
        required: true,
        placeholder: "Asset_Incident",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, linkage }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_assetWidget
    type: linkage
    linkage: ${linkage}
    label: Активы
    side: 2

groups:
  - id: ${p}_assetBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_assetWidget
  - id: ${p}_assetTab
    type: tab
    label: Активы
    components:
      - block: ${p}_assetBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_assetWidget
        type: linkage
        linkage: ${linkage}
        side: 2
    groups:
      - id: ${p}_assetBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_assetWidget
      - id: ${p}_assetTab
        type: tab
        label: Активы
        components:
          - block: ${p}_assetBlock

mixins:
  - id: ${p}_mixin
    name: Активы
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_assetBlock
`;
    },
  },

  {
    id: "related_users",
    name: "Связанные пользователи",
    description: "Встраивает вкладку со связанными пользователями",
    category: "links",
    complexity: "simple",
    tags: ["users", "related"],
    parameters: [
      ...baseParams(),
      {
        name: "linkage",
        label: "Связь с пользователями",
        type: "text",
        required: true,
        placeholder: "User_Incident",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, linkage }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_userWidget
    type: linkage
    linkage: ${linkage}
    label: Пользователи
    side: 2

groups:
  - id: ${p}_userBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_userWidget
  - id: ${p}_userTab
    type: tab
    label: Пользователи
    components:
      - block: ${p}_userBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_userWidget
        type: linkage
        linkage: ${linkage}
        side: 2
    groups:
      - id: ${p}_userBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_userWidget
      - id: ${p}_userTab
        type: tab
        label: Пользователи
        components:
          - block: ${p}_userBlock

mixins:
  - id: ${p}_mixin
    name: Пользователи
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_userBlock
`;
    },
  },

  /* ================== WORKFLOW ================== */

  {
    id: "approvals",
    name: "Согласования",
    description:
      "Встраивает вкладку с историей согласований (через runs_history)",
    category: "workflow",
    complexity: "medium",
    tags: ["approval", "workflow"],
    parameters: baseParams(),
    generate: simpleBlockMixin({
      label: "Согласования",
      widgetType: "runs_history",
    }),
  },

  /* ================== INTEGRATION ================== */

  {
    id: "external_system",
    name: "Ссылка на внешнюю систему",
    description:
      "Встраивает вкладку с идентификаторами объекта во внешних системах",
    category: "integration",
    complexity: "simple",
    tags: ["external", "integration", "ticket"],
    parameters: [
      ...baseParams(),
      {
        name: "externalIdAttr",
        label: "Атрибут внешнего ID",
        type: "text",
        required: true,
        placeholder: "externalTicketId",
      },
      {
        name: "externalUrlAttr",
        label: "Атрибут внешнего URL",
        type: "text",
        placeholder: "externalTicketUrl",
      },
    ],
    generate: ({
      targetEntity,
      targetTab,
      prefix,
      externalIdAttr,
      externalUrlAttr,
    }) => {
      const p = prefix;
      const urlWidgetLine = externalUrlAttr
        ? `  - id: ${p}_extUrlWidget
    type: attribute
    attribute: ${externalUrlAttr}
    label: Ссылка
`
        : "";
      const urlRefLine = externalUrlAttr
        ? `      - widget: ${p}_extUrlWidget
`
        : "";

      return `widgets:
  - id: ${p}_extIdWidget
    type: attribute
    attribute: ${externalIdAttr}
    label: Внешний ID
${urlWidgetLine}
groups:
  - id: ${p}_extBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_extIdWidget
${urlRefLine}
  - id: ${p}_extTab
    type: tab
    label: Интеграция
    components:
      - block: ${p}_extBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_extIdWidget
        type: attribute
        attribute: ${externalIdAttr}
${urlWidgetLine}
    groups:
      - id: ${p}_extBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_extIdWidget
${urlRefLine}
      - id: ${p}_extTab
        type: tab
        label: Интеграция
        components:
          - block: ${p}_extBlock

mixins:
  - id: ${p}_mixin
    name: Интеграция
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_extBlock
`;
    },
  },

  {
    id: "alert_info",
    name: "Информация об алерте",
    description: "Встраивает вкладку со связанными алертами",
    category: "integration",
    complexity: "medium",
    tags: ["alert", "siem"],
    parameters: [
      ...baseParams(),
      {
        name: "alertLinkage",
        label: "Связь с алертами",
        type: "text",
        required: true,
        placeholder: "Incident_Alert",
      },
    ],
    generate: ({ targetEntity, targetTab, prefix, alertLinkage }) => {
      const p = prefix;
      return `widgets:
  - id: ${p}_alertWidget
    type: linkage
    linkage: ${alertLinkage}
    label: Алерты
    side: 2

groups:
  - id: ${p}_alertBlock
    type: block
    layout:
      direction: column
    components:
      - widget: ${p}_alertWidget
  - id: ${p}_alertTab
    type: tab
    label: Алерты
    components:
      - block: ${p}_alertBlock

views:
  - id: ${p}_source
    type: entity
    entity: ${targetEntity}
    isMixin: true
    widgets:
      - id: ${p}_alertWidget
        type: linkage
        linkage: ${alertLinkage}
        side: 2
    groups:
      - id: ${p}_alertBlock
        type: block
        layout:
          direction: column
        components:
          - widget: ${p}_alertWidget
      - id: ${p}_alertTab
        type: tab
        label: Алерты
        components:
          - block: ${p}_alertBlock

mixins:
  - id: ${p}_mixin
    name: Алерты
    type: view
    entity: ${targetEntity}
    useForChild: true
    views:
      - id: ${p}_tabRef
        type: tab
        fromView: ${p}_source
        to:
          tab: ${targetTab}
        change:
          add:
            components:
              - block: ${p}_alertBlock
`;
    },
  },
];
