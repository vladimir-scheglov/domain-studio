import { useState } from 'react';
import {
    Box,
    Button,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AssignmentIcon from '@mui/icons-material/Assignment';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import BuildIcon from '@mui/icons-material/Build';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import WidgetsIcon from '@mui/icons-material/Widgets';
import SortIcon from '@mui/icons-material/Sort';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import DownloadIcon from '@mui/icons-material/Download';

import { useDocumentStore } from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';
import {
    undoLastAction,
    redoLastAction,
    getLastActionLabel,
    getNextRedoLabel,
} from '@/services/historyService';
import { useSettingsDialogStore } from '@/store/settingsDialogStore';
import { useHelpStore } from '@/store/helpStore';
import { useCoverageStore } from '@/store/coverageStore';
import { usePresetDialogStore } from '@/store/presetDialogStore';
import { useMixinLibraryStore } from '@/store/mixinLibraryStore';
import { useMixinPriorityStore } from '@/store/mixinPriorityStore';
import { WizardsMenu } from './WizardsMenu';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { compareWithFile } from '@/services/diffService';
import { usePresetStore } from '@/store/presetStore';
import { compareWithPreset } from '@/services/diffService';

type ViewMode = 'editor' | 'graph';

type AppToolbarProps = {
    viewMode: ViewMode;
    setViewMode: (v: ViewMode) => void;
    onOpen: () => void;
    onSave: () => void;
    onSaveAs: () => void;
    onCopyYaml: () => void;
    onFormat: (mode: 'soft' | 'strict') => void;
};

export function AppToolbar({
    viewMode,
    setViewMode,
    onOpen,
    onSave,
    onSaveAs,
    onCopyYaml,
    onFormat,
}: AppToolbarProps) {
    const fileName = useDocumentStore((s) => s.fileName);
    const dirty = useDocumentStore((s) => s.dirty);

    const canUndo = useHistoryStore((s) => s.past.length > 0);
    const canRedo = useHistoryStore((s) => s.future.length > 0);

    const toggleSettings = useSettingsDialogStore((s) => s.toggle);
    const toggleHelp = useHelpStore((s) => s.toggle);

    const [fileAnchor, setFileAnchor] = useState<HTMLElement | null>(null);
    const [toolsAnchor, setToolsAnchor] = useState<HTMLElement | null>(null);

    const closeFileMenu = () => setFileAnchor(null);
    const closeToolsMenu = () => setToolsAnchor(null);

    return (
        <Box
            component="header"
            sx={{
                display: 'flex',
                alignItems: 'center',
                height: 40,
                flexShrink: 0,
                borderBottom: '1px solid #3c3c3c',
                bgcolor: '#252526',
                px: 1,
                gap: 0.5,
                overflow: 'hidden',
                minWidth: 0,
            }}
        >
            {/* Логотип */}
            <Typography
                sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    px: 0.75,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                }}
            >
                Domain Studio
            </Typography>

            <ToolbarDivider />

            {/* Файл — с текстом */}
            <ToolbarButton
                icon={<FolderOpenIcon sx={{ fontSize: 15 }} />}
                label="Открыть"
                tooltip="Открыть файл (Ctrl+O)"
                onClick={onOpen}
                endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 12 }} />}
                onClickWithAnchor={(e) => setFileAnchor(e.currentTarget)}
            />

            <ToolbarButton
                icon={<SaveIcon sx={{ fontSize: 15 }} />}
                label="Сохранить"
                tooltip={
                    fileName
                        ? `Сохранить ${fileName}${dirty ? ' •' : ''} (Ctrl+S)`
                        : 'Сохранить (Ctrl+S)'
                }
                onClick={onSave}
                accent={dirty}
            />

            <ToolbarDivider />

            {/* Правка */}
            <Tooltip
                title={
                    canUndo
                        ? `Отменить: ${getLastActionLabel() ?? ''} (Ctrl+Z)`
                        : 'Нечего отменять'
                }
                arrow
            >
                <span>
                    <IconButton
                        size="small"
                        disabled={!canUndo}
                        onClick={undoLastAction}
                        sx={iconButtonSx}
                    >
                        <UndoIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                </span>
            </Tooltip>

            <Tooltip
                title={
                    canRedo
                        ? `Повторить: ${getNextRedoLabel() ?? ''} (Ctrl+Shift+Z)`
                        : 'Нечего повторять'
                }
                arrow
            >
                <span>
                    <IconButton
                        size="small"
                        disabled={!canRedo}
                        onClick={redoLastAction}
                        sx={iconButtonSx}
                    >
                        <RedoIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                </span>
            </Tooltip>

            <ToolbarDivider />

            {/* Визарды */}
            <WizardsMenu />

            <ToolbarDivider />

            {/* Переключатель вида */}
            <Tabs
                value={viewMode}
                data-tour="view-tabs"
                onChange={(_, v) => setViewMode(v)}
                TabIndicatorProps={{ style: { display: 'none' } }}
                sx={{
                    minHeight: 28,
                    '& .MuiTab-root': {
                        minHeight: 28,
                        minWidth: 'auto',
                        px: 1.25,
                        fontSize: 12,
                        textTransform: 'none',
                        color: '#9d9d9d',
                        borderRadius: 0.75,
                    },
                    '& .Mui-selected': {
                        color: '#ffffff',
                        bgcolor: 'rgba(14, 99, 156, 0.35)',
                    },
                }}
            >
                <Tab value="editor" label="Редактор" />
                <Tab value="graph" label="Диаграмма" />
            </Tabs>

            <Box sx={{ flex: 1 }} />

            {/* Инструменты ▼ */}
            <ToolbarButton
                icon={<BuildIcon sx={{ fontSize: 15 }} />}
                label="Инструменты"
                tooltip="Дополнительные инструменты"
                endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 12 }} />}
                onClick={() => setToolsAnchor(null)}
                onClickWithAnchor={(e) => setToolsAnchor(e.currentTarget)}
            />

            {/* Справка и настройки */}
            <Box data-tour="help-settings" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title="Горячие клавиши (Ctrl+Shift+/)" arrow>
                    <IconButton
                        size="small"
                        onClick={toggleHelp}
                        sx={iconButtonSx}
                    >
                        <HelpOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Настройки (Ctrl+,)" arrow>
                    <IconButton
                        size="small"
                        onClick={toggleSettings}
                        sx={iconButtonSx}
                    >
                        <SettingsIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* ----- Меню файла ----- */}
            <Menu
                anchorEl={fileAnchor}
                open={Boolean(fileAnchor)}
                onClose={closeFileMenu}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: '#252526',
                            backgroundImage: 'none',
                            border: '1px solid #3c3c3c',
                            borderRadius: 1.5,
                            minWidth: 260,
                            mt: 0.5,
                        },
                    },
                }}
            >
                <FileMenuItem
                    icon={<FolderOpenIcon sx={{ fontSize: 15 }} />}
                    label="Открыть…"
                    hint="Ctrl+O"
                    onClick={() => {
                        closeFileMenu();
                        onOpen();
                    }}
                />
                <FileMenuItem
                    icon={<SaveIcon sx={{ fontSize: 15 }} />}
                    label="Сохранить"
                    hint="Ctrl+S"
                    onClick={() => {
                        closeFileMenu();
                        onSave();
                    }}
                />
                <FileMenuItem
                    icon={<SaveIcon sx={{ fontSize: 15 }} />}
                    label="Сохранить как…"
                    hint="Ctrl+Shift+S"
                    onClick={() => {
                        closeFileMenu();
                        onSaveAs();
                    }}
                />
                <Divider sx={{ my: 0.5, borderColor: '#3c3c3c' }} />
                <FileMenuItem
                    icon={<ContentCopyIcon sx={{ fontSize: 15 }} />}
                    label="Скопировать YAML"
                    hint="Ctrl+Shift+C"
                    onClick={() => {
                        closeFileMenu();
                        onCopyYaml();
                    }}
                />
                <FileMenuItem
                    icon={<DownloadIcon sx={{ fontSize: 15 }} />}
                    label="Скачать как YAML"
                    onClick={() => {
                        closeFileMenu();
                        onSaveAs();
                    }}
                />
            </Menu>

            {/* ----- Меню инструментов ----- */}
            <Menu
                anchorEl={toolsAnchor}
                open={Boolean(toolsAnchor)}
                onClose={closeToolsMenu}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: '#252526',
                            backgroundImage: 'none',
                            border: '1px solid #3c3c3c',
                            borderRadius: 1.5,
                            minWidth: 280,
                            mt: 0.5,
                        },
                    },
                }}
            >
                <ToolSectionLabel>Схема</ToolSectionLabel>
                <ToolMenuItem
                    icon={<BookmarkIcon sx={{ fontSize: 15 }} />}
                    label="Пресеты схем"
                    hint="Ctrl+Shift+T"
                    onClick={() => {
                        closeToolsMenu();
                        usePresetDialogStore.getState().toggle();
                    }}
                />
                <ToolMenuItem
                    icon={<AssignmentIcon sx={{ fontSize: 15 }} />}
                    label="Карта покрытия"
                    hint="Ctrl+Shift+U"
                    onClick={() => {
                        closeToolsMenu();
                        useCoverageStore.getState().toggle();
                    }}
                />

                <Divider sx={{ my: 0.5, borderColor: '#3c3c3c' }} />
                <ToolSectionLabel>Миксины</ToolSectionLabel>
                <ToolMenuItem
                    icon={<WidgetsIcon sx={{ fontSize: 15 }} />}
                    label="Библиотека пресетов"
                    hint="Ctrl+Shift+L"
                    onClick={() => {
                        closeToolsMenu();
                        useMixinLibraryStore.getState().toggle();
                    }}
                />
                <ToolMenuItem
                    icon={<SortIcon sx={{ fontSize: 15 }} />}
                    label="Приоритеты миксинов"
                    hint="Ctrl+Shift+M"
                    onClick={() => {
                        closeToolsMenu();
                        useMixinPriorityStore.getState().toggle();
                    }}
                />

                <Divider sx={{ my: 0.5, borderColor: '#3c3c3c' }} />
                <ToolSectionLabel>Сравнение</ToolSectionLabel>
                <ToolMenuItem
                    icon={<CompareArrowsIcon sx={{ fontSize: 15 }} />}
                    label="Сравнить с файлом…"
                    onClick={() => {
                        closeToolsMenu();
                        void compareWithFile();
                    }}
                />
                <SubMenuPresetCompare onClose={closeToolsMenu} />

                <Divider sx={{ my: 0.5, borderColor: '#3c3c3c' }} />
                <ToolSectionLabel>Форматирование</ToolSectionLabel>
                <ToolMenuItem
                    icon={<FormatAlignLeftIcon sx={{ fontSize: 15 }} />}
                    label="Форматировать"
                    hint="Shift+Alt+F"
                    onClick={() => {
                        closeToolsMenu();
                        onFormat('soft');
                    }}
                />
                <ToolMenuItem
                    icon={<PlaylistAddCheckIcon sx={{ fontSize: 15 }} />}
                    label="Форматировать и упорядочить ключи"
                    hint="Ctrl+Shift+Alt+F"
                    onClick={() => {
                        closeToolsMenu();
                        onFormat('strict');
                    }}
                />
            </Menu>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                       Вспомогательные компоненты                    */
