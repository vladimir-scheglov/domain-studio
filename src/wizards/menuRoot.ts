import { wizardRegistry } from "@/services/wizardRegistry";

/**
 * Визард «Меню».
 *
 * Создаёт пункт меню верхнего уровня (root_group) с одним или несколькими
 * разделами (menu), ссылающимися на списочные представления.
 *
 * Пользователь вводит view'ы через запятую в формате:
 *   /route | Label | view_id
 * Одна строка — один пункт.
 */
wizardRegistry.register({
  id: "menu.root",
  title: "Раздел меню",
  description: "Создаёт корневую группу меню с пунктами",
  category: "menu",
  command: "menu.create.root",

  steps: [
    {
      id: "main",
      title: "Параметры меню",
      fields: [
        {
          name: "id",
          label: "ID группы",
          type: "text",
          required: true,
          placeholder: "menus_domain",
        },
        {
          name: "route",
          label: "Корневой маршрут",
          type: "text",
          required: true,
          placeholder: "/devices",
          help: "Начинается со слэша. Только строчные латинские буквы и дефисы.",
        },
        {
          name: "label",
          label: "Заголовок группы",
          type: "text",
          required: true,
          placeholder: "Устройства",
        },
        {
          name: "placement",
          label: "Расположение",
          type: "select",
          defaultValue: "top",
          options: [
            { value: "top", label: "Главное меню" },
            { value: "settings", label: "Раздел Настройки" },
          ],
        },
        {
          name: "itemsRaw",
          label: "Пункты меню",
          type: "textarea",
          required: true,
          placeholder:
            "/devices/all | Все устройства | lists_devices\n/devices/types | Типы | lists_deviceTypes",
          help: "Формат строки: route | Label | view_id.",
        },
      ],
      validate: (values): Record<string, string> | null => {
        const id = String(values.id ?? "").trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)) {
          return { id: "Только латиница, цифры и _" };
        }
        const route = String(values.route ?? "").trim();
        if (!/^\/[a-z0-9-]+$/.test(route)) {
          return {
            route:
              "Маршрут должен начинаться со слэша и содержать только строчные латинские буквы, цифры и дефис",
          };
        }
        const raw = String(values.itemsRaw ?? "").trim();
        if (!raw) return { itemsRaw: "Введите хотя бы один пункт" };
        const lines = raw
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
          const parts = lines[i].split("|").map((s) => s.trim());
          if (parts.length < 3) {
            return {
              itemsRaw: `Строка ${i + 1}: ожидается формат route | Label | view_id`,
            };
          }
        }
        return null;
      },
    },
  ],

  generate: (values) => {
    const id = String(values.id ?? "").trim();
    const route = String(values.route ?? "").trim();
    const label = String(values.label ?? "").trim();
    const placement = String(values.placement ?? "top");
    const raw = String(values.itemsRaw ?? "").trim();

    const items = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [itemRoute, itemLabel, view] = line
          .split("|")
          .map((s) => s.trim());
        return { route: itemRoute, label: itemLabel, view };
      });

    const lines: string[] = [];
    lines.push("menus:");
    lines.push(`  - id: ${id}`);
    lines.push(`    route: ${route}`);
    lines.push(`    label: "${label}"`);
    lines.push(`    type: root_group`);
    lines.push(`    placement: ${placement}`);
    lines.push(`    items:`);
    for (const item of items) {
      lines.push(`      - id: ${menuIdFromRoute(item.route)}`);
      lines.push(`        route: ${item.route}`);
      lines.push(`        label: ${item.label}`);
      lines.push(`        type: menu`);
      lines.push(`        view: ${item.view}`);
    }

    return {
      yaml: lines.join("\n"),
      mergeStrategy: "merge",
      summary: `Создать меню «${label}» с ${items.length} пунктами`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*                         Утилиты                                    */
/* ------------------------------------------------------------------ */

/**
 * Из route вида /devices/all делает идентификатор menu_allDevices.
 * Простое преобразование: убрать слеши, склеить, привести к camelCase.
 */
function menuIdFromRoute(route: string): string {
  const parts = route.split("/").filter(Boolean);
  if (parts.length === 0) return "menu_root";
  const [first, ...rest] = parts;
  const camel = rest
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  return `menu_${first}${camel}`;
}
