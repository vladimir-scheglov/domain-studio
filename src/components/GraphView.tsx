import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPng, toSvg } from 'html-to-image';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,

  type EdgeMouseHandler,
  type NodeMouseHandler,
  MarkerType,
  Panel,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Divider, Tooltip, Typography } from '@mui/material';
import { useDocumentStore } from '@/store/documentStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useWizardStore } from '@/store/wizardStore';
import { buildGraph, LinkageEdgeData, type EntityNodeData } from '@/domain/graph';
import { deleteMany } from '@/domain/graphActions';
import { EntityNode } from './EntityNode';
import './GraphView.css';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LinkIcon from '@mui/icons-material/Link';
import { useEditorStore } from '@/store/editorStore';
import { positionByPath } from '@/domain/positionByPath';
import { ContextMenuItem, GraphContextMenu } from './GraphContextMenu';
import EditIcon from '@mui/icons-material/Edit';
import { useNotificationStore } from '@/store/notificationStore';

const nodeTypes = {
  entity: EntityNode,
};

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, color: '#707070' },
  style: { stroke: '#707070', strokeWidth: 1.5 },
  labelStyle: { fill: '#d4d4d4', fontSize: 11 },
  labelBgStyle: { fill: '#252526', fillOpacity: 0.85 },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 3,
};

export function GraphView() {
  return (
    <ReactFlowProvider>
      <GraphViewInner />
    </ReactFlowProvider>
  );
}

/* ------------------------------------------------------------------ */
/*                            Внутренний                              */
/* ------------------------------------------------------------------ */

