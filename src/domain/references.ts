/**
 * Селектор ссылок из текущего документа.
 *
 * Используется:
 *  - визардами — для селекторов entity-ref, attribute-ref, linkage-ref;
 *  - completion.ts — для подсказок id в YAML.
 *
 * Работает с parsed = результат parseYaml().parsed.
 * Устойчив к неполным/битым документам — просто возвращает то, что удалось извлечь.
 */

export type EntityInfo = {
  id: string;
  name?: string;
};

export type LinkageInfo = {
  id: string;
  name?: string;
  side1?: string;
  side2?: string;
  type?: string;
  undirected?: boolean;
};

export type AttributeInfo = {
  id: string;
  name?: string;
  dataType?: string;
  entityId: string;
};

export type ViewInfo = {
  id: string;
  type?: string;
  label?: string;
};

export type ActionInfo = {
  id: string;
  type?: string;
  entity?: string;
};

export type DataTypeInfo = {
  id: string;
  name?: string;
  dataType?: "Enum" | "Workflow" | "Table";
};

export type SequenceInfo = {
  id: string;
};

export type DomainReferences = {
  entities: EntityInfo[];
  linkages: LinkageInfo[];
  attributes: AttributeInfo[];
  views: ViewInfo[];
  actions: ActionInfo[];
  dataTypes: DataTypeInfo[];
  sequences: SequenceInfo[];
};

/* ------------------------------------------------------------------ */
/*                       Сбор всех ссылок                              */
/* ------------------------------------------------------------------ */

export function collectReferences(parsed: unknown): DomainReferences {
  const out: DomainReferences = {
    entities: [],
    linkages: [],
    attributes: [],
    views: [],
    actions: [],
    dataTypes: [],
    sequences: [],
  };

  if (!isObject(parsed)) return out;

  // entities + attributes внутри них
  const entities = readArray(parsed, "entities");
  for (const ent of entities) {
    if (!isObject(ent)) continue;
    const id = str(ent.id);
    if (!id) continue;
    out.entities.push({ id, name: str(ent.name) });

    const attrs = readArray(ent, "attributes");
    for (const a of attrs) {
      if (!isObject(a)) continue;
      const aId = str(a.id);
      if (!aId) continue;
      out.attributes.push({
        id: aId,
        name: str(a.name),
        dataType: str(a.dataType),
        entityId: id,
      });
    }
  }

  // linkages
  const linkages = readArray(parsed, "linkages");
  for (const l of linkages) {
    if (!isObject(l)) continue;
    const id = str(l.id);
    if (!id) continue;
    out.linkages.push({
      id,
      name: str(l.name),
      side1: str(l.side1),
      side2: str(l.side2),
      type: str(l.type),
      undirected: bool(l.undirected),
    });
  }

  // views
  const views = readArray(parsed, "views");
  for (const v of views) {
    if (!isObject(v)) continue;
    const id = str(v.id);
    if (!id) continue;
    out.views.push({
      id,
      type: str(v.type),
      label: str(v.label),
    });
  }

  // actions
  const actions = readArray(parsed, "actions");
  for (const a of actions) {
    if (!isObject(a)) continue;
    const id = str(a.id);
    if (!id) continue;
    out.actions.push({
      id,
      type: str(a.type),
      entity: str(a.entity),
    });
  }

  // dataTypes
  const dts = readArray(parsed, "dataTypes");
  for (const dt of dts) {
    if (!isObject(dt)) continue;
    const id = str(dt.id);
    if (!id) continue;
    const dataType = str(dt.dataType);
    out.dataTypes.push({
      id,
      name: str(dt.name),
      dataType:
        dataType === "Enum" || dataType === "Workflow" || dataType === "Table"
          ? dataType
          : undefined,
    });
  }

  // sequences
  const seqs = readArray(parsed, "sequences");
  for (const s of seqs) {
    if (!isObject(s)) continue;
    const id = str(s.id);
    if (id) out.sequences.push({ id });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*                    Быстрые выборки                                 */
/* ------------------------------------------------------------------ */

export function getEntityIds(refs: DomainReferences): string[] {
  return refs.entities.map((e) => e.id);
}

export function getLinkageIds(refs: DomainReferences): string[] {
  return refs.linkages.map((l) => l.id);
}

export function getViewIdsByType(
  refs: DomainReferences,
  type: string,
): string[] {
  return refs.views.filter((v) => v.type === type).map((v) => v.id);
}

export function getAttributesOfEntity(
  refs: DomainReferences,
  entityId: string,
): AttributeInfo[] {
  return refs.attributes.filter((a) => a.entityId === entityId);
}

export function getDataTypeIds(
  refs: DomainReferences,
  kind?: DataTypeInfo["dataType"],
): string[] {
  return kind
    ? refs.dataTypes.filter((d) => d.dataType === kind).map((d) => d.id)
    : refs.dataTypes.map((d) => d.id);
}

export function getSequenceIds(refs: DomainReferences): string[] {
  return refs.sequences.map((s) => s.id);
}

/* ------------------------------------------------------------------ */
/*                         Утилиты                                    */
/* ------------------------------------------------------------------ */
function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readArray(obj: Record<string, unknown>, key: string): unknown[] {
  const value = obj[key];
  return Array.isArray(value) ? value : [];
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
