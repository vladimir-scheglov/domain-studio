import { wizardRegistry } from "@/services/wizardRegistry";

wizardRegistry.register({
  id: "action.fromEntity",
  title: "Действия из сущности",
  description: "CRUD-действия для существующей сущности",
  category: "action",
  command: "action.fromEntity",

  steps: [
    {
      id: "main",
      title: "Параметры",
      fields: [
        {
          name: "entityId",
          label: "Сущность",
          type: "entity-ref",
          required: true,
        },
        {
          name: "prefix",
          label: "Префикс id",
          type: "text",
          required: true,
          placeholder: "devices",
        },
        {
          name: "modal",
          label: "ID модального окна (для создания)",
          type: "text",
          placeholder: "forms_newDevice",
        },
        {
          name: "panel",
          label: "ID панели (для просмотра)",
          type: "text",
          placeholder: "panels_infoDevice",
        },
        {
          name: "withBulkRemove",
          label: "Добавить массовое удаление",
          type: "boolean",
          defaultValue: true,
        },
      ],
      validate: (values): Record<string, string> | null => {
        if (!values.entityId) return { entityId: "Укажите сущность" };
        const p = String(values.prefix ?? "").trim();
        if (!/^[a-z][a-z0-9_]*$/.test(p)) {
          return { prefix: "Только строчная латиница, цифры, _" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const entityId = String(values.entityId ?? "").trim();
    const prefix = String(values.prefix ?? "").trim();
    const modal = String(values.modal ?? "").trim();
    const panel = String(values.panel ?? "").trim();
    const withBulkRemove = Boolean(values.withBulkRemove);

    const lines: string[] = ["actions:"];

    if (modal) {
      lines.push(`  - id: actions_${prefix}_create`);
      lines.push(`    name: Добавить`);
      lines.push(`    type: open_modal`);
      lines.push(`    modal: ${modal}`);
      lines.push(`    entity: ${entityId}`);
      lines.push(`    operation: create`);
    }

    if (panel) {
      lines.push(`  - id: actions_${prefix}_openPanel`);
      lines.push(`    name: Детали`);
      lines.push(`    type: open_panel`);
      lines.push(`    panel: ${panel}`);
      lines.push(`    entity: ${entityId}`);
    }

    if (withBulkRemove) {
      lines.push(`  - id: actions_${prefix}_bulkRemove`);
      lines.push(`    name: Удалить`);
      lines.push(`    type: bulk`);
      lines.push(`    operation: remove`);
      lines.push(`    entity: ${entityId}`);
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать CRUD-действия для «${entityId}»`,
    };
  },
});
