import dagre from "dagre";
import type { Edge, Node } from "reactflow";
import { collectReferences, type DomainReferences } from "./references";

export type EntityNodeData = {
  id: string;
  label: string;
  attributeCount: number;
  __active?: boolean;
};

export type LinkageEdgeData = {
  id: string;
  label: string;
  type: string;
  __active?: boolean;
};

export type BuildGraphResult = {
  nodes: Node<EntityNodeData>[];
  edges: Edge<LinkageEdgeData>[];
  /** id-шники, которые не удалось сопоставить — для подсветки проблем. */
  unresolved: string[];
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 64;

/* ------------------------------------------------------------------ */
/*                       Публичная функция                             */
/* ------------------------------------------------------------------ */

export function buildGraph(
  parsed: unknown,
  direction: "TB" | "LR" = "TB",
): BuildGraphResult {
  const refs = collectReferences(parsed);
  return buildFromReferences(refs, direction);
}

export function buildFromReferences(
  refs: DomainReferences,
  direction: "TB" | "LR" = "TB",
): BuildGraphResult {
  const unresolved = new Set<string>();

  // --- узлы -----------------------------------------------------
  const nodes: Node<EntityNodeData>[] = refs.entities.map((e) => ({
    id: e.id,
    type: "entity",
    position: { x: 0, y: 0 },
    data: {
      id: e.id,
      label: e.name ?? e.id,
      attributeCount: refs.attributes.filter((a) => a.entityId === e.id).length,
      __active: false,
    },
  }));

  const knownIds = new Set(refs.entities.map((e) => e.id));

  // --- рёбра -----------------------------------------------------
  const edges: Edge<LinkageEdgeData>[] = [];
  for (const l of refs.linkages) {
    const source = l.side1;
    const target = l.side2;

    if (!source || !target) continue;

    if (!knownIds.has(source)) unresolved.add(source);
    if (!knownIds.has(target)) unresolved.add(target);

    // даже если не нашлось — всё равно рисуем edge как «висячий»
    // ReactFlow справится, но Dagre не разложит.
    // Для простоты — пропускаем edges с неизвестными концами.
    if (!knownIds.has(source) || !knownIds.has(target)) continue;

    edges.push({
      id: l.id,
      source,
      target,
      type: "default",
      label: l.name ?? l.id,
      data: {
        id: l.id,
        label: l.name ?? l.id,
        type: l.type ?? "—",
      },
      animated: l.type === "n_n",
    });
  }

  // --- раскладка -------------------------------------------------
  const positioned = layout(nodes, edges, direction);

  return {
    nodes: positioned,
    edges,
    unresolved: Array.from(unresolved),
  };
}

/* ------------------------------------------------------------------ */
/*                       Раскладка Dagre                               */
/* ------------------------------------------------------------------ */

function layout(
  nodes: Node<EntityNodeData>[],
  edges: Edge[],
  direction: "TB" | "LR",
): Node<EntityNodeData>[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 90,
    marginx: 30,
    marginy: 30,
  });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}