/* ------------------------------------------------------------------ */

const iconButtonSx = {
    color: '#c8c8c8',
    width: 28,
    height: 28,
    flexShrink: 0,
    '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.06)' },
    '&.Mui-disabled': { color: '#5a5a5a' },
};

type ToolbarButtonProps = {
    icon: React.ReactNode;
    label: string;
    tooltip: string;
    onClick: () => void;
    onClickWithAnchor?: (e: React.MouseEvent<HTMLElement>) => void;
    endIcon?: React.ReactNode;
    accent?: boolean;
};

function ToolbarButton({
    icon,
    label,
    tooltip,
    onClick,
    onClickWithAnchor,
    endIcon,
    accent,
}: ToolbarButtonProps) {
    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        if (onClickWithAnchor) {
            onClickWithAnchor(e);
        } else {
            onClick();
        }
    };

    return (
        <Tooltip title={tooltip} arrow>
            <Button
                size="small"
                onClick={handleClick}
                data-tour="tools"
                startIcon={icon}
                endIcon={endIcon}
                sx={{
                    fontSize: 12,
                    textTransform: 'none',
                    color: accent ? '#4ec9b0' : '#c8c8c8',
                    height: 28,
                    px: 1,
                    minWidth: 0,
                    flexShrink: 0,
                    '&:hover': {
                        color: '#ffffff',
                        bgcolor: 'rgba(255, 255, 255, 0.06)',
                    },
                    '& .MuiButton-startIcon, & .MuiButton-endIcon': {
                        mr: 0.5,
                        ml: 0.5,
                    },
                }}
            >
                {label}
            </Button>
        </Tooltip>
    );
}

