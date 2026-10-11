import { wizardRegistry } from "@/services/wizardRegistry";

/**
 * Визард «Базовая сущность».
 *
 * Создаёт YAML-фрагмент:
 *   entities:
 *     - id: <EntityId>
 *       name: <Название>
 *       description: <Описание>
 *       label: "<шаблон>"
 *       attributes:
 *         - id: <attrId>
 *           name: <Название атрибута>
 *           dataType: String
 */
wizardRegistry.register({
  id: "entity.basic",
  title: "Базовая сущность",
  description:
    "Создаёт сущность с идентификатором, названием и одним атрибутом",
  category: "entity",
  command: "entity.create.basic",

  steps: [
    {
      id: "main",
      title: "Параметры сущности",
      fields: [
        {
          name: "id",
          label: "Идентификатор (латиница)",
          type: "text",
          required: true,
          placeholder: "Device",
          help: "Уникальный идентификатор сущности. Только латиница, цифры, подчёркивание.",
        },
        {
          name: "name",
          label: "Название",
          type: "text",
          required: true,
          placeholder: "Оборудование",
        },
        {
          name: "description",
          label: "Описание",
          type: "textarea",
          placeholder: "Краткое описание сущности",
        },
        {
          name: "label",
          label: "Шаблон отображаемого названия",
          type: "text",
          placeholder: "{device_name}",
          help: "Подставляется в представлениях. Можно использовать {attribute_id}.",
        },
        {
          name: "withFirstAttribute",
          label: "Добавить первый атрибут",
          type: "boolean",
          defaultValue: true,
        },
      ],
      validate: (values) => {
        const id = String(values.id ?? "");
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return {
            id: "Идентификатор: только латиница, цифры и _, начинается с буквы",
          };
        }
        return null;
      },
    },
    {
      id: "attr",
      title: "Первый атрибут",
      description:
        "Заполняется только если включена опция «Добавить первый атрибут».",
      fields: [
        {
          name: "attrId",
          label: "ID атрибута",
          type: "text",
          placeholder: "name",
        },
        {
          name: "attrName",
          label: "Название атрибута",
          type: "text",
          placeholder: "Наименование",
        },
        {
          name: "attrDataType",
          label: "Тип данных",
          type: "select",
          defaultValue: "String",
          options: [
            { value: "String", label: "Строка" },
            { value: "Text", label: "Текст с разметкой" },
            { value: "Integer", label: "Целое число" },
            { value: "Bool", label: "Булево" },
            { value: "Date", label: "Дата" },
            { value: "Timestamp", label: "Дата и время" },
          ],
        },
      ],
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const name = String(values.name ?? "").trim();
    const description = String(values.description ?? "").trim();
    const label = String(values.label ?? "").trim();
    const withAttr = Boolean(values.withFirstAttribute);

    const lines: string[] = [];
    lines.push("entities:");
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    if (description) lines.push(`    description: ${description}`);
    if (label) lines.push(`    label: "${label}"`);

    if (withAttr) {
      const attrId = String(values.attrId ?? "").trim() || "name";
      const attrName = String(values.attrName ?? "").trim();
      const attrType = String(values.attrDataType ?? "String");
      lines.push("    attributes:");
      lines.push(`      - id: ${attrId}`);
      if (attrName) lines.push(`        name: ${attrName}`);
      lines.push(`        dataType: ${attrType}`);
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать сущность «${name || id}»${
        withAttr ? " с первым атрибутом" : ""
      }`,
    };
  },
});
