import { z } from "zod";

/* ------------------------------------------------------------------ */
/*                    Хелперы для проверок                            */
/* ------------------------------------------------------------------ */

/**
 * Проверяет уникальность id в массиве объектов.
 * Возвращает refinement для `.superRefine()`.
 */
function uniqueById(label = "элемент") {
  return (items: Array<{ id?: string }>, ctx: z.RefinementCtx) => {
    const seen = new Map<string, number>();
    items.forEach((item, idx) => {
      const id = item?.id;
      if (typeof id !== "string" || !id) return;
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Дубликат id «${id}» в ${label}ах (первое вхождение — элемент ${
            seen.get(id)! + 1
          })`,
          path: [idx, "id"],
        });
      } else {
        seen.set(id, idx);
      }
    });
  };
}

/**
 * Системные атрибуты. Их нельзя использовать в схеме как id пользовательских атрибутов.
 */
const SYSTEM_ATTR_IDS = new Set([
  "id",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "domainId",
  "entityId",
  "entityName",
  "label",
  "linkageId",
  "organizationId",
  "tenantId",
  "version",
  "totalCount",
  "side1",
  "side2",
]);

/**
 * Проверяет, что в атрибутах нет системных id.
 */
function noSystemIds(label: string) {
  return (items: Array<{ id?: string }> | undefined, ctx: z.RefinementCtx) => {
    if (!items) return;
    items.forEach((item, idx) => {
      if (typeof item.id === "string" && SYSTEM_ATTR_IDS.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Идентификатор «${item.id}» зарезервирован системой и не может использоваться в ${label}ах`,
          path: [idx, "id"],
        });
      }
    });
  };
}

/* ------------------------------------------------------------------ */
/*                       Примитивы                                     */
/* ------------------------------------------------------------------ */

const DataId = z
  .string()
  .trim()
  .min(1, "Идентификатор не может быть пустым")
  .max(63, "Идентификатор не длиннее 63 символов");

const Fqid = z.string().trim().min(1);

const Name = z.string().trim().min(1).optional();
const Description = z.string().optional();

/* ------------------------------------------------------------------ */
/*                          Общие блоки                                */
/* ------------------------------------------------------------------ */
const AttributeRef = z.object({
  attribute: Fqid,
});

const Constraint = z.object({
  kind: z.enum([
    "required",
    "range",
    "length",
    "regexp",
    "size",
    "mime_types",
    "unique",
  ]),
  message: z.string().optional(),
  min: z.union([z.number(), z.string()]).optional(),
  max: z.union([z.number(), z.string()]).optional(),
  regexp: z.string().optional(),
  mimeTypes: z.array(z.string()).optional(),
});

/* ------------------------------------------------------------------ */
/*                          Атрибуты                                   */
/* ------------------------------------------------------------------ */

const DATA_TYPES = [
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
] as const;

const ArrayItem = z
  .object({
    dataType: z.string().min(1),
    entity: Fqid.optional(),
    constraints: z.array(Constraint).optional(),
  })
  .passthrough();

const Attribute = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    dataType: z.union([z.enum(DATA_TYPES), z.string().min(1)]),
    constraints: z.array(Constraint).optional(),
    readonly: z.boolean().optional(),
    entity: Fqid.optional(),
    item: ArrayItem.optional(),
    sequence: Fqid.optional(),
    template: z.string().optional(),
    defaultPrefix: z.string().optional(),
    incrementTemplate: z.string().optional(),
    segment: z.array(z.string()).optional(),
    prefixRules: z.array(z.unknown()).optional(),
    comments: z.boolean().optional(),
    calculation: z
      .object({
        schemaId: z.string(),
        id: z.string(),
      })
      .optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (val.dataType !== "Identifier") return;
    if (!val.template) return;

    const literals = Array.from(val.template.matchAll(/{(.*?)}/g)).map((m) =>
      m[1].trim(),
    );

    if (literals.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Шаблон идентификатора должен содержать литералы",
        path: ["template"],
      });
      return;
    }

    const hasInc = literals.some((l) => l === "@inc");
    if (!hasInc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Шаблон идентификатора обязательно должен содержать {@inc}",
        path: ["template"],
      });
    }

    const hasPrefix = literals.some((l) => l === "@prefix");
    if (hasPrefix && !val.defaultPrefix) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Шаблон использует {@prefix}, но defaultPrefix не задан",
        path: ["defaultPrefix"],
      });
    }
    if (!hasPrefix && val.defaultPrefix) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "defaultPrefix задан, но {@prefix} отсутствует в шаблоне",
        path: ["template"],
      });
    }

    if (val.incrementTemplate) {
      if (!/^0{2,10}$/.test(val.incrementTemplate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "incrementTemplate должен содержать от 2 до 10 нулей",
          path: ["incrementTemplate"],
        });
      }
    }

    if (val.sequence && val.segment && val.segment.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Нельзя одновременно указывать sequence и segment",
        path: ["segment"],
      });
    }
  });

