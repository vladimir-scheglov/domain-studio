import { wizardRegistry } from "@/services/wizardRegistry";

/**
 * Визард «Перечисление (Enum)».
 *
 * Создаёт:
 *   - dataTypes[] с dataType: Enum;
 *   - attributes[] в указанной сущности со ссылкой на это перечисление.
 *
 * Сущность указывается по id — визард не резолвит имя, а просто вставляет
 * ссылку. Если пользователь ввёл несуществующий id — это ошибка схемы,
 * её поймает валидатор позже.
 */
wizardRegistry.register({
  id: "attr.enum",
  title: "Атрибут-перечисление",
  description: "Создаёт пользовательский тип Enum и атрибут в сущности",
  category: "attribute",
  command: "attribute.create.enum",

  steps: [
    {
      id: "enum",
      title: "Перечисление",
      fields: [
        {
          name: "enumId",
          label: "ID перечисления",
          type: "text",
          required: true,
          placeholder: "enumStatus",
          help: "Уникальный идентификатор типа. Латиница, цифры, подчёркивание.",
        },
        {
          name: "enumName",
          label: "Название перечисления",
          type: "text",
          placeholder: "Статусы",
        },
        {
          name: "valuesRaw",
          label: "Значения",
          type: "textarea",
          required: true,
          placeholder: "NEW | Новый\nIN_PROGRESS | В работе\nDONE | Завершён",
          help: "Одна строка — одно значение. Формат: ID | Название. Разделитель — вертикальная черта.",
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.enumId ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { enumId: "Только латиница, цифры и _, начинается с буквы" };
        }
        const raw = String(values.valuesRaw ?? "").trim();
        if (!raw) return { valuesRaw: "Введите хотя бы одно значение" };
        const lines = raw
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
          const [v] = lines[i].split("|").map((s) => s.trim());
          if (!v) return { valuesRaw: `Строка ${i + 1}: отсутствует ID` };
          if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(v)) {
            return { valuesRaw: `Строка ${i + 1}: неверный ID "${v}"` };
          }
        }
        return null;
      },
    },
    {
      id: "attribute",
      title: "Атрибут",
      fields: [
        {
          name: "entityId",
          label: "ID сущности",
          type: "entity-ref",
          required: true,
          placeholder: "Incident",
          help: "Сущность, в которую добавить атрибут.",
        },
        {
          name: "attributeId",
          label: "ID атрибута",
          type: "text",
          required: true,
          placeholder: "status",
        },
        {
          name: "attributeName",
          label: "Название атрибута",
          type: "text",
          placeholder: "Статус",
        },
        {
          name: "required",
          label: "Обязательный",
          type: "boolean",
          defaultValue: false,
        },
      ],
      validate: (values) => {
        const id = String(values.attributeId ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { attributeId: "Только латиница, цифры и _" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const enumId = String(values.enumId ?? "").trim();
    const enumName = String(values.enumName ?? "").trim();
    const raw = String(values.valuesRaw ?? "").trim();

    const parsedValues = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [v, n] = line.split("|").map((s) => s.trim());
        return { id: v, name: n ?? v };
      });

    const entityId = String(values.entityId ?? "").trim();
    const attributeId = String(values.attributeId ?? "").trim();
    const attributeName = String(values.attributeName ?? "").trim();
    const isRequired = Boolean(values.required);

    // Фрагмент dataTypes
    const dtLines: string[] = [];
    dtLines.push("dataTypes:");
    dtLines.push(`  - id: ${enumId}`);
    if (enumName) dtLines.push(`    name: ${enumName}`);
    dtLines.push(`    dataType: Enum`);
    dtLines.push(`    values:`);
    for (const v of parsedValues) {
      dtLines.push(`      - id: ${v.id}`);
      if (v.name && v.name !== v.id) dtLines.push(`        name: ${v.name}`);
    }

    // Фрагмент сущности с атрибутом
    const attrLines: string[] = [];
    attrLines.push("entities:");
    attrLines.push(`  - id: ${entityId}`);
    attrLines.push(`    attributes:`);
    attrLines.push(`      - id: ${attributeId}`);
    if (attributeName) attrLines.push(`        name: ${attributeName}`);
    attrLines.push(`        dataType: ${enumId}`);
    if (isRequired) {
      attrLines.push(`        constraints:`);
      attrLines.push(`          - kind: required`);
    }

    // Собираем всё вместе — applyPatch с targetPath не задан,
    // поэтому сработает плоский merge. Благодаря mergeArraysById
    // сущность entityId НЕ задублируется: attributes добавятся в неё.
    const yaml = [dtLines.join("\n"), attrLines.join("\n")].join("\n");

    return {
      yaml,
      mergeStrategy: "merge",
      summary: `Создать перечисление «${enumName || enumId}» и атрибут «${attributeId}» в сущности «${entityId}»`,
    };
  },
});
