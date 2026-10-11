import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Collapse,
    IconButton,
    InputBase,
    Tooltip,
    Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import StorageIcon from '@mui/icons-material/Storage';
import LinkIcon from '@mui/icons-material/Link';
import ViewListIcon from '@mui/icons-material/ViewList';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CategoryIcon from '@mui/icons-material/Category';
import MenuIcon from '@mui/icons-material/Menu';
import RuleIcon from '@mui/icons-material/Rule';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useEditorStore } from '@/store/editorStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useWizardStore } from '@/store/wizardStore';
import { positionByPath } from '@/domain/positionByPath';
import { useOutlineGroups, type OutlineGroup } from '@/domain/outline';
import { usePanelLayoutStore } from '@/store/panelLayoutStore';
import { CollapsedPanelStrip } from './CollapsedPanelStrip';


const STORAGE_KEY_GROUPS = 'outline-panel-groups';

export function OutlinePanel() {
    const collapsed = usePanelLayoutStore((s) => s.collapsed.outline);
    const setCollapsedOutline = usePanelLayoutStore((s) => s.setCollapsed);
    const setCollapsed = (v: boolean) => setCollapsedOutline('outline', v);

    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set();
        const raw = window.localStorage.getItem(STORAGE_KEY_GROUPS);
        if (!raw) return new Set();
        try {
            return new Set(JSON.parse(raw) as string[]);
        } catch {
            return new Set();
        }
    });

    const [filter, setFilter] = useState('');
    const groups = useOutlineGroups();
    const openWizard = useWizardStore((s) => s.open);

    /* -------- Персистентность -------- */

    useEffect(() => {
        window.localStorage.setItem(
            STORAGE_KEY_GROUPS,
            JSON.stringify(Array.from(collapsedGroups))
        );
    }, [collapsedGroups]);

    /* -------- Фильтрация -------- */

    const filteredGroups = useMemo<OutlineGroup[]>(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return groups;

        return groups
            .map((g) => {
                const groupMatches = g.title.toLowerCase().includes(q);
                const items = groupMatches
                    ? g.items
                    : g.items.filter((it) => {
                        const label = it.label.toLowerCase();
                        const id = it.id.toLowerCase();
                        const hint = (it.hint ?? '').toLowerCase();
                        return (
                            label.includes(q) ||
                            id.includes(q) ||
                            hint.includes(q)
                        );
                    });
                return { ...g, items };
            })
            .filter((g) => g.items.length > 0);
    }, [groups, filter]);

    const totalFound = useMemo(
        () => filteredGroups.reduce((sum, g) => sum + g.items.length, 0),
        [filteredGroups]
    );

    /* -------- Управление группами -------- */

    const toggleGroup = (id: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    /* -------- Свёрнутый режим -------- */

    if (collapsed) {
        return (
            <CollapsedPanelStrip
                direction="left"
                title="Структура"
                status=""
                onExpand={() => setCollapsed(false)}
            />
        );
    }

    /* -------- Развёрнутый режим -------- */

    return (
        <Box
            data-tour="outline"
            sx={{
                width: 260,
                flex: '0 0 260px',
                borderRight: '1px solid #3c3c3c',
                bgcolor: '#252526',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            {/* Заголовок */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.75,
                    borderBottom: '1px solid #3c3c3c',
                    flexShrink: 0,
                }}
            >
                <Typography
                    sx={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        color: '#9d9d9d',
                        flex: 1,
                    }}
                >
                    Структура
                </Typography>
                <Tooltip title="Свернуть" arrow>
                    <IconButton
                        size="small"
                        onClick={() => setCollapsed(true)}
                        sx={{ color: '#7a7a7a', width: 22, height: 22 }}
                    >
                        <ChevronLeftIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Поиск */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.5,
                    borderBottom: '1px solid #3c3c3c',
                    flexShrink: 0,
                    bgcolor: '#1f1f20',
                }}
            >
                <SearchIcon sx={{ fontSize: 14, color: '#7a7a7a' }} />
                <InputBase
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Поиск по элементам…"
                    sx={{
                        flex: 1,
                        fontSize: 11.5,
                        color: '#d4d4d4',
                        '& input': { py: 0.5 },
                        '& input::placeholder': { color: '#5a5a5a' },
                    }}
                />
                {filter && (
                    <IconButton
                        size="small"
                        onClick={() => setFilter('')}
                        sx={{ color: '#7a7a7a', width: 18, height: 18 }}
                    >
                        <ClearIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                )}
            </Box>

            {/* Список */}
            <Box sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
                {groups.length === 0 ? (
                    <EmptyState onCreate={() => openWizard('entity.basic')} />
                ) : filteredGroups.length === 0 ? (
                    <Box sx={{ px: 1.5, py: 2 }}>
                        <Typography
                            sx={{ fontSize: 11, color: '#5a5a5a', lineHeight: 1.5 }}
                        >
                            Ничего не найдено
                            <br />
                            по запросу «{filter}»
                        </Typography>
                    </Box>
                ) : (
                    filteredGroups.map((group) => (
                        <GroupBlock
                            key={group.id}
                            group={group}
                            collapsed={
                                !filter.trim() && collapsedGroups.has(group.id)
                            }
                            onToggle={() => toggleGroup(group.id)}
                            onAdd={() => openAddWizard(group.id)}
                        />
                    ))
                )}
            </Box>

            {/* Футер: счётчик */}
            {filter.trim() && (
                <Box
                    sx={{
                        px: 1.5,
                        py: 0.5,
                        borderTop: '1px solid #3c3c3c',
                        bgcolor: '#1f1f20',
                        flexShrink: 0,
                    }}
                >
                    <Typography sx={{ fontSize: 10, color: '#5a5a5a' }}>
                        Найдено: {totalFound}
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                    Открытие визарда «добавить»                       */
/* ------------------------------------------------------------------ */

function openAddWizard(groupId: string) {
    const open = useWizardStore.getState().open;
    switch (groupId) {
        case 'entities':
            open('entity.basic');
            break;
        case 'linkages':
            open('linkage.basic');
            break;
        case 'views':
            open('view.list');
            break;
        case 'actions':
            open('action.crud');
            break;
        case 'menus':
            open('menu.root');
            break;
        case 'dataRules':
            open('rule.required');
            break;
        default:
            break;
    }
}

/* ------------------------------------------------------------------ */
/*                       Пустое состояние                              */
/* ------------------------------------------------------------------ */

function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
        <Box sx={{ px: 1.5, py: 2 }}>
            <Typography
                sx={{ fontSize: 11, color: '#5a5a5a', lineHeight: 1.5, mb: 1.5 }}
            >
                Документ пока пуст.
            </Typography>
            <Box
                onClick={onCreate}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.5,
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    fontSize: 11,
                    color: '#4fc1ff',
                    border: '1px dashed #3c3c3c',
                    '&:hover': {
                        borderColor: '#4fc1ff',
                        bgcolor: 'rgba(79, 193, 255, 0.08)',
                    },
                }}
            >
                <AddIcon sx={{ fontSize: 14 }} />
                Создать сущность
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                        Группа                                        */
/* ------------------------------------------------------------------ */

