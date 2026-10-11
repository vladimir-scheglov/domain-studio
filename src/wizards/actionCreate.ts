import { wizardRegistry } from "@/services/wizardRegistry";

/**
 * Визард «Действия CRUD».
 *
 * Создаёт набор действий для сущности:
 *   - actions_create (open_modal + create)
 *   - actions_openPanel (open_panel)
 *   - actions_bulkRemove (bulk + remove)
 *
 * Для open_modal и open_panel нужно указать id модального окна и панели,
 * которые пользователь создаёт отдельно (или через другие визарды).
 */
wizardRegistry.register({
  id: "action.crud",
  title: "Действия CRUD",
  description: "Создаёт действия: создание, просмотр, массовое удаление",
  category: "action",
  command: "action.create.crud",

  steps: [
    {
      id: "main",
      title: "Параметры действий",
      fields: [
        {
          name: "entityId",
          label: "ID сущности",
          type: "entity-ref",
          required: true,
          placeholder: "Device",
        },
        {
          name: "actionPrefix",
          label: "Префикс ID действий",
          type: "text",
          required: true,
          placeholder: "actions_device",
          help: "Например, actions_device — получится actions_device_create.",
        },
        {
          name: "modalId",
          label: "ID модального окна (для создания)",
          type: "text",
          placeholder: "forms_newDevice",
        },
        {
          name: "panelId",
          label: "ID панели (для просмотра)",
          type: "text",
          placeholder: "panels_infoDevice",
        },
        {
          name: "actionLabel",
          label: "Отображаемое название действия создания",
          type: "text",
          defaultValue: "Добавить",
        },
        {
          name: "removeLabel",
          label: "Отображаемое название удаления",
          type: "text",
          defaultValue: "Удалить",
        },
      ],
      validate: (values) => {
        const prefix = String(values.actionPrefix ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(prefix)) {
          return {
            actionPrefix: "Только латиница, цифры и _, начинается с буквы",
          };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const entityId = String(values.entityId ?? "").trim();
    const prefix = String(values.actionPrefix ?? "").trim();
    const modalId = String(values.modalId ?? "").trim();
    const panelId = String(values.panelId ?? "").trim();
    const actionLabel = String(values.actionLabel ?? "").trim() || "Добавить";
    const removeLabel = String(values.removeLabel ?? "").trim() || "Удалить";

    const lines: string[] = [];
    lines.push("actions:");

    if (modalId) {
      lines.push(`  - id: ${prefix}_create`);
      lines.push(`    name: ${actionLabel}`);
      lines.push(`    type: open_modal`);
      lines.push(`    modal: ${modalId}`);
      lines.push(`    entity: ${entityId}`);
      lines.push(`    operation: create`);
    }

    if (panelId) {
      lines.push(`  - id: ${prefix}_openPanel`);
      lines.push(`    name: Детали`);
      lines.push(`    type: open_panel`);
      lines.push(`    panel: ${panelId}`);
      lines.push(`    entity: ${entityId}`);
    }

    lines.push(`  - id: ${prefix}_bulkRemove`);
    lines.push(`    name: ${removeLabel}`);
    lines.push(`    type: bulk`);
    lines.push(`    operation: remove`);
    lines.push(`    entity: ${entityId}`);

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать CRUD-действия для «${entityId}»`,
    };
  },
});
