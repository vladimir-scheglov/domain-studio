import { wizardRegistry } from "@/services/wizardRegistry";

/**
 * Визард «Списочное представление».
 *
 * Создаёт views[] с type: list, источником и таблицей столбцов.
 * Столбцы формируются по атрибутам сущности — если пользователь
 * указал их через запятую.
 */
wizardRegistry.register({
  id: "view.list",
  title: "Списочное представление",
  description: "Создаёт представление списка объектов сущности",
  category: "view",
  command: "view.create.list",

  steps: [
    {
      id: "main",
      title: "Параметры представления",
      fields: [
        {
          name: "id",
          label: "ID представления",
          type: "text",
          required: true,
          placeholder: "lists_devices",
        },
        {
          name: "entityId",
          label: "Сущность",
          type: "entity-ref",
          required: true,
          placeholder: "Device",
        },
        {
          name: "label",
          label: "Заголовок",
          type: "text",
          placeholder: "Список устройств",
        },
        {
          name: "columns",
          label: "Столбцы (ID атрибутов через запятую)",
          type: "textarea",
          placeholder: "device_name, device_ip, createdAt",
          help: "Если оставить пустым, будут добавлены id и createdAt.",
        },
        {
          name: "selection",
          label: "Разрешить выбор строк",
          type: "boolean",
          defaultValue: true,
        },
      ],
      validate: (values) => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры и _, начинается с буквы" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const entityId = String(values.entityId ?? "").trim();
    const label = String(values.label ?? "").trim();
    const columnsRaw = String(values.columns ?? "").trim();
    const selection = Boolean(values.selection);

    const columns = columnsRaw
      ? columnsRaw
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : ["id", "createdAt"];

    const lines: string[] = [];
    lines.push("views:");
    lines.push(`  - id: ${id}`);
    lines.push(`    type: list`);
    if (label) lines.push(`    label: ${label}`);
    lines.push(`    source:`);
    lines.push(`      type: operational`);
    lines.push(`      entity: ${entityId}`);
    lines.push(`    table:`);
    lines.push(`      columns:`);
    for (const col of columns) {
      lines.push(`        - id: ${col}`);
      lines.push(`          attribute: ${col}`);
      lines.push(`          label: ${col}`);
    }
    if (selection) {
      lines.push(`      selection: true`);
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать список «${label || id}» для «${entityId}»`,
    };
  },
});