/* ------------------------------------------------------------------ */
/*                       Пользовательские типы                         */
/* ------------------------------------------------------------------ */

const EnumValue = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    hidden: z.boolean().optional(),
  })
  .passthrough();

const WorkflowStatus = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    hidden: z.boolean().optional(),
  })
  .passthrough();

const WorkflowTransition = z
  .object({
    from: z.string(),
    to: z.string(),
  })
  .passthrough();

const TableAttribute = Attribute;
const EnumValueList = z.array(EnumValue).superRefine(uniqueById("значени"));
const WorkflowStatusList = z
  .array(WorkflowStatus)
  .superRefine(uniqueById("статус"));
const AttributeList = z
  .array(TableAttribute)
  .superRefine(uniqueById("атрибуты"));

const DataType = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    dataType: z.enum(["Enum", "Workflow", "Table"]),
    values: EnumValueList.optional(),
    statuses: WorkflowStatusList.optional(),
    initial: DataId.optional(),
    transitions: z.array(WorkflowTransition).optional(),
    attributes: AttributeList.optional(),
    maxRows: z.number().int().positive().optional(),
    view: z.unknown().optional(),
    sorting: z.array(z.unknown()).optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (val.dataType === "Enum" && val.view && Array.isArray(val.view)) {
      // view может быть массивом { value, color }
      // проверим, что цвета валидны
      const cssColorRe = /^#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{6})$|^[a-z]+$/i;
      (val.view as Array<{ value?: string; color?: string }>).forEach(
        (item, idx) => {
          if (typeof item.color === "string" && !cssColorRe.test(item.color)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Недопустимый цвет «${item.color}»`,
              path: ["view", idx, "color"],
            });
          }
        },
      );
    }
    if (val.dataType === "Workflow" && val.transitions) {
      const seen = new Set<string>();
      val.transitions.forEach((t, idx) => {
        const key = `${t.from}→${t.to}`;
        if (seen.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Дубликат перехода «${t.from} → ${t.to}»`,
            path: ["transitions", idx],
          });
        }
        seen.add(key);

        if (t.from === "*" && t.to === "*") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Переход «* → *» недопустим",
            path: ["transitions", idx],
          });
        }
      });
    }
    if (val.dataType === "Enum" && (!val.values || val.values.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Для Enum необходимо определить хотя бы одно значение",
        path: ["values"],
      });
    }
    if (val.dataType === "Workflow") {
      if (!val.statuses || val.statuses.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Для Workflow необходимо определить статусы",
          path: ["statuses"],
        });
      }
      if (!val.initial) {
        ctx.addIssue({
          code: "custom",
          message: "Для Workflow необходимо указать initial",
          path: ["initial"],
        });
      }
    }
  });

/* ------------------------------------------------------------------ */
/*                          Сущность                                   */
/* ------------------------------------------------------------------ */

const SortByItem = z.object({
  attribute: Fqid,
  direction: z.enum(["asc", "desc"]).optional(),
});