function GroupBlock({
    group,
    collapsed,
    onToggle,
    onAdd,
}: {
    group: OutlineGroup;
    collapsed: boolean;
    onToggle: () => void;
    onAdd: () => void;
}) {
    const Icon = iconFor(group.iconKind);
    const canAdd = canAddTo(group.id);

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.5,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.04)',
                        '& .outline-add-btn': { opacity: 1 },
                    },
                }}
                onClick={onToggle}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#7a7a7a',
                        transition: 'transform 0.15s',
                        transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                    }}
                >
                    <ChevronRightIcon sx={{ fontSize: 16 }} />
                </Box>
                <Icon sx={{ fontSize: 14, color: '#9d9d9d' }} />
                <Typography
                    sx={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: '#c8c8c8',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {group.title}
                </Typography>

                {canAdd && (
                    <Tooltip title="Добавить" arrow>
                        <IconButton
                            className="outline-add-btn"
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAdd();
                            }}
                            sx={{
                                width: 18,
                                height: 18,
                                color: '#9d9d9d',
                                opacity: 0,
                                transition: 'opacity 0.15s, color 0.15s',
                                '&:hover': { color: '#4fc1ff' },
                            }}
                        >
                            <AddIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                    </Tooltip>
                )}

                <Typography
                    sx={{
                        fontSize: 10,
                        color: '#5a5a5a',
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {group.items.length}
                </Typography>
            </Box>

            <Collapse in={!collapsed} timeout={120} unmountOnExit>
                <Box>
                    {group.items.map((item) => (
                        <OutlineRow key={item.id} groupId={group.id} item={item} />
                    ))}
                </Box>
            </Collapse>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                        Строка элемента                              */
/* ------------------------------------------------------------------ */

function OutlineRow({
    groupId,
    item,
}: {
    groupId: string;
    item: { id: string; label: string; hint?: string };
}) {
    const doc = useDocumentStore((s) => s.doc);
    const revealPosition = useEditorStore((s) => s.revealPosition);
    const cursorPath = useSelectionStore((s) => s.cursorPath);

    const isSelected = useMemo(() => {
        if (cursorPath[0] !== groupId) return false;
        return cursorPath[1] === item.id;
    }, [cursorPath, groupId, item.id]);

    const handleClick = () => {
        if (!doc) return;
        const pos = positionByPath(doc, [groupId, item.id]);
        if (pos) revealPosition(pos.line, pos.column);
    };

    return (
        <Tooltip title={item.id} placement="right" arrow enterDelay={600}>
            <Box
                onClick={handleClick}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    pl: 3,
                    pr: 1,
                    py: 0.35,
                    cursor: 'pointer',
                    userSelect: 'none',
                    bgcolor: isSelected ? 'rgba(14, 99, 156, 0.25)' : 'transparent',
                    '&:hover': {
                        bgcolor: isSelected
                            ? 'rgba(14, 99, 156, 0.35)'
                            : 'rgba(255, 255, 255, 0.04)',
                    },
                }}
            >
                <Typography
                    sx={{
                        fontSize: 11.5,
                        color: isSelected ? '#ffffff' : '#d4d4d4',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {item.label}
                </Typography>
                {item.hint && (
                    <Typography
                        sx={{
                            fontSize: 10,
                            color: '#5a5a5a',
                            fontFamily: "'JetBrains Mono', monospace",
                            flexShrink: 0,
                        }}
                    >
                        {item.hint}
                    </Typography>
                )}
            </Box>
        </Tooltip>
    );
}

/* ------------------------------------------------------------------ */
/*                        Иконки групп                                 */
/* ------------------------------------------------------------------ */

function iconFor(kind: OutlineGroup['iconKind']) {
    switch (kind) {
        case 'entity':
            return StorageIcon;
        case 'linkage':
            return LinkIcon;
        case 'view':
            return ViewListIcon;
        case 'action':
            return PlayArrowIcon;
        case 'dataType':
            return CategoryIcon;
        case 'menu':
            return MenuIcon;
        case 'rule':
            return RuleIcon;
        default:
            return StorageIcon;
    }
}

function canAddTo(groupId: string): boolean {
    return [
        'entities',
        'linkages',
        'views',
        'actions',
        'menus',
        'dataRules',
    ].includes(groupId);
}