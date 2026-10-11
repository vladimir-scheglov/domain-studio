import { wizardRegistry } from "@/services/wizardRegistry";

wizardRegistry.register({
  id: "rule.linkageCount",
  title: "Правило связи: ограничение количества",
  description:
    "Ограничивает минимальное и максимальное количество связей у объекта",
  category: "rule",
  command: "rule.create.linkageCount",

  steps: [
    {
      id: "main",
      title: "Параметры правила",
      fields: [
        {
          name: "id",
          label: "ID правила",
          type: "text",
          required: true,
          placeholder: "linkage_count_incidents",
          help: "Уникальный идентификатор правила",
        },
        {
          name: "name",
          label: "Название правила",
          type: "text",
          required: true,
          placeholder: "Не менее одного инцидента на актив",
        },
        {
          name: "description",
          label: "Описание",
          type: "textarea",
          placeholder: "Дополнительное пояснение для команды",
        },
        {
          name: "linkage",
          label: "Связь",
          type: "select",
          dynamicOptions: "existingLinkages",
          required: true,
          help: "Связь, для которой ограничивается количество",
        },
        {
          name: "side",
          label: "Сторона",
          type: "select",
          required: true,
          defaultValue: "1",
          options: [
            { value: "1", label: "Сторона 1 (объект-родитель)" },
            { value: "2", label: "Сторона 2 (объекты-дети)" },
          ],
          help: "Для симметричной направленной связи обязательна. Сторона объекта, у которого ограничивается количество связей",
        },
        {
          name: "minCount",
          label: "Минимум связей (min_count)",
          type: "number",
          placeholder: "1",
        },
        {
          name: "maxCount",
          label: "Максимум связей (max_count)",
          type: "number",
          placeholder: "10",
        },
        {
          name: "condition",
          label: "Условие (RQL)",
          type: "rql",
          placeholder: '@doc.incidentStatus = "REGISTERED"',
          help: "Пустое или true — правило применяется всегда",
        },
        {
          name: "message",
          label: "Сообщение об ошибке",
          type: "text",
          placeholder: "Необходимо связать с инцидентом",
        },
        {
          name: "help",
          label: "Подсказка",
          type: "text",
          placeholder: "Добавьте хотя бы одну связь",
        },
      ],

      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры и _, начинается с буквы" };
        }

        if (!String(values.name ?? "").trim()) {
          return { name: "Укажите название" };
        }

        if (!values.linkage) {
          return { linkage: "Выберите связь" };
        }

        const minRaw = values.minCount;
        const maxRaw = values.maxCount;

        const hasMin =
          minRaw !== undefined && minRaw !== null && String(minRaw).length > 0;
        const hasMax =
          maxRaw !== undefined && maxRaw !== null && String(maxRaw).length > 0;

        if (!hasMin && !hasMax) {
          return {
            minCount: "Укажите хотя бы один лимит: min_count или max_count",
          };
        }

        const min = hasMin ? Number(minRaw) : null;
        const max = hasMax ? Number(maxRaw) : null;

        if (min !== null && (!Number.isInteger(min) || min < 0)) {
          return { minCount: "Минимум должен быть неотрицательным целым" };
        }
        if (max !== null && (!Number.isInteger(max) || max < 1)) {
          return { maxCount: "Максимум должен быть положительным целым" };
        }
        if (min !== null && max !== null && min > max) {
          return {
            minCount: "Минимум не может быть больше максимума",
          };
        }

        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const name = String(values.name ?? "").trim();
    const description = String(values.description ?? "").trim();
    const linkageId = String(values.linkage ?? "").trim();
    const side = String(values.side ?? "1");
    const condition = String(values.condition ?? "").trim();
    const message = String(values.message ?? "").trim();
    const help = String(values.help ?? "").trim();

    const minRaw = values.minCount;
    const maxRaw = values.maxCount;
    const hasMin =
      minRaw !== undefined && minRaw !== null && String(minRaw).length > 0;
    const hasMax =
      maxRaw !== undefined && maxRaw !== null && String(maxRaw).length > 0;

    const lines: string[] = [];
    lines.push("dataRules:");
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    if (description) lines.push(`    description: ${description}`);
    lines.push(`    target: linkage`);
    lines.push(`    linkage: ${linkageId}`);

    // Условие
    if (condition) {
      if (condition.startsWith("@") || condition.includes("\n")) {
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

    // Сообщение / подсказка на уровне правила
    if (message) lines.push(`    message: "${message}"`);
    if (help) lines.push(`    help: "${help}"`);

    // Rule
    lines.push(`    rule:`);
    lines.push(`      effect: allowed`);
    lines.push(`      linkages:`);
    lines.push(`        - linkage: ${linkageId}`);
    lines.push(`          side: ${side}`);
    if (hasMin) lines.push(`          min_count: ${Number(minRaw)}`);
    if (hasMax) lines.push(`          max_count: ${Number(maxRaw)}`);

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Правило «${name}»: ограничение количества связей по «${linkageId}»`,
    };
  },
});