const SortByList = z.array(SortByItem).superRefine((items, ctx) => {
  const seen = new Map<string, number>();
  items.forEach((item, idx) => {
    if (typeof item.attribute !== "string" || !item.attribute) return;
    if (seen.has(item.attribute)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Дубликат атрибута «${item.attribute}» в правиле сортировки (первое вхождение — элемент ${
          seen.get(item.attribute)! + 1
        })`,
        path: [idx, "attribute"],
      });
    } else {
      seen.set(item.attribute, idx);
    }
  });
});

const Sorting = z
  .object({
    id: DataId,
    name: Name,
    by: SortByList.optional(),
    createIndex: z.boolean().optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (!val.by || val.by.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Правило сортировки «${val.id}»: не задано поле by — список атрибутов для сортировки`,
        path: ["by"],
      });
    }
  });

const Identification = z
  .object({
    id: DataId,
    rule: z.array(z.unknown()).optional(),
    filter: z.array(z.unknown()).optional(),
  })
  .passthrough();

const Reconciliation = z.array(z.unknown()).optional();

const Projection = z.array(AttributeRef).optional();

const Searching = z.array(AttributeRef).optional();

const GraphView = z
  .object({
    iconColor: z
      .enum([
        "red",
        "pink",
        "lightpink",
        "orange",
        "peach",
        "yellow",
        "green",
        "lightgreen",
        "turquoise",
        "lightblue",
        "blue",
        "violet",
        "purple",
        "grey",
      ])
      .optional(),
  })
  .optional();

const SortingList = z
  .array(Sorting)
  .superRefine(uniqueById("правило сортировки"));
  
const EntityAttributeList = z
  .array(Attribute)
  .superRefine(uniqueById("атрибут"));

const Entity = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    label: z.string().optional(),
    attributes: EntityAttributeList.superRefine(
      noSystemIds("атрибут"),
    ).optional(),
    sorting: SortingList.optional(),
    identification: z.array(Identification).optional(),
    reconciliation: Reconciliation,
    projection: Projection,
    searching: Searching,
    inherits: Fqid.optional(),
    icons: Fqid.optional(),
    graphView: GraphView,
    scanTarget: z.boolean().optional(),
    scanTargetGroup: z.boolean().optional(),
    kind: z.enum(["regular", "abstract", "static"]).optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    const count =
      (val.inherits ? 1 : 0) +
      ((val as { extends?: unknown }).extends ? 1 : 0) +
      ((val as { partOf?: unknown }).partOf ? 1 : 0);
    if (count > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Сущность не может одновременно иметь extends, inherits и partOf",
        path: ["inherits"],
      });
    }
  })
  .superRefine((val, ctx) => {
    const hasIdentification =
      Array.isArray(val.identification) && val.identification.length > 0;
    const hasReconciliation =
      Array.isArray(val.reconciliation) && val.reconciliation.length > 0;
    if (hasReconciliation && !hasIdentification) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Для правил реконсиляции необходимо определить хотя бы одно правило идентификации",
        path: ["reconciliation"],
      });
    }
  });

/* ------------------------------------------------------------------ */
/*                          Связь                                      */
/* ------------------------------------------------------------------ */

const LinkageAttribute = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    dataType: z.string().min(1),
    constraints: z.array(Constraint).optional(),
    searchable: z.boolean().optional(),
  })
  .passthrough();

const Linkage = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    side1: Fqid,
    side2: Fqid,
    type: z.enum(["1_1", "1_n", "n_n"]),
    undirected: z.boolean().optional(),
    nameFrom: z
      .object({
        side1: z.string().min(1),
        side2: z.string().min(1),
      })
      .optional(),
    useForSearch: z.boolean().optional(),
    attributes: z.array(LinkageAttribute).optional(),
    sorting: z.array(Sorting).optional(),
    view: z
      .object({
        color: z.string().optional(),
        excludeOnGraph: z.union([z.boolean(), z.literal("off")]).optional(),
      })
      .optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (val.type !== "n_n" && val.undirected === true) {
      ctx.addIssue({
        code: "custom",
        message: "Поле undirected допустимо только для type: n_n",
        path: ["undirected"],
      });
    }
  });

