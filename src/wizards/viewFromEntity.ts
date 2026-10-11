import { wizardRegistry } from "@/services/wizardRegistry";
import { useDocumentStore } from "@/store/documentStore";

wizardRegistry.register({
  id: "view.fromEntity",
  title: "Представления из сущности",
  description: "Список и/или карточка для существующей сущности",
  category: "view",
  command: "view.fromEntity",

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
          name: "kind",
          label: "Что создать",
          type: "select",
          required: true,
          defaultValue: "list",
          options: [
            { value: "list", label: "Только список" },
            { value: "panel", label: "Только панель" },
            { value: "both", label: "Список и панель" },
          ],
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
    const kind = String(values.kind ?? "list");

    // Используем ту же функцию генерации, но без actions/menu
    // Для краткости продублируем минимум:
    const parsed = useDocumentStore.getState().parsed;
    const entity = (
      parsed as {
        entities?: Array<{
          id: string;
          name?: string;
          attributes?: Array<{ id: string; name?: string; dataType?: string }>;
        }>;
      }
    )?.entities?.find((e) => e.id === entityId);

    if (!entity) {
      return {
        yaml: `# Сущность «${entityId}» не найдена`,
        mergeStrategy: "merge",
      };
    }

    const lines: string[] = ["views:"];
    if (kind === "list" || kind === "both") {
      lines.push(`  - id: lists_${prefix}`);
      lines.push(`    type: list`);
      lines.push(`    source:`);
      lines.push(`      type: operational`);
      lines.push(`      entity: ${entityId}`);
      lines.push(`    table:`);
      lines.push(`      columns:`);
      for (const attr of (entity.attributes ?? []).slice(0, 5)) {
        lines.push(`        - id: ${attr.id}`);
        lines.push(`          attribute: ${attr.id}`);
        lines.push(`          label: "${attr.name ?? attr.id}"`);
      }
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать ${kind === "both" ? "список и панель" : kind} для «${entity.name ?? entityId}»`,
    };
  },
});