function ToolbarDivider() {
    return (
        <Box
            sx={{
                width: '1px',
                minWidth: '1px',
                height: 18,
                bgcolor: '#3c3c3c',
                mx: 0.5,
                flexShrink: 0,
            }}
        />
    );
}

function FileMenuItem({
    icon,
    label,
    hint,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    hint?: string;
    onClick: () => void;
}) {
    return (
        <MenuItem
            onClick={onClick}
            sx={{
                fontSize: 12,
                py: 0.75,
                color: '#d4d4d4',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                '&:hover': { bgcolor: 'rgba(79, 193, 255, 0.08)' },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: '#9d9d9d',
                    width: 20,
                }}
            >
                {icon}
            </Box>
            <Typography sx={{ fontSize: 12, flex: 1 }}>{label}</Typography>
            {hint && (
                <Typography
                    sx={{
                        fontSize: 10,
                        color: '#5a5a5a',
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {hint}
                </Typography>
            )}
        </MenuItem>
    );
}

function ToolMenuItem({
    icon,
    label,
    hint,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    hint?: string;
    onClick: () => void;
}) {
    return (
        <MenuItem
            onClick={onClick}
            sx={{
                fontSize: 12,
                py: 0.75,
                color: '#d4d4d4',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                '&:hover': { bgcolor: 'rgba(79, 193, 255, 0.08)' },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: '#9d9d9d',
                    width: 20,
                }}
            >
                {icon}
            </Box>
            <Typography sx={{ fontSize: 12, flex: 1 }}>{label}</Typography>
            {hint && (
                <Typography
                    sx={{
                        fontSize: 10,
                        color: '#5a5a5a',
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {hint}
                </Typography>
            )}
        </MenuItem>
    );
}

function ToolSectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Box
            sx={{
                px: 2,
                pt: 1,
                pb: 0.5,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: '#5a5a5a',
            }}
        >
            {children}
        </Box>
    );
}

function SubMenuPresetCompare({ onClose }: { onClose: () => void }) {
    const listAll = usePresetStore((s) => s.listAll);
    const presets = listAll();

    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    if (presets.length === 0) return null;

    return (
        <>
            <MenuItem
                onClick={(e) => setAnchor(e.currentTarget)}
                sx={{
                    fontSize: 12,
                    py: 0.75,
                    color: '#d4d4d4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    '&:hover': { bgcolor: 'rgba(79, 193, 255, 0.08)' },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#9d9d9d',
                        width: 20,
                    }}
                >
                    <CompareArrowsIcon sx={{ fontSize: 15 }} />
                </Box>
                <Typography sx={{ fontSize: 12, flex: 1 }}>
                    Сравнить с пресетом
                </Typography>
                <KeyboardArrowDownIcon sx={{ fontSize: 14, color: '#5a5a5a' }} />
            </MenuItem>

            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: '#252526',
                            backgroundImage: 'none',
                            border: '1px solid #3c3c3c',
                            borderRadius: 1.5,
                            minWidth: 240,
                            maxHeight: 400,
                            ml: 0.5,
                        },
                    },
                }}
            >
                {presets.map((p) => (
                    <MenuItem
                        key={p.id}
                        onClick={() => {
                            setAnchor(null);
                            onClose();
                            compareWithPreset(p.id);
                        }}
                        sx={{
                            fontSize: 12,
                            py: 0.75,
                            color: '#d4d4d4',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            '&:hover': { bgcolor: 'rgba(79, 193, 255, 0.08)' },
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: 12,
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {p.name}
                        </Typography>
                        <Box
                            sx={{
                                fontSize: 9,
                                color: p.source === 'builtin' ? '#4fc1ff' : '#dcdcaa',
                                textTransform: 'uppercase',
                                letterSpacing: 0.4,
                            }}
                        >
                            {p.source === 'builtin' ? 'builtin' : 'user'}
                        </Box>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

// чтобы TS не ругался на неиспользуемые
void AutoFixHighIcon;