/* ------------------------------------------------------------------ */
/*                          Действие                                   */
/* ------------------------------------------------------------------ */

const ACTION_TYPES = [
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
] as const;

const Action = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    type: z.enum(ACTION_TYPES),
    entity: Fqid.optional(),
    operation: z
      .enum(["create", "edit", "view", "remove", "edit_attribute"])
      .optional(),
    modal: Fqid.optional(),
    panel: Fqid.optional(),
    view: Fqid.optional(),
    automation: z.object({ id: z.string() }).optional(),
    scenario: z.string().optional(),
    workerTag: z.string().optional(),
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/*                          Представления                              */
/* ------------------------------------------------------------------ */

const Column = z
  .object({
    id: DataId,
    attribute: Fqid.optional(),
    linkageAttribute: Fqid.optional(),
    join: Fqid.optional(),
    label: z.string().optional(),
    layout: z.unknown().optional(),
    control: z.unknown().optional(),
    use: z.array(AttributeRef).optional(),
  })
  .passthrough();

const ViewType = z.enum([
  "entity",
  "list",
  "tabs_list",
  "dashboard",
  "dashboard_tree",
  "tree",
]);

const EntityViewType = z.enum(["panel", "modal", "page"]);

const WidgetControl = z
  .object({
    type: z.string().optional(),
    label: z.string().optional(),
    icon: z.string().optional(),
    text: z.string().optional(),
    trueText: z.string().optional(),
    falseText: z.string().optional(),
  })
  .passthrough();

const Widget = z
  .object({
    id: DataId,
    type: z.enum([
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
    ]),
    description: Description,
    attribute: Fqid.optional(),
    action: Fqid.optional(),
    linkage: Fqid.optional(),
    label: z.string().optional(),
    control: WidgetControl.optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    const anyWidget = val as Record<string, unknown>;

    // mutually exclusive for linkage widget
    if (val.type === "linkage") {
      const keys = ["attribute", "linkage", "join"].filter(
        (k) => anyWidget[k] !== undefined,
      );
      if (keys.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Можно указать только одно из: attribute, linkage, join`,
          path: [keys[1]],
        });
      }
    }

    // action widget: action or actions
    if (val.type === "action") {
      const hasAction = anyWidget.action !== undefined;
      const hasActions = anyWidget.actions !== undefined;
      if (hasAction && hasActions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Укажите что-то одно: action или actions",
          path: ["action"],
        });
      }
      if (!hasAction && !hasActions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Требуется action или actions",
          path: ["action"],
        });
      }
    }

    // join widget: only one of attribute / linkageAttribute / aggregate
    if (val.type === "join") {
      const keys = ["attribute", "linkageAttribute", "aggregate"].filter(
        (k) => anyWidget[k] !== undefined,
      );
      if (keys.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Можно указать только одно из: attribute, linkageAttribute, aggregate`,
          path: [keys[1]],
        });
      }
      if (keys.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Требуется attribute, linkageAttribute или aggregate",
          path: [],
        });
      }
    }
  });

