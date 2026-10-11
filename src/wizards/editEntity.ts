import { wizardRegistry } from "@/services/wizardRegistry";

/**
 * Визард редактирования существующей сущности.
 *
 * Генерирует фрагмент `entities: [{ id, name, description, label, inherits }]`.
 * Благодаря mergeArraysById в applyPatch, атрибуты не потеряются —
 * добавятся только изменённые поля.
 */
wizardRegistry.register({
  id: "entity.edit",
  title: "Редактировать сущность",
  description: "Изменение названия, описания, лейбла и родителя",
  category: "entity",
  command: "entity.edit",

  steps: [
    {
      id: "main",
      title: "Параметры сущности",
      fields: [
        {
          name: "id",
          label: "ID сущности",
          type: "text",
          required: true,
          help: "Идентификатор существующей сущности. Менять не рекомендуется — но можно.",
        },
        {
          name: "name",
          label: "Название",
          type: "text",
          placeholder: "Оборудование",
        },
        {
          name: "description",
          label: "Описание",
          type: "textarea",
        },
        {
          name: "label",
          label: "Шаблон отображаемого названия",
          type: "text",
          placeholder: "{device_name}",
        },
        {
          name: "inherits",
          label: "Родительская сущность",
          type: "entity-ref",
          placeholder: "BaseEntity",
        },
      ],
      validate: (values): Record<string, string> | null => {
        if (!String(values.id ?? "").trim()) {
          return { id: "ID обязателен" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const name = String(values.name ?? "").trim();
    const description = String(values.description ?? "").trim();
    const label = String(values.label ?? "").trim();
    const inherits = String(values.inherits ?? "").trim();

    const lines: string[] = [];
    lines.push("entities:");
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    if (description) lines.push(`    description: ${description}`);
    if (label) lines.push(`    label: "${label}"`);
    if (inherits) lines.push(`    inherits: ${inherits}`);

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Обновить сущность «${name || id}»`,
    };
  },
});
