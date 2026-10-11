import { wizardRegistry } from "@/services/wizardRegistry";

/**
 * Визард «Связь».
 *
 * Создаёт linkages[]:
 *   - id
 *   - side1, side2
 *   - type: 1_1 | 1_n | n_n
 *   - undirected (для n_n)
 *   - nameFrom.side1, nameFrom.side2
 */
wizardRegistry.register({
  id: "linkage.basic",
  title: "Связь между сущностями",
  description: "Создаёт связь 1-1, 1-N или N-N",
  category: "linkage",
  command: "linkage.create.basic",

  steps: [
    {
      id: "main",
      title: "Параметры связи",
      fields: [
        {
          name: "id",
          label: "ID связи",
          type: "text",
          required: true,
          placeholder: "Device_User",
          help: "Обычно составляется из ID сущностей.",
        },
        {
          name: "name",
          label: "Название связи",
          type: "text",
          placeholder: "Устройство принадлежит пользователю",
        },
        {
          name: "side1",
          label: "Сущность слева (side1)",
          type: "entity-ref",
          required: true,
          placeholder: "Device",
        },
        {
          name: "side2",
          label: "Сущность справа (side2)",
          type: "entity-ref",
          required: true,
          placeholder: "User",
        },
        {
          name: "type",
          label: "Тип связи",
          type: "select",
          required: true,
          defaultValue: "1_n",
          options: [
            { value: "1_1", label: "1 — 1 (один к одному)" },
            { value: "1_n", label: "1 — N (один ко многим)" },
            { value: "n_n", label: "N — N (многие ко многим)" },
          ],
        },
        {
          name: "undirected",
          label: "Ненаправленная (только для N-N)",
          type: "boolean",
          defaultValue: false,
        },
        {
          name: "nameFromSide1",
          label: "Глагол слева",
          type: "text",
          required: true,
          placeholder: "Принадлежит",
        },
        {
          name: "nameFromSide2",
          label: "Глагол справа",
          type: "text",
          required: true,
          placeholder: "Содержит",
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры и _" };
        }
        const s1 = String(values.side1 ?? "").trim();
        const s2 = String(values.side2 ?? "").trim();
        if (s1 && s2 && s1 === s2 && values.type !== "n_n") {
          return {
            side1: "Для связи 1-1 и 1-N стороны должны быть разными",
          };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const name = String(values.name ?? "").trim();
    const side1 = String(values.side1 ?? "").trim();
    const side2 = String(values.side2 ?? "").trim();
    const type = String(values.type ?? "1_n");
    const undirected = Boolean(values.undirected);
    const nameFromSide1 = String(values.nameFromSide1 ?? "").trim();
    const nameFromSide2 = String(values.nameFromSide2 ?? "").trim();

    const lines: string[] = [];
    lines.push("linkages:");
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    lines.push(`    side1: ${side1}`);
    lines.push(`    side2: ${side2}`);
    lines.push(`    type: ${type}`);
    if (type === "n_n" && undirected) {
      lines.push(`    undirected: true`);
    }
    lines.push(`    nameFrom:`);
    lines.push(`      side1: ${nameFromSide1}`);
    lines.push(`      side2: ${nameFromSide2}`);

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать связь «${name || id}» (${type})`,
    };
  },
});
