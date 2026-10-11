/**
 * Реестр визардов.
 *
 * Визард описывает последовательность шагов (шаг = набор полей),
 * а также функцию generate(), которая по введённым значениям
 * возвращает YAML-фрагмент.
 *
 * Фрагмент может содержать ключи верхнего уровня (entities, linkages, ...).
 * Он объединяется с текущим документом через applyPatch().
 */

export type WizardFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "boolean"
  | "number"
  | "entity-ref"
  | "attribute-ref"
  | "linkage-ref"
  | "rql";

export type WizardFieldOption = {
  value: string;
  label: string;
};

export type WizardField = {
  name: string;
  label: string;
  type: WizardFieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  defaultValue?: string | number | boolean | string[];
  options?: WizardFieldOption[];
  dynamicOptions?:
    | "entityAttributes"
    | "listViews"
    | "allViews"
    | "entityViews"
    | "existingTrees"
    | "existingLinkages"
    | "existingMixins"
    | "entityViewComponents"
    | "mixinTargets"
    | "mixinContents";
};

export type WizardStep = {
  id: string;
  title: string;
  description?: string;
  fields: WizardField[];
  validate?: (
    values: Record<string, unknown>,
    allValues?: Record<string, unknown>,
  ) => Record<string, string> | null;
};

export type WizardCategory =
  | "entity"
  | "attribute"
  | "linkage"
  | "view"
  | "action"
  | "menu"
  | "rule"
  | "uirule"
  | "scenario";

export type WizardContext = {
  /** Текущее содержимое документа в виде JS-объекта. */
  parsed: unknown | null;
  /** Путь курсора в YAML на момент открытия визарда. */
  cursorPath: (string | number)[];
};

export type WizardResult = {
  /** YAML-фрагмент, который нужно смержить с документом. */
  yaml: string;
  /** Стратегия слияния. */
  mergeStrategy: "merge" | "replace";
  /**
   * Путь, куда нужно вставить фрагмент.
   *
   * Примеры:
   *   undefined                       — плоский merge в корень (по умолчанию)
   *   ['entities']                    — добавить в массив entities в корне
   *   ['entities', 'Device']          — вставить в сущность с id=Device
   *   ['entities', 'Device', 'attributes'] — в массив attributes этой сущности
   *
   * Если в пути элемент — строка, она интерпретируется как id элемента массива
   * (для массивов) или ключ (для объектов). Если число — как индекс массива.
   */
  targetPath?: (string | number)[];
  /** Короткое описание того, что сделает визард (для превью). */
  summary?: string;
};

export type Wizard = {
  id: string;
  title: string;
  description?: string;
  category: WizardCategory;
  /** Команда палитры: если задана, визард попадёт в Ctrl+K с этой командой. */
  command?: string;
  steps: WizardStep[];
  generate: (
    values: Record<string, unknown>,
    ctx: WizardContext,
  ) => WizardResult;
};

/* ------------------------------------------------------------------ */
/*                            Реестр                                  */
/* ------------------------------------------------------------------ */

class WizardRegistry {
  private wizards = new Map<string, Wizard>();

  register(wizard: Wizard): void {
    this.wizards.set(wizard.id, wizard);
  }

  registerMany(wizards: Wizard[]): void {
    for (const w of wizards) this.register(w);
  }

  get(id: string): Wizard | undefined {
    return this.wizards.get(id);
  }

  list(category?: WizardCategory): Wizard[] {
    const all = Array.from(this.wizards.values());
    return category ? all.filter((w) => w.category === category) : all;
  }
}

export const wizardRegistry = new WizardRegistry();