const Layout = z
  .object({
    direction: z.enum(["column", "row"]).optional(),
    expandable: z.boolean().optional(),
    height: z.string().optional(),
    maxHeight: z.string().optional(),
    minHeight: z.string().optional(),
    sizeRatio: z
      .object({
        left: z.number().optional(),
        right: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

const Group = z
  .object({
    id: DataId,
    type: z.enum(["block", "tab", "form", "tabs", "resizable_block_pair"]),
    label: z.string().optional(),
    description: Description,
    components: z.array(z.unknown()).optional(),
    inherits: Fqid.optional(),
    layout: Layout.optional(),
  })
  .passthrough();

const InnerView = z
  .object({
    id: DataId,
    type: EntityViewType,
    label: z.string().optional(),
    description: Description,
  })
  .passthrough();
const ColumnList = z.array(Column).superRefine(uniqueById("колонк"));
const WidgetList = z.array(Widget).superRefine(uniqueById("виджет"));
const GroupList = z.array(Group).superRefine(uniqueById("групп"));
const InnerViewList = z.array(InnerView).superRefine(uniqueById("карточк"));

const View = z
  .object({
    id: DataId,
    type: ViewType,
    label: z.string().optional(),
    description: Description,
    entity: Fqid.optional(),
    source: z
      .object({
        type: z.literal("operational").optional(),
        entity: Fqid,
        joins: z.array(z.unknown()).optional(),
      })
      .optional(),
    table: z
      .object({
        columns: ColumnList.optional(),
        selection: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    widgets: WidgetList.optional(),
    groups: GroupList.optional(),
    views: InnerViewList.optional(),
    actionPanel: z.array(z.unknown()).optional(),
    inherits: Fqid.optional(),
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/*                          Меню                                       */
/* ------------------------------------------------------------------ */

const MenuItem = z
  .object({
    id: DataId,
    route: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(["menu", "root_menu"]).optional(),
    description: Description,
    view: Fqid.optional(),
    icon: z.string().optional(),
    priority: z.number().optional(),
  })
  .passthrough();
const MenuItemList = z.array(MenuItem).superRefine(uniqueById("пункт меню"));

const Menu = z
  .object({
    id: DataId,
    route: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(["root_group", "root_menu"]),
    placement: z.enum(["top", "settings"]).optional(),
    icon: z.string().optional(),
    description: Description,
    priority: z.number().optional(),
    view: Fqid.optional(),
    items: MenuItemList.optional(),
    default: DataId.optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (val.type === "root_group" && !val.items) {
      ctx.addIssue({
        code: "custom",
        message: "Для root_group необходимо указать items",
        path: ["items"],
      });
    }
    if (val.type === "root_menu" && !val.view) {
      ctx.addIssue({
        code: "custom",
        message: "Для root_menu необходимо указать view",
        path: ["view"],
      });
    }
    if (val.type === "root_group" && (val as { default?: string }).default) {
      const defId = val.default;
      const hasItem = (val.items ?? []).some((it) => it.id === defId);
      if (!hasItem) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `default-элемент «${defId}» не найден в items`,
          path: ["default"],
        });
      }
    }
  });

/* ------------------------------------------------------------------ */
/*                       Правила данных и UI                           */
/* ------------------------------------------------------------------ */

const DataRule = z
  .object({
    id: DataId,
    name: z.string().min(1).optional(),
    description: Description,
    target: z.enum(["entity", "entityAttribute", "linkage"]),
    entity: Fqid.optional(),
    linkage: Fqid.optional(),
    attribute: Fqid.optional(),
    condition: z.union([z.string(), z.boolean()]),
    rule: z
      .object({
        effect: z.enum([
          "hidden",
          "readonly",
          "required",
          "default",
          "allowed",
        ]),
      })
      .passthrough(),
    message: z.string().optional(),
    help: z.string().optional(),
  })
  .passthrough();

const UiRule = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    target: z.enum(["entity_view", "list_view", "entity_attribute"]),
    view: Fqid,
    condition: z.union([z.string(), z.boolean()]).optional(),
    rule: z
      .object({
        effect: z.enum([
          "hidden",
          "show",
          "hiddenEmpty",
          "readonly",
          "editable",
          "inherit",
          "variant",
        ]),
      })
      .passthrough(),
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/*                          Деревья                                    */
/* ------------------------------------------------------------------ */

type TreeHierarchyType = {
  entity: string;
  linkage?: string;
  maxInstances?: number;
  maxChildren?: number;
  side?: 1 | 2;
  children?: TreeHierarchyType[];
};

const TreeHierarchy: z.ZodType<TreeHierarchyType> = z.lazy(() =>
  z
    .object({
      entity: Fqid,
      linkage: Fqid.optional(),
      maxInstances: z.number().int().positive().optional(),
      maxChildren: z.number().int().positive().optional(),
      side: z.union([z.literal(1), z.literal(2)]).optional(),
      children: z.array(TreeHierarchy).optional(),
    })
    .passthrough(),
);

const Tree = z
  .object({
    id: DataId,
    type: z.enum(["ordinary", "orderable", "multiparent"]).optional(),
    maxDepth: z.number().int().positive().optional(),
    hierarchy: TreeHierarchy,
    sorting: z.array(z.unknown()).optional(),
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/*                        Последовательности                           */
/* ------------------------------------------------------------------ */

const Sequence = z
  .object({
    id: DataId,
    name: Name,
    description: Description,
    startFrom: z.number().min(1).optional(),
  })
  .passthrough();

const EntityList = z.array(Entity).superRefine(uniqueById("сущност"));
const LinkageList = z.array(Linkage).superRefine(uniqueById("связ"));
const ActionList = z.array(Action).superRefine(uniqueById("действи"));
const ViewList = z.array(View).superRefine(uniqueById("представлени"));
const MenuList = z.array(Menu).superRefine(uniqueById("меню"));
const DataTypeList = z.array(DataType).superRefine(uniqueById("тип данных"));
const DataRuleList = z.array(DataRule).superRefine(uniqueById("правило"));
const UiRuleList = z.array(UiRule).superRefine(uniqueById("UI-правило"));
const SequenceList = z
  .array(Sequence)
  .superRefine(uniqueById("последовательность"));

/* ------------------------------------------------------------------ */
/*                    Корневая схема домена                            */
/* ------------------------------------------------------------------ */
const CounterColorPattern = z
  .object({
    id: DataId,
    red: z.string(),
    yellow: z.string(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    const timeRe = /^([1-9]+[0-9]*[wdhm])+$/;
    const pctRe = /^(?!0%)([1-9][0-9]?|100)%$/;

    const redIsTime = timeRe.test(val.red);
    const redIsPct = pctRe.test(val.red);
    const yellowIsTime = timeRe.test(val.yellow);
    const yellowIsPct = pctRe.test(val.yellow);

    if (!redIsTime && !redIsPct) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `red: ожидается формат 1w2d3h5m или 1-100%`,
        path: ["red"],
      });
    }
    if (!yellowIsTime && !yellowIsPct) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `yellow: ожидается формат 1w2d3h5m или 1-100%`,
        path: ["yellow"],
      });
    }
    if ((redIsTime && yellowIsPct) || (redIsPct && yellowIsTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "red и yellow должны быть в одном формате",
        path: [],
      });
    }
    if (redIsPct && yellowIsPct) {
      const r = parseInt(val.red, 10);
      const y = parseInt(val.yellow, 10);
      if (y >= r) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "yellow должен быть меньше red",
          path: ["yellow"],
        });
      }
    }
  });

