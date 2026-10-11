import { useMemo, useState, useEffect } from 'react';
import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    Tooltip,
    Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RuleIcon from '@mui/icons-material/Rule';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import LinkIcon from '@mui/icons-material/Link';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSelectionStore } from '@/store/selectionStore';
import { useWizardStore } from '@/store/wizardStore';
import { useDocumentStore } from '@/store/documentStore';
import { useRqlEditorStore } from '@/store/rqlEditorStore';
import { useEditorStore } from '@/store/editorStore';
import { useNotificationStore } from '@/store/notificationStore';
import { collectReferences } from '@/domain/references';
import { positionByPath } from '@/domain/positionByPath';
import { getContextSnippets } from '@/domain/contextSnippets';
import { applyPatch } from '@/domain/patch';
import {
    findField,
    resolveSchemaNode,
    type SchemaField,
    type SchemaNode,
} from '@/domain/schema';
import { deleteMany } from '@/domain/graphActions';
import { withHistory } from '@/services/historyService';
import { useMixinDiffStore } from '@/store/mixinDiffStore';
import { usePanelLayoutStore } from '@/store/panelLayoutStore';
import { CollapsedPanelStrip } from './CollapsedPanelStrip';
import StorageIcon from '@mui/icons-material/Storage';
import WidgetsIcon from '@mui/icons-material/Widgets';

const LS_COLLAPSE = 'inspector-collapsed-sections';

/* ------------------------------------------------------------------ */
/*                             Главный компонент                       */
/* ------------------------------------------------------------------ */

