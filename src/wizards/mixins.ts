import { wizardRegistry } from "@/services/wizardRegistry";

/* ------------------------------------------------------------------ */
/*                       Утилиты                                        */
/* ------------------------------------------------------------------ */

function readParsed(): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const store = require("@/store/documentStore");
  const parsed = store.useDocumentStore.getState().parsed;
  if (typeof parsed !== "object" || parsed === null) return {};
  return parsed as Record<string, unknown>;
}

function readLinkages(): Array<{
  id: string;
  name?: string;
  side1?: string;
  side2?: string;
  type?: string;
}> {
  const parsed = readParsed();
  const arr = parsed.linkages;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (x): x is Record<string, unknown> => typeof x === "object" && x !== null,
    )
    .map((x) => ({
      id: String(x.id ?? ""),
      name: typeof x.name === "string" ? x.name : undefined,
      side1: typeof x.side1 === "string" ? x.side1 : undefined,
      side2: typeof x.side2 === "string" ? x.side2 : undefined,
      type: typeof x.type === "string" ? x.type : undefined,
    }));
}

function findLinkage(id: string) {
  return readLinkages().find((l) => l.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/*                     Миксин на основе связи                          */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "mixin.linkage",
  title: "Примесь на основе связи",
  description: "Встраивает данные связанной сущности в целевую",
  category: "scenario",
  command: "mixin.create.linkage",

  steps: [
    {
      id: "main",
      title: "Примесь на связи",
      fields: [
        {
          name: "id",
          label: "ID примеси",
          type: "text",
          required: true,
          placeholder: "linkage_mixin",
        },
        {
          name: "name",
          label: "Название",
          type: "text",
          placeholder: "Примесь через связь",
        },
        {
          name: "linkage",
          label: "Связь",
          type: "select",
          dynamicOptions: "existingLinkages",
          required: true,
          help: "Допустимы связи типа 1_1 и 1_n, где примесь находится на стороне 1",
        },
        {
          name: "weight",
          label: "Приоритет (вес)",
          type: "number",
          placeholder: "100",
          help: "Чем меньше число, тем выше приоритет",
        },
        {
          name: "useForChild",
          label: "Применять к дочерним сущностям",
          type: "boolean",
          defaultValue: true,
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры, _" };
        }
        if (!values.linkage) {
          return { linkage: "Выберите связь" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const name = String(values.name ?? "").trim();
    const linkageId = String(values.linkage ?? "").trim();
    const weightRaw = values.weight;
    const useForChild = Boolean(values.useForChild);

    const linkage = findLinkage(linkageId);
    if (!linkage) {
      return {
        yaml: `# Связь «${linkageId}» не найдена`,
        mergeStrategy: "merge",
        summary: "Ошибка: связь не найдена",
      };
    }

    // Определяем направление: примесь со стороны 1, целевая — со стороны 2
    const fromEntity = linkage.side1 ?? "";
    const toEntity = linkage.side2 ?? "";

    const lines: string[] = [];
    lines.push("mixins:");
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    lines.push(`    type: linkage`);
    lines.push(`    linkage: ${linkageId}`);
    lines.push(`    entity:`);
    lines.push(`      from: ${fromEntity}`);
    lines.push(`      to: ${toEntity}`);
    if (weightRaw !== undefined && weightRaw !== "") {
      lines.push(`    weight: ${Number(weightRaw)}`);
    }
    lines.push(`    useForChild: ${useForChild}`);
    lines.push(`    views: []`);

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать примесь через связь «${linkageId}»`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                     Миксин компонентов интерфейса                   */
/* ------------------------------------------------------------------ */

wizardRegistry.register({
  id: "mixin.view",
  title: "Примесь компонентов интерфейса",
  description: "Встраивает элементы интерфейса из другого домена/сущности",
  category: "scenario",
  command: "mixin.create.view",

  steps: [
    {
      id: "main",
      title: "Примесь представления",
      fields: [
        {
          name: "id",
          label: "ID примеси",
          type: "text",
          required: true,
          placeholder: "view_mixin",
        },
        {
          name: "name",
          label: "Название",
          type: "text",
        },
        {
          name: "entity",
          label: "Целевая сущность",
          type: "entity-ref",
          required: true,
          help: "Сущность, в представления которой встраивается примесь",
        },
        {
          name: "weight",
          label: "Приоритет",
          type: "number",
          placeholder: "100",
        },
        {
          name: "useForChild",
          label: "Применять к дочерним сущностям",
          type: "boolean",
          defaultValue: true,
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры, _" };
        }
        if (!values.entity) {
          return { entity: "Выберите сущность" };
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const name = String(values.name ?? "").trim();
    const entityId = String(values.entity ?? "").trim();
    const weightRaw = values.weight;
    const useForChild = Boolean(values.useForChild);

    const lines: string[] = [];
    lines.push("mixins:");
    lines.push(`  - id: ${id}`);
    if (name) lines.push(`    name: ${name}`);
    lines.push(`    type: view`);
    lines.push(`    entity: ${entityId}`);
    if (weightRaw !== undefined && weightRaw !== "") {
      lines.push(`    weight: ${Number(weightRaw)}`);
    }
    lines.push(`    useForChild: ${useForChild}`);
    lines.push(`    views: []`);

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать примесь представления для «${entityId}»`,
    };
  },
});