const CounterColorPatternList = z
  .array(CounterColorPattern)
  .superRefine(uniqueById("цветовую схем"));

export const DomainZodSchema = z
  .object({
    id: Fqid,
    type: z.literal("domain"),
    version: z.string().min(1),
    name: z.string().min(1),
    description: Description,
    status: z.string().optional(),
    date: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),

    entities: EntityList.optional(),
    linkages: LinkageList.optional(),
    trees: z.array(Tree).optional(),
    transitiveLinkages: z.array(z.unknown()).optional(),
    dataTypes: DataTypeList.optional(),
    sequences: SequenceList.optional(),
    counterColorPattern: CounterColorPatternList.optional(),
    mixins: z.array(z.unknown()).optional(),
    dataRules: DataRuleList.optional(),
    actions: ActionList.optional(),
    medias: z.array(z.unknown()).optional(),
    views: ViewList.optional(),
    menus: MenuList.optional(),
    uiRules: UiRuleList.optional(),
    uiPresets: z.array(z.unknown()).optional(),
    exchangeSettings: z.unknown().optional(),
    permissions: z.array(z.unknown()).optional(),
    accessRules: z.array(z.unknown()).optional(),
    localizations: z.array(z.unknown()).optional(),
  })
  .passthrough();

export type DomainZod = z.infer<typeof DomainZodSchema>;