export function InspectorPanel() {
    const cursorPath = useSelectionStore((s) => s.cursorPath);
    const resolved = useMemo(() => resolveSchemaNode(cursorPath), [cursorPath]);

    const parsed = useDocumentStore((s) => s.parsed);
    const references = useMemo(() => collectReferences(parsed), [parsed]);

    const ctx = useMemo(
        () => deriveContext(cursorPath, references),
        [cursorPath, references]
    );

    const collapsed = usePanelLayoutStore((s) => s.collapsed.inspector);
    const setCollapsed = usePanelLayoutStore((s) => s.setCollapsed);

    // Свёрнутый режим
    if (collapsed) {
        const { icon, status, accent } = contextStatus(ctx, resolved);
        return (
            <CollapsedPanelStrip
                direction="right"
                title="Инспектор"
                status={status}
                icon={icon}
                accent={accent}
                onExpand={() => setCollapsed('inspector', false)}
            />
        );
    }

    return (
        <Box
            data-tour="inspector"
            sx={{
                width: 340,
                flex: '0 0 340px',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: '1px solid #3c3c3c',
                bgcolor: '#252526',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            <InspectorHeader
                path={cursorPath}
                title={resolved?.node.title ?? 'Контекст не распознан'}
                description={resolved?.node.description}
                ctx={ctx}
            />

            {ctx.hasContext && <ActionBar ctx={ctx} cursorPath={cursorPath} />}

            <InspectorBody
                node={resolved?.node}
                fieldName={resolved?.fieldName ?? null}
                cursorPath={cursorPath}
                ctx={ctx}
            />
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                             Header                                  */
/* ------------------------------------------------------------------ */

function InspectorHeader({
    path,
    title,
    description,
    ctx,
}: {
    path: (string | number)[];
    title: string;
    description?: string;
    ctx: InspectorContext;
}) {
    const doc = useDocumentStore((s) => s.doc);
    const revealPosition = useEditorStore((s) => s.revealPosition);
    const yaml = useDocumentStore((s) => s.yaml);
    const setYaml = useDocumentStore((s) => s.setYaml);
    const notify = useNotificationStore((s) => s.notify);

    const revealPath = (segmentPath: (string | number)[]) => {
        if (!doc) return;
        const pos = positionByPath(doc, segmentPath);
        if (pos) revealPosition(pos.line, pos.column);
    };

    const handleDelete = () => {
        if (!ctx.entityId && !ctx.linkageId) return;

        const target = ctx.entityId
            ? `сущность «${ctx.entityId}» и все её связи`
            : `связь «${ctx.linkageId}»`;
        if (!window.confirm(`Удалить ${target}?`)) return;

        const applied = withHistory(`Удаление ${ctx.entityId ?? ctx.linkageId}`, () => {
            const result = deleteMany(yaml, {
                entities: ctx.entityId ? [ctx.entityId] : undefined,
                linkages: ctx.linkageId ? [ctx.linkageId] : undefined,
            });
            setYaml(result.yaml, result.parsed, result.doc);
            return result;
        });

        if (applied) notify('Удалено', 'success', 2000);
    };

    return (
        <Box
            sx={{
                px: 2,
                pt: 1.5,
                pb: 1.25,
                borderBottom: '1px solid #3c3c3c',
                flexShrink: 0,
            }}
        >
            {/* Верхняя строка: ИНСПЕКТОР + быстрые действия */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography
                    sx={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        color: '#7a7a7a',
                        flex: 1,
                    }}
                >
                    Инспектор
                </Typography>

                <Tooltip title="Свернуть инспектор" arrow>
                    <IconButton
                        size="small"
                        onClick={() => usePanelLayoutStore.getState().setCollapsed('inspector', true)}
                        sx={{ color: '#7a7a7a', width: 22, height: 22 }}
                    >
                        <ChevronRightIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </Tooltip>

                {path.length > 0 && (
                    <Tooltip title="Перейти к элементу в редакторе" arrow>
                        <IconButton
                            size="small"
                            onClick={() => revealPath(path)}
                            sx={{ color: '#7a7a7a', width: 22, height: 22 }}
                        >
                            <MyLocationIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                    </Tooltip>
                )}

                {(ctx.entityId || ctx.linkageId) && (
                    <Tooltip title="Удалить" arrow>
                        <IconButton
                            size="small"
                            onClick={handleDelete}
                            sx={{
                                color: '#7a7a7a',
                                width: 22,
                                height: 22,
                                '&:hover': { color: '#f48771' },
                            }}
                        >
                            <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Заголовок */}
            <Typography
                sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}
            >
                {title}
            </Typography>

            {/* Путь-крошки */}
            {path.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 0.5,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                    }}
                >
                    {path.map((p, i) => (
                        <Box
                            key={i}
                            component="span"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                        >
                            {i > 0 && <span style={{ color: '#5a5a5a' }}>›</span>}
                            <Box
                                component="span"
                                onClick={() => revealPath(path.slice(0, i + 1))}
                                sx={{
                                    color: '#7a7a7a',
                                    cursor: 'pointer',
                                    borderBottom: '1px dashed transparent',
                                    '&:hover': {
                                        color: '#4fc1ff',
                                        borderBottomColor: '#4fc1ff',
                                    },
                                }}
                            >
                                {String(p)}
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}

            {description && (
                <Typography
                    sx={{
                        display: 'block',
                        mt: 0.75,
                        fontSize: 11,
                        color: '#9d9d9d',
                        lineHeight: 1.4,
                    }}
                >
                    {description}
                </Typography>
            )}
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                             ActionBar                               */
/* ------------------------------------------------------------------ */

function ActionBar({ ctx, cursorPath }: { ctx: InspectorContext, cursorPath: (string | number)[] }) {
    const openWizard = useWizardStore((s) => s.open);
    const openRql = useRqlEditorStore((s) => s.open);
    const yaml = useDocumentStore((s) => s.yaml);
    const setYaml = useDocumentStore((s) => s.setYaml);
    const notify = useNotificationStore((s) => s.notify);

    const actions: ActionButtonProps[] = [];

    // Правила данных
    if (ctx.entityId) {
        actions.push(
            {
                icon: <RuleIcon sx={{ fontSize: 14 }} />,
                label: 'Обязательность',
                tooltip: 'Атрибут станет обязательным при условии',
                onClick: () =>
                    openWizard('rule.required', {
                        entityId: ctx.entityId,
                        attributeId: ctx.attributeId ?? '',
                    }),
            },
            {
                icon: <VisibilityOffIcon sx={{ fontSize: 14 }} />,
                label: 'Скрытие',
                tooltip: 'Атрибут будет скрыт при условии',
                onClick: () =>
                    openWizard('rule.hidden', {
                        entityId: ctx.entityId,
                        attributeId: ctx.attributeId ?? '',
                    }),
            },
            {
                icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />,
                label: 'Allowed',
                tooltip: 'Ограничить список значений',
                onClick: () =>
                    openWizard('rule.allowed', {
                        entityId: ctx.entityId,
                        attributeId: ctx.attributeId ?? '',
                    }),
            }
        );
    }

    // Генерация CRUD
    if (ctx.entityId) {
        const prefix = String(ctx.entityId).toLowerCase();
        actions.push(
            {
                icon: <ListAltIcon sx={{ fontSize: 14 }} />,
                label: 'Список',
                tooltip: 'Списочное представление',
                onClick: () => openWizard('view.list', { entityId: ctx.entityId }),
            },
            {
                icon: <PlaylistAddCheckIcon sx={{ fontSize: 14 }} />,
                label: 'CRUD',
                tooltip: 'Полный CRUD: список, панель, модалка, действия, меню',
                onClick: () =>
                    openWizard('scenario.fromEntity', {
                        entityId: ctx.entityId,
                        prefix,
                    }),
            }
        );
    }

    // Связь
    if (ctx.linkageId) {
        actions.push({
            icon: <LinkIcon sx={{ fontSize: 14 }} />,
            label: 'Редактировать',
            tooltip: 'Открыть визард связи',
            onClick: () => openWizard('linkage.basic', { id: ctx.linkageId }),
        });
    }

    if (cursorPath[0] === 'mixins' && typeof cursorPath[1] === 'string') {
        actions.push({
            icon: <CodeIcon sx={{ fontSize: 14 }} />,
            label: 'Просмотр',
            tooltip: 'Показать содержимое миксина',
            onClick: () => useMixinDiffStore.getState().show(cursorPath[1] as string),
        });
    }

    // RQL — всегда
    actions.push({
        icon: <CodeIcon sx={{ fontSize: 14 }} />,
        label: 'RQL',
        tooltip: 'Открыть RQL-редактор',
        onClick: () =>
            openRql({
                value: '',
                title: 'RQL',
                help: 'Введите выражение и скопируйте его в нужное место.',
                onApply: () => {
                    /* noop */
                },
            }),
    });

    void yaml;
    void setYaml;
    void notify;

    return (
        <Box
            sx={{
                px: 1.5,
                py: 1,
                borderBottom: '1px solid #3c3c3c',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                flexShrink: 0,
                bgcolor: '#1f1f20',
            }}
        >
            {actions.map((a, i) => (
                <ActionButton key={i} {...a} />
            ))}
        </Box>
    );
}

type ActionButtonProps = {
    icon: React.ReactNode;
    label: string;
    tooltip: string;
    onClick: () => void;
};

function ActionButton({ icon, label, tooltip, onClick }: ActionButtonProps) {
    return (
        <Tooltip title={tooltip} placement="top" arrow>
            <Button
                size="small"
                variant="text"
                startIcon={icon}
                onClick={onClick}
                sx={{
                    fontSize: 11,
                    textTransform: 'none',
                    color: '#c8c8c8',
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    px: 0.75,
                    py: 0.3,
                    minHeight: 22,
                    borderRadius: 0.75,
                    '&:hover': {
                        bgcolor: 'rgba(79, 193, 255, 0.12)',
                        color: '#ffffff',
                    },
                    '& .MuiButton-startIcon': {
                        mr: 0.5,
                        '& > *:nth-of-type(1)': { fontSize: 14 },
                    },
                }}
            >
                {label}
            </Button>
        </Tooltip>
    );
}

/* ------------------------------------------------------------------ */
/*                             Body                                    */
/* ------------------------------------------------------------------ */

function InspectorBody({
    node,
    fieldName,
    cursorPath,
    ctx,
}: {
    node: SchemaNode | undefined;
    fieldName: string | null;
    cursorPath: (string | number)[];
    ctx: InspectorContext;
}) {
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
        if (typeof window === 'undefined') return {};
        try {
            const raw = window.localStorage.getItem(LS_COLLAPSE);
            return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        window.localStorage.setItem(LS_COLLAPSE, JSON.stringify(collapsed));
    }, [collapsed]);

    const toggle = (key: string) =>
        setCollapsed((c) => ({ ...c, [key]: !c[key] }));

    const parsed = useDocumentStore((s) => s.parsed);

    // Реальные ключи блока
    const actualNode = useMemo(
        () => getNodeAtPath(parsed, cursorPath),
        [parsed, cursorPath]
    );

    const actualKeys = useMemo<string[]>(() => {
        if (
            !actualNode ||
            typeof actualNode !== 'object' ||
            Array.isArray(actualNode)
        ) {
            return [];
        }
        return Object.keys(actualNode as Record<string, unknown>);
    }, [actualNode]);

    const availableFields = useMemo<SchemaField[]>(() => {
        if (!node) return [];
        const set = new Set(actualKeys);
        return node.fields.filter((f) => !set.has(f.name));
    }, [node, actualKeys]);

    if (!node) {
        return (
            <Box sx={{ flex: 1, p: 2 }}>
                <Typography sx={{ fontSize: 12, color: '#7a7a7a' }}>
                    Поставьте курсор на элемент схемы, чтобы увидеть справку.
                </Typography>
            </Box>
        );
    }

    const currentField = fieldName ? findField(node, fieldName) : undefined;

    return (
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {/* --- Наполнение --- */}
            <Section
                title="Наполнение"
                count={actualKeys.length}
                collapsed={collapsed['actual'] ?? false}
                onToggle={() => toggle('actual')}
            >
                {actualKeys.length === 0 ? (
                    <Typography
                        sx={{
                            fontSize: 11,
                            color: '#7a7a7a',
                            fontStyle: 'italic',
                            py: 0.5,
                            px: 2,
                        }}
                    >
                        Блок пока пуст
                    </Typography>
                ) : (
                    <Box sx={{ px: 1, pb: 1 }}>
                        {actualKeys.map((key) => (
                            <ActualFieldRow
                                key={key}
                                name={key}
                                value={(actualNode as Record<string, unknown>)[key]}
                                active={key === fieldName}
                                schemaField={node.fields.find((f) => f.name === key)}
                            />
                        ))}
                    </Box>
                )}
            </Section>

            {/* --- Поле под курсором --- */}
            {currentField && (
                <Section
                    title="Поле под курсором"
                    collapsed={collapsed['current'] ?? false}
                    onToggle={() => toggle('current')}
                >
                    <Box sx={{ px: 2, pb: 1.5 }}>
                        <FieldDetails field={currentField} active />
                    </Box>
                </Section>
            )}

            {/* --- Доступные поля --- */}
            {availableFields.length > 0 && (
                <Section
                    title="Доступные поля"
                    count={availableFields.length}
                    collapsed={collapsed['available'] ?? true}
                    onToggle={() => toggle('available')}
                >
                    <Box sx={{ px: 1, pb: 1 }}>
                        {availableFields.map((field) => (
                            <AvailableFieldRow key={field.name} field={field} />
                        ))}
                    </Box>
                </Section>
            )}

            {/* --- Сниппеты --- */}
            <SnippetsSection
                cursorPath={cursorPath}
                ctx={ctx}
                collapsed={collapsed['snippets'] ?? true}
                onToggle={() => toggle('snippets')}
            />
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                        Секция-аккордеон                             */
/* ------------------------------------------------------------------ */

function Section({
    title,
    count,
    collapsed,
    onToggle,
    children,
}: {
    title: string;
    count?: number;
    collapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <Box sx={{ borderBottom: '1px solid #2a2a2a' }}>
            <Box
                onClick={onToggle}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.75,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' },
                }}
            >
                <ChevronRightIcon
                    sx={{
                        fontSize: 14,
                        color: '#7a7a7a',
                        transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                        transition: 'transform 0.15s',
                    }}
                />
                <Typography
                    sx={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: '#9d9d9d',
                        flex: 1,
                    }}
                >
                    {title}
                </Typography>
                {count !== undefined && (
                    <Typography
                        sx={{
                            fontSize: 10,
                            color: '#5a5a5a',
                            fontFamily: "'JetBrains Mono', monospace",
                        }}
                    >
                        {count}
                    </Typography>
                )}
            </Box>
            {!collapsed && <Box>{children}</Box>}
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                       Сниппеты                                       */
/* ------------------------------------------------------------------ */

function SnippetsSection({
    cursorPath,
    ctx,
    collapsed,
    onToggle,
}: {
    cursorPath: (string | number)[];
    ctx: InspectorContext;
    collapsed: boolean;
    onToggle: () => void;
}) {
    const yaml = useDocumentStore((s) => s.yaml);
    const setYaml = useDocumentStore((s) => s.setYaml);
    const parsed = useDocumentStore((s) => s.parsed);
    const notify = useNotificationStore((s) => s.notify);
    const openWizard = useWizardStore((s) => s.open);
    const revealPosition = useEditorStore((s) => s.revealPosition);

    const snippets = useMemo(
        () => getContextSnippets(cursorPath, parsed),
        [cursorPath, parsed]
    );

    if (snippets.length === 0) return null;

    return (
        <Section
            title="Сниппеты"
            count={snippets.length}
            collapsed={collapsed}
            onToggle={onToggle}
        >
            <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {snippets.map((s) => {
                    const disabled = s.generate({ parsed, cursorPath }) === null;

                    return (
                        <Tooltip
                            key={s.id}
                            title={disabled ? 'Уже настроено' : s.description}
                            arrow
                        >
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={disabled}
                                    onClick={() => {
                                        if (s.id === 'attr.enum') {
                                            openWizard('attr.enum', {
                                                entityId: ctx.entityId ?? '',
                                            });
                                            return;
                                        }

                                        const liveParsed = useDocumentStore.getState().parsed;
                                        const generated = s.generate({
                                            parsed: liveParsed,
                                            cursorPath,
                                        });
                                        if (!generated) return;

                                        const applied = withHistory(`Сниппет: ${s.label}`, () => {
                                            const patch = {
                                                yaml: generated.yaml,
                                                mergeStrategy: s.mergeStrategy,
                                                targetPath: s.targetPath,
                                            };
                                            const result = applyPatch(yaml, patch);
                                            setYaml(result.yaml, result.parsed, result.doc);
                                            return result;
                                        });

                                        if (!applied) {
                                            notify('Не удалось вставить', 'error');
                                            return;
                                        }

                                        notify(`Вставлено: ${s.label}`, 'success', 2000);

                                        if (generated.focusPath && applied.doc) {
                                            const pos = positionByPath(
                                                applied.doc,
                                                generated.focusPath
                                            );
                                            if (pos) {
                                                setTimeout(
                                                    () => revealPosition(pos.line, pos.column),
                                                    50
                                                );
                                            }
                                        }
                                    }}
                                    sx={{
                                        fontSize: 11,
                                        textTransform: 'none',
                                        color: '#dcdcaa',
                                        borderColor: '#3c3c3c',
                                        bgcolor: '#2d2d30',
                                        px: 0.75,
                                        py: 0.3,
                                        minHeight: 22,
                                        '&:hover': {
                                            bgcolor: '#37373d',
                                            borderColor: '#0e639c',
                                        },
                                    }}
                                >
                                    {s.label}
                                </Button>
                            </span>
                        </Tooltip>
                    );
                })}
            </Box>
        </Section>
    );
}

/* ------------------------------------------------------------------ */
/*                        Поля                                         */
/* ------------------------------------------------------------------ */

function FieldDetails({
    field,
    active,
}: {
    field: SchemaField;
    active?: boolean;
}) {
    return (
        <Box
            sx={{
                border: '1px solid',
                borderColor: active ? '#0e639c' : '#3c3c3c',
                borderRadius: 1,
                px: 1.25,
                py: 1,
                bgcolor: active ? 'rgba(14, 99, 156, 0.12)' : 'transparent',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#dcdcaa',
                    }}
                >
                    {field.name}
                </Typography>
                {field.required && (
                    <Chip
                        label="required"
                        size="small"
                        sx={{
                            height: 16,
                            fontSize: 9,
                            bgcolor: 'rgba(220, 100, 100, 0.15)',
                            color: '#e88',
                            '& .MuiChip-label': { px: 0.75 },
                        }}
                    />
                )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <TypeBadge type={field.type} />
                {field.refTo && (
                    <Typography sx={{ fontSize: 10, color: '#7a7a7a' }}>
                        ссылка на {field.refTo}
                    </Typography>
                )}
            </Box>

            {field.description && (
                <Typography
                    sx={{ mt: 0.75, fontSize: 11, color: '#9d9d9d', lineHeight: 1.4 }}
                >
                    {field.description}
                </Typography>
            )}
        </Box>
    );
}

function ActualFieldRow({
    name,
    value,
    active,
    schemaField,
}: {
    name: string;
    value: unknown;
    active?: boolean;
    schemaField?: SchemaField;
}) {
    return (
        <Tooltip
            title={schemaField?.description ?? ''}
            placement="left"
            arrow
            disableHoverListener={!schemaField?.description}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.5,
                    px: 1,
                    borderRadius: 0.5,
                    cursor: 'default',
                    bgcolor: active ? 'rgba(14, 99, 156, 0.2)' : 'transparent',
                    '&:hover': {
                        bgcolor: active
                            ? 'rgba(14, 99, 156, 0.25)'
                            : 'rgba(255, 255, 255, 0.03)',
                    },
                }}
            >
                <Typography
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11.5,
                        color: active ? '#ffffff' : '#dcdcaa',
                        flexShrink: 0,
                        fontWeight: active ? 600 : 500,
                    }}
                >
                    {name}
                </Typography>
                <Typography
                    component="span"
                    sx={{
                        color: '#7a7a7a',
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    : {formatValueShort(value)}
                </Typography>
            </Box>
        </Tooltip>
    );
}

function AvailableFieldRow({ field }: { field: SchemaField }) {
    return (
        <Tooltip
            title={field.description ?? ''}
            placement="left"
            arrow
            disableHoverListener={!field.description}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.4,
                    px: 1,
                    borderRadius: 0.5,
                    cursor: 'default',
                    opacity: 0.55,
                    '&:hover': {
                        opacity: 0.9,
                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                    },
                }}
            >
                <Box
                    sx={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: '#5a5a5a',
                        flexShrink: 0,
                    }}
                />
                <Typography
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: '#9d9d9d',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {field.name}
                </Typography>
                {field.required && (
                    <Typography sx={{ fontSize: 10, color: '#e88', flexShrink: 0 }}>
                        *
                    </Typography>
                )}
                <TypeBadge type={field.type} compact />
            </Box>
        </Tooltip>
    );
}

function TypeBadge({
    type,
    compact,
}: {
    type: SchemaField['type'];
    compact?: boolean;
}) {
    const { label, color } = typeInfo(type);
    return (
        <Box
            sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: compact ? 10 : 11,
                color,
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 0.5,
                px: compact ? 0.5 : 0.75,
                py: compact ? 0.1 : 0.2,
                lineHeight: 1.4,
                flexShrink: 0,
            }}
        >
            {label}
        </Box>
    );
}

function typeInfo(t: SchemaField['type']): { label: string; color: string } {
    switch (t) {
        case 'string':
            return { label: 'str', color: '#ce9178' };
        case 'number':
            return { label: 'num', color: '#b5cea8' };
        case 'boolean':
            return { label: 'bool', color: '#569cd6' };
        case 'array':
            return { label: '[]', color: '#c586c0' };
        case 'object':
            return { label: '{}', color: '#4ec9b0' };
        case 'enum':
            return { label: 'enum', color: '#dcdcaa' };
        case 'ref':
            return { label: 'ref', color: '#4fc1ff' };
        default:
            return { label: String(t), color: '#d4d4d4' };
    }
}

/* ------------------------------------------------------------------ */
/*                    Контекст и утилиты                                */
/* ------------------------------------------------------------------ */

type InspectorContext = {
    hasContext: boolean;
    entityId: string | null;
    attributeId: string | null;
    linkageId: string | null;
    mixinId: string | null;
};

function deriveContext(
    cursorPath: (string | number)[],
    references: ReturnType<typeof collectReferences>
): InspectorContext {
    let entityId: string | null = null;
    let attributeId: string | null = null;
    let linkageId: string | null = null;
    let mixinId = null;

    if (cursorPath[0] === 'entities') {
        if (typeof cursorPath[1] === 'string') entityId = cursorPath[1];
        else if (typeof cursorPath[1] === 'number') {
            entityId = references.entities[cursorPath[1]]?.id ?? null;
        }
        if (cursorPath[2] === 'attributes') {
            if (typeof cursorPath[3] === 'string') attributeId = cursorPath[3];
            else if (typeof cursorPath[3] === 'number') {
                const attrs = references.attributes.filter(
                    (a) => a.entityId === entityId
                );
                attributeId = attrs[cursorPath[3]]?.id ?? null;
            }
        }
    }

    if (cursorPath[0] === 'linkages') {
        if (typeof cursorPath[1] === 'string') linkageId = cursorPath[1];
        else if (typeof cursorPath[1] === 'number') {
            linkageId = references.linkages[cursorPath[1]]?.id ?? null;
        }
    }

    if (cursorPath[0] === 'mixins') {
        if (typeof cursorPath[1] === 'string') mixinId = cursorPath[1];
    }

    return {
        hasContext: Boolean(entityId || linkageId || mixinId),   // ← mixinId тоже
        entityId,
        attributeId,
        linkageId,
        mixinId,
    };
}

function getNodeAtPath(root: unknown, path: (string | number)[]): unknown {
    let node: unknown = root;
    for (const seg of path) {
        if (node === null || node === undefined) return undefined;
        if (Array.isArray(node)) {
            if (typeof seg === 'number') {
                node = node[seg];
                continue;
            }
            if (typeof seg === 'string') {
                node = node.find(
                    (it) =>
                        typeof it === 'object' &&
                        it !== null &&
                        (it as Record<string, unknown>).id === seg
                );
                continue;
            }
            return undefined;
        }
        if (typeof node === 'object') {
            node = (node as Record<string, unknown>)[seg];
            continue;
        }
        return undefined;
    }
    return node;
}

function formatValueShort(v: unknown, maxLen = 60): string {
    if (v === null) return 'null';
    if (v === undefined) return '';
    if (typeof v === 'string') {
        const s = v.replace(/\s+/g, ' ').trim();
        return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
    }
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) {
        if (v.length === 0) return '[]';
        const preview = v
            .slice(0, 3)
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                    const id = (item as Record<string, unknown>).id;
                    if (typeof id === 'string') return id;
                    return '{…}';
                }
                return String(item);
            })
            .join(', ');
        const suffix = v.length > 3 ? `, +${v.length - 3}` : '';
        return `[${v.length}: ${preview}${suffix}]`;
    }
    if (typeof v === 'object') {
        const keys = Object.keys(v as Record<string, unknown>);
        return `{${keys.length} ${plural(keys.length, 'поле', 'поля', 'полей')}}`;
    }
    return String(v);
}