function GraphViewInner() {
  const parsed = useDocumentStore((s) => s.parsed);
  const yaml = useDocumentStore((s) => s.yaml);
  const setYaml = useDocumentStore((s) => s.setYaml);
  const setCursorPath = useSelectionStore((s) => s.setCursorPath);
  const openWizard = useWizardStore((s) => s.open);
  const activeEntityId = useSelectionStore((s) => s.activeEntityId);
  const activeLinkageId = useSelectionStore((s) => s.activeLinkageId);

  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
    null
  );
  const [selectedLinkageId, setSelectedLinkageId] = useState<string | null>(
    null
  );

  const reactFlow = useReactFlow();

  const graph = useMemo(
    () => buildGraph(parsed, direction),
    [parsed, direction]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<EntityNodeData>(
    graph.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const isActive = n.id === activeEntityId;
        const wasActive = n.data.__active === true;
        if (isActive === wasActive) return n;
        return {
          ...n,
          data: { ...n.data, __active: isActive },
        };
      })
    );
  }, [activeEntityId, setNodes]);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => {
        const isActive = e.id === activeLinkageId;
        const wasActive = e.data?.__active === true;
        if (isActive === wasActive) return e;

        const data: LinkageEdgeData = {
          id: e.data?.id ?? e.id,
          label: e.data?.label ?? '',
          type: e.data?.type ?? '',
          __active: isActive,
        };

        const style = {
          ...(e.style ?? {}),
          stroke: isActive ? '#4fc1ff' : '#707070',
          strokeWidth: isActive ? 2.5 : 1.5,
        };

        // markerEnd держим неизменным, чтобы не ломать тип Edge
        const next: typeof e = {
          ...e,
          data,
          style,
          animated: isActive,
        };

        return next;
      })
    );
  }, [activeLinkageId, setEdges]);

  // авто-fit после изменения графа
  useEffect(() => {
    const id = setTimeout(() => {
      reactFlow.fitView({ padding: 0.2 });
    }, 100);
    return () => clearTimeout(id);
  }, [graph.nodes.length, graph.edges.length, reactFlow]);

  /* ---------------------- Обработчики ---------------------- */

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      setSelectedEntityId(node.id);
      setSelectedLinkageId(null);
      setCursorPath(['entities', node.id]);
    },
    [setCursorPath]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_e, edge) => {
      setSelectedLinkageId(edge.id);
      setSelectedEntityId(null);
      setCursorPath(['linkages', edge.id]);
    },
    [setCursorPath]
  );

  const onPaneClick = useCallback(() => {
    setSelectedEntityId(null);
    setSelectedLinkageId(null);
    setCursorPath([]);
  }, [setCursorPath]);

  /**
   * Протягивание от handle одного узла к handle другого.
   * Открываем визард связи с предзаполненными side1/side2.
   */
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const suggestedId = `${params.source}_${params.target}`;
      openWizard('linkage.basic', {
        side1: params.source,
        side2: params.target,
        id: suggestedId,
        type: '1_n',
      });
    },
    [openWizard]
  );

  /* ---------------------- Действия ---------------------- */

  const createEntity = () => openWizard('entity.basic');

  const createLinkage = () => openWizard('linkage.basic');

  const removeSelected = () => {
    if (!selectedEntityId && !selectedLinkageId) return;

    if (selectedEntityId) {
      const ok = window.confirm(
        `Удалить сущность «${selectedEntityId}» и все её связи?`
      );
      if (!ok) return;
      const result = deleteMany(yaml, { entities: [selectedEntityId] });
      setYaml(result.yaml, result.parsed, result.doc);
      setSelectedEntityId(null);
      setCursorPath([]);
      return;
    }

    if (selectedLinkageId) {
      const ok = window.confirm(
        `Удалить связь «${selectedLinkageId}»?`
      );
      if (!ok) return;
      const result = deleteMany(yaml, { linkages: [selectedLinkageId] });
      setYaml(result.yaml, result.parsed, result.doc);
      setSelectedLinkageId(null);
      setCursorPath([]);
    }
  };

  // Del удаляет выделенное
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return;
      // не срабатываем, если фокус в input / textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (selectedEntityId || selectedLinkageId) {
        e.preventDefault();
        removeSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntityId, selectedLinkageId, yaml]);

  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    target:
    | { kind: 'node'; id: string }
    | { kind: 'edge'; id: string }
    | { kind: 'pane' };
  } | null>(null);

  const revealPosition = useEditorStore((s) => s.revealPosition);
  const doc = useDocumentStore((s) => s.doc);

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (e, node) => {
      e.preventDefault();
      setMenu({
        x: e.clientX,
        y: e.clientY,
        target: { kind: 'node', id: node.id },
      });
    },
    []
  );

  const onEdgeContextMenu: EdgeMouseHandler = useCallback(
    (e, edge) => {
      e.preventDefault();
      setMenu({
        x: e.clientX,
        y: e.clientY,
        target: { kind: 'edge', id: edge.id },
      });
    },
    []
  );

  const onPaneContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    const mouseEvent = e as MouseEvent;
    setMenu({
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      target: { kind: 'pane' },
    });
  }, []);

  const notify = useNotificationStore((s) => s.notify);

  const menuItems: ContextMenuItem[] = useMemo(() => {
    if (!menu) return [];

    const closeMenu = () => setMenu(null);

    if (menu.target.kind === 'node') {
      const entityId = menu.target.id;
      return [
        {
          id: 'reveal',
          label: 'Открыть в редакторе',
          icon: <EditIcon sx={{ fontSize: 15 }} />,
          onClick: () => {
            if (!doc) {
              notify('Документ не распознан', 'warning');
              return;
            }
            const pos = positionByPath(doc, ['entities', entityId]);
            if (!pos) {
              notify(`Не найдена сущность «${entityId}»`, 'warning');
              return;
            }
            revealPosition(pos.line, pos.column);
            closeMenu();
          },
        },
        {
          id: 'addLinkage',
          label: 'Создать связь от этой сущности',
          icon: <LinkIcon sx={{ fontSize: 15 }} />,
          onClick: () => {
            openWizard('linkage.basic', { side1: entityId });
            closeMenu();
          },
        },
        {
          id: 'edit',
          label: 'Редактировать сущность',
          icon: <EditIcon sx={{ fontSize: 15 }} />,
          onClick: () => {
            // предзаполняем из parsed
            const parsed = useDocumentStore.getState().parsed;
            const entity =
              parsed &&
                typeof parsed === 'object' &&
                Array.isArray((parsed as { entities?: unknown[] }).entities)
                ? ((parsed as { entities: Record<string, unknown>[] }).entities.find(
                  (e) => e.id === entityId
                ) as Record<string, unknown> | undefined)
                : undefined;

            openWizard('entity.edit', {
              id: entityId,
              name: entity?.name ?? '',
              description: entity?.description ?? '',
              label: entity?.label ?? '',
              inherits: entity?.inherits ?? '',
            });
            closeMenu();
          },
          dividerBefore: true,
        },
        {
          id: 'addAttribute',
          label: 'Добавить атрибут',
          icon: <AddIcon sx={{ fontSize: 15 }} />,
          onClick: () => {
            openWizard('attr.string', { entityId });
            closeMenu();
          },
        },
        {
          id: 'delete',
          label: 'Удалить сущность',
          icon: <DeleteOutlineIcon sx={{ fontSize: 15 }} />,
          danger: true,
          dividerBefore: true,
          onClick: () => {
            const ok = window.confirm(
              `Удалить сущность «${entityId}» и все её связи?`
            );
            if (!ok) return;
            const result = deleteMany(yaml, { entities: [entityId] });
            setYaml(result.yaml, result.parsed, result.doc);
            setSelectedEntityId(null);
            closeMenu();
          },
        },
      ];
    }

    if (menu.target.kind === 'edge') {
      const linkageId = menu.target.id;
      return [
        {
          id: 'reveal',
          label: 'Открыть в редакторе',
          icon: <EditIcon sx={{ fontSize: 15 }} />,
          onClick: () => {
            if (!doc) {
              notify('Документ не распознан', 'warning');
              return;
            }
            const pos = positionByPath(doc, ['linkages', linkageId]);
            if (!pos) {
              notify(`Не найдена cвязь «${linkageId}»`, 'warning');
              return;
            }
            revealPosition(pos.line, pos.column);
            closeMenu();
          },
        },
        {
          id: 'edit',
          label: 'Редактировать связь',
          icon: <LinkIcon sx={{ fontSize: 15 }} />,
          onClick: () => {
            openWizard('linkage.basic', { id: linkageId });
            closeMenu();
          },
        },
        {
          id: 'delete',
          label: 'Удалить связь',
          icon: <DeleteOutlineIcon sx={{ fontSize: 15 }} />,
          danger: true,
          dividerBefore: true,
          onClick: () => {
            const ok = window.confirm(`Удалить связь «${linkageId}»?`);
            if (!ok) return;
            const result = deleteMany(yaml, { linkages: [linkageId] });
            setYaml(result.yaml, result.parsed, result.doc);
            setSelectedLinkageId(null);
            closeMenu();
          },
        },
      ];
    }

    // pane
    return [
      {
        id: 'addEntity',
        label: 'Создать сущность',
        icon: <AddIcon sx={{ fontSize: 15 }} />,
        onClick: () => {
          openWizard('entity.basic');
          closeMenu();
        },
      },
      {
        id: 'addLinkage',
        label: 'Создать связь',
        icon: <LinkIcon sx={{ fontSize: 15 }} />,
        onClick: () => {
          openWizard('linkage.basic');
          closeMenu();
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, doc, yaml, revealPosition, openWizard, setYaml]);

  const graphRef = useRef<HTMLDivElement>(null);

  const exportImage = useCallback(
    async (format: 'png' | 'svg') => {
      const node = graphRef.current;
      if (!node) {
        notify('Не найден контейнер графа', 'error');
        return;
      }

      // ищем внутренний viewport ReactFlow, а не весь Box
      const viewport = node.querySelector(
        '.react-flow__viewport'
      ) as HTMLElement | null;
      if (!viewport) {
        notify('Не найден viewport графа', 'error');
        return;
      }

      try {
        // Получаем bounding box всех узлов
        const bounds = getGraphBounds(reactFlow);
        const options = {
          backgroundColor: '#1e1e1e',
          width: bounds.width + 80,
          height: bounds.height + 80,
          style: {
            transform: `translate(${-bounds.x + 40}px, ${-bounds.y + 40}px)`,
            transformOrigin: 'top left',
          },
          pixelRatio: 2,
        };

        const dataUrl =
          format === 'png'
            ? await toPng(viewport, options)
            : await toSvg(viewport, options);

        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const fileName = `graph-${timestamp}.${format}`;

        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();

        notify(`Экспортировано: ${fileName}`, 'success');
      } catch (e) {
        notify(`Ошибка экспорта: ${String(e)}`, 'error', 5000);
      }
    },
    [notify, reactFlow]
  );

  const [collapsedUnresolved, setCollapsedUnresolved] = useState(false);

  /* ---------------------- Render ---------------------- */

  return (
    <Box className="graph-view" ref={graphRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2f2f2f"
        />
        <Controls position="bottom-right" />
        <MiniMap
          pannable
          zoomable
          nodeColor={() => '#0e639c'}
          maskColor="rgba(0, 0, 0, 0.6)"
          style={{ background: '#252526' }}
        />

        {/* Тулбар */}
        <Panel position="top-left">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              bgcolor: 'rgba(37, 37, 38, 0.95)',
              border: '1px solid #3c3c3c',
              borderRadius: 1,
              px: 0.5,
              py: 0.25,
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
            }}
          >
            <ToolbarButton
              icon={<AddIcon fontSize="small" />}
              label="Сущность"
              onClick={createEntity}
              tooltip="Создать сущность (Ctrl+K → «Базовая сущность»)"
            />

            <ToolbarButton
              icon={<LinkIcon fontSize="small" />}
              label="Связь"
              onClick={createLinkage}
              tooltip="Создать связь"
            />

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, borderColor: '#3c3c3c', my: 0.5 }}
            />

            <ToolbarButton
              icon={
                direction === 'TB' ? (
                  <ArrowDownwardIcon fontSize="small" />
                ) : (
                  <ArrowForwardIcon fontSize="small" />
                )
              }
              label={direction === 'TB' ? 'Вертикально' : 'Горизонтально'}
              onClick={() => setDirection(direction === 'TB' ? 'LR' : 'TB')}
              tooltip="Переключить раскладку"
              active
            />

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, borderColor: '#3c3c3c', my: 0.5 }}
            />

            <ToolbarButton
              icon={<FileDownloadIcon fontSize="small" />}
              label="PNG"
              tooltip="Скачать как PNG"
              onClick={() => {
                void exportImage('png');
              }}
            />

            <ToolbarButton
              icon={<FileDownloadIcon fontSize="small" />}
              label="SVG"
              tooltip="Скачать как SVG (векторный)"
              onClick={() => {
                void exportImage('svg');
              }}
            />

            {(selectedEntityId || selectedLinkageId) && (
              <>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ mx: 0.5, borderColor: '#3c3c3c', my: 0.5 }}
                />
                <ToolbarButton
                  icon={<DeleteOutlineIcon fontSize="small" />}
                  label="Удалить"
                  onClick={removeSelected}
                  tooltip="Удалить выделенный элемент (Del)"
                  danger
                />
              </>
            )}
          </Box>
        </Panel>

        {graph.unresolved.length > 0 && (
          <Panel position="top-right">
            <Box
              sx={{
                bgcolor: '#3c2a2a',
                border: '1px solid #7a3b3b',
                borderRadius: 1,
                px: 1.5,
                py: 0.75,
                width: 320,
              }}
            >
              <Box
                onClick={() => setCollapsedUnresolved(!collapsedUnresolved)}
                sx={{
                  bgcolor: '#3c2a2a',
                  borderBottom: collapsedUnresolved ? 'none' : '1px solid #7a3b3b',
                  px: 1.5,
                  py: 0.75,
                  width: 290,

                  display: 'flex',
                  
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' },
                }}
              >
                <ChevronRightIcon
                  sx={{
                    fontSize: 14,
                    color: 'rgb(212, 212, 212)',
                    transform: collapsedUnresolved ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.15s',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: 'rgb(212, 212, 212)',
                    flex: 1,
                  }}
                >
                  Не найдены сущности:
                </Typography>
                {graph.unresolved.length !== undefined && (
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: 'rgb(212, 212, 212)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {graph.unresolved.length}
                  </Typography>
                )}
              </Box>
              {!collapsedUnresolved && <Box>{graph.unresolved.join(', ')}</Box>}
            </Box>
          </Panel>
        )}

        {graph.nodes.length === 0 && (
          <Panel position="top-center">
            <Box
              sx={{
                mt: 6,
                textAlign: 'center',
                color: '#9d9d9d',
                pointerEvents: 'none',
              }}
            >
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                В документе пока нет сущностей
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>
                Нажмите «+ Сущность», чтобы создать первую
              </Typography>
            </Box>
          </Panel>
        )}
      </ReactFlow>
      {menu && (
        <GraphContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </Box>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
//type _N = Node;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
//type _E = Edge;

/* ------------------------------------------------------------------ */
/*                       Кнопка тулбара                               */
/* ------------------------------------------------------------------ */

type ToolbarButtonProps = {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
};

function ToolbarButton({
  icon,
  label,
  tooltip,
  onClick,
  danger,
  active,
}: ToolbarButtonProps) {
  const color = danger ? '#f48771' : active ? '#d4d4d4' : '#c8c8c8';
  const hoverBg = danger ? 'rgba(244, 135, 113, 0.12)' : 'rgba(255, 255, 255, 0.06)';

  return (
    <Tooltip title={tooltip} placement="bottom" arrow>
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.5,
          borderRadius: 0.75,
          cursor: 'pointer',
          userSelect: 'none',
          color,
          transition: 'background-color 0.15s, color 0.15s',
          '&:hover': {
            bgcolor: hoverBg,
            color: danger ? '#f8b3b3' : '#ffffff',
          },
          '&:active': {
            bgcolor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
          {icon}
        </Box>
        <Typography
          component="span"
          sx={{
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

/**
 * Считает общие границы всех узлов.
 * Использует nodeInternals — внутреннее API ReactFlow.
 */
function getGraphBounds(reactFlow: ReactFlowInstance<any, any>) {
  const rf = (reactFlow as unknown as {
    getNodes: () => Array<{
      position: { x: number; y: number };
      width?: number;
      height?: number;
    }>;
  });

  const nodes = rf.getNodes?.() ?? [];
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    const w = n.width ?? 200;
    const h = n.height ?? 60;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
