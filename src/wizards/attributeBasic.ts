import { wizardRegistry } from "@/services/wizardRegistry";
import type { Wizard } from "@/services/wizardRegistry";

/* ------------------------------------------------------------------ */
/*                       Общая фабрика                                 */
/* ------------------------------------------------------------------ */

type AttrField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "boolean";
  required?: boolean;
  placeholder?: string;
  help?: string;
  defaultValue?: string | boolean;
  options?: { value: string; label: string }[];
};

/**
 * Создаёт простой визард «Атрибут X».
 * Поля одинаковые, отличается только имя типа и дополнительные опции.
 */
function createAttributeWizard(
  dataType: string,
  extraFields: AttrField[] = [],
): Wizard {
  return {
    id: `attr.${dataType.toLowerCase()}`,
    title: `Атрибут: ${dataType}`,
    description: `Добавляет атрибут типа ${dataType} в сущность`,
    category: "attribute",
    command: `attribute.create.${dataType.toLowerCase()}`,

    steps: [
      {
        id: "main",
        title: "Параметры атрибута",
        fields: [
          {
            name: "entityId",
            label: "ID сущности",
            type: "entity-ref",
            required: true,
            placeholder: "Device",
          },
          {
            name: "id",
            label: "ID атрибута",
            type: "text",
            required: true,
            placeholder: "device_name",
          },
          {
            name: "name",
            label: "Название атрибута",
            type: "text",
            placeholder: "Наименование",
          },
          {
            name: "required",
            label: "Обязательный",
            type: "boolean",
            defaultValue: false,
          },
          {
            name: "readonly",
            label: "Только для чтения",
            type: "boolean",
            defaultValue: false,
          },
          ...extraFields,
        ],
        validate: (values): Record<string, string> | null => {
          const id = String(values.id ?? "").trim();
          if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
            return { id: "Только латиница, цифры и _, начинается с буквы" };
          }
          return null;
        },
      },
    ],

    generate: (values) => {
      const entityId = String(values.entityId ?? "").trim();
      const id = String(values.id ?? "").trim();
      const name = String(values.name ?? "").trim();
      const isRequired = Boolean(values.required);
      const isReadonly = Boolean(values.readonly);

      const lines: string[] = [];
      lines.push("entities:");
      lines.push(`  - id: ${entityId}`);
      lines.push(`    attributes:`);
      lines.push(`      - id: ${id}`);
      if (name) lines.push(`        name: ${name}`);
      lines.push(`        dataType: ${dataType}`);

      // Специальные случаи
      if (dataType === "Array") {
        const itemType = String(values.itemDataType ?? "String");
        lines.push(`        item:`);
        lines.push(`          dataType: ${itemType}`);
      } else if (dataType === "Reference") {
        const refEntity = String(values.entity ?? "").trim();
        if (refEntity) lines.push(`        entity: ${refEntity}`);
      }

      // Общие опции
      for (const extra of extraFields) {
        if (dataType === "Array" && extra.name === "itemDataType") continue;
        if (dataType === "Reference" && extra.name === "entity") continue;
        const v = values[extra.name];
        if (v === undefined || v === null || v === "") continue;
        if (typeof v === "boolean") {
          if (v) lines.push(`        ${extra.name}: true`);
        } else {
          lines.push(`        ${extra.name}: ${String(v)}`);
        }
      }

      if (isReadonly) lines.push(`        readonly: true`);

      if (isRequired) {
        lines.push(`        constraints:`);
        lines.push(`          - kind: required`);
      }

      return {
        yaml: lines.join("\n"),
        mergeStrategy: "merge",
        summary: `Добавить в «${entityId}» атрибут «${name || id}» типа ${dataType}`,
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/*                          Регистрация                                */
/* ------------------------------------------------------------------ */

wizardRegistry.registerMany([
  createAttributeWizard("String"),
  createAttributeWizard("Text"),
  createAttributeWizard("Integer"),
  createAttributeWizard("Bool"),
  createAttributeWizard("Date"),
  createAttributeWizard("Timestamp"),
  createAttributeWizard("Url"),

  // Reference — отдельный набор полей
  createAttributeWizard("Reference", [
    {
      name: "entity",
      label: "Сущность, на которую ссылаемся",
      type: "text",
      required: true,
      placeholder: "Device",
      help: "ID целевой сущности. Позже заменим на селектор.",
    },
  ]),

  // Array — с типом элемента
  createAttributeWizard("Array", [
    {
      name: "itemDataType",
      label: "Тип элемента массива",
      type: "select",
      defaultValue: "String",
      options: [
        { value: "String", label: "Строка" },
        { value: "Integer", label: "Целое число" },
        { value: "Bool", label: "Булево" },
        { value: "Date", label: "Дата" },
        { value: "Timestamp", label: "Дата и время" },
      ],
    },
  ]),
]);