function plural(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

function contextStatus(
    ctx: InspectorContext,
    resolved: { node: SchemaNode; fieldName: string | null } | null
): { icon: React.ReactNode; status: string; accent: string } {
    if (ctx.entityId) {
        const attr = ctx.attributeId ? ` › ${ctx.attributeId}` : '';
        return {
            icon: <StorageIcon sx={{ fontSize: 14 }} />,
            status: `${ctx.entityId}${attr}`,
            accent: '#4fc1ff',
        };
    }

    if (ctx.linkageId) {
        return {
            icon: <LinkIcon sx={{ fontSize: 14 }} />,
            status: ctx.linkageId,
            accent: '#dcdcaa',
        };
    }

    if (ctx.mixinId) {
        return {
            icon: <WidgetsIcon sx={{ fontSize: 14 }} />,
            status: `примесь: ${ctx.mixinId}`,
            accent: '#4ec9b0',
        };
    }

    if (resolved) {
        return {
            icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />,
            status: resolved.node.title,
            accent: '#7a7a7a',
        };
    }

    return {
        icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />,
        status: 'нет контекста',
        accent: '#5a5a5a',
    };
}

// отключаем неиспользуемый импорт
void Divider;
void InfoOutlinedIcon;
void ExpandMoreIcon;