import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    IconButton,
    InputBase,
    MenuItem,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SearchIcon from '@mui/icons-material/Search';
import { usePresetStore } from '@/store/presetStore';
import { useDocumentStore } from '@/store/documentStore';
import { useNotificationStore } from '@/store/notificationStore';
import { usePresetDialogStore } from '@/store/presetDialogStore';
import { downloadFile } from '@/services/fileService';
import { PRESET_CATEGORIES, type DomainPreset, type PresetCategory } from '@/domain/builtinPresets';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { compareWithPreset } from '@/services/diffService';

export function PresetDialog() {
    const open = usePresetDialogStore((s) => s.open);
    const setOpen = usePresetDialogStore((s) => s.setOpen);

    const yaml = useDocumentStore((s) => s.yaml);
    const loadFromString = useDocumentStore((s) => s.loadFromString);
    const setFileHandle = useDocumentStore((s) => s.setFileHandle);

    const listAll = usePresetStore((s) => s.listAll);
    const addPreset = usePresetStore((s) => s.addPreset);
    const removePreset = usePresetStore((s) => s.removePreset);

    const notify = useNotificationStore((s) => s.notify);

    const [query, setQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newCategory, setNewCategory] = useState<PresetCategory>('utility');

    const presets = listAll();

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return presets;
        return presets.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
        );
    }, [presets, query]);

    /** Сгруппированные по категории (только если фильтр не активен). */
    const grouped = useMemo(() => {
        const map = new Map<PresetCategory, DomainPreset[]>();
        for (const p of filtered) {
            const list = map.get(p.category) ?? [];
            list.push(p);
            map.set(p.category, list);
        }
        return map;
    }, [filtered]);

    const openPreset = (preset: DomainPreset) => {
        loadFromString(preset.yaml, null);
        setFileHandle(null);
        notify(`Загружен пресет: ${preset.name}`, 'success');
        setOpen(false);
    };

    const replacePreset = (preset: DomainPreset) => {
        const ok = window.confirm(
            `Заменить текущий документ пресетом «${preset.name}»? Несохранённые изменения будут потеряны.`
        );
        if (!ok) return;
        openPreset(preset);
    };

    const startSave = () => {
        setSaving(true);
        setNewName('');
        setNewDescription('');
        setNewCategory('utility');
    };

    const commitSave = () => {
        const name = newName.trim();
        if (!name) {
            notify('Укажите название пресета', 'warning');
            return;
        }
        addPreset({
            name,
            description: newDescription.trim(),
            yaml,
            category: newCategory,
        });
        notify(`Пресет сохранён: ${name}`, 'success');
        setSaving(false);
    };

    const exportPreset = (preset: DomainPreset) => {
        const safeName = preset.name
            .replace(/[^\wа-яА-Я\s-]+/gi, '')
            .trim()
            .replace(/\s+/g, '-')
            .toLowerCase();
        downloadFile(preset.yaml, `${safeName || 'preset'}.yaml`);
    };

    const deletePreset = (preset: DomainPreset) => {
        if (preset.source !== 'user') return;
        const ok = window.confirm(`Удалить пресет «${preset.name}»?`);
        if (!ok) return;
        removePreset(preset.id);
        notify('Пресет удалён', 'info');
    };

    return (
        <Dialog
            open={open}
            onClose={() => {
                setOpen(false);
                setSaving(false);
            }}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    bgcolor: '#252526',
                    backgroundImage: 'none',
                    border: '1px solid #3c3c3c',
                    borderRadius: 2,
                },
            }}
        >
            <Box sx={{ p: 2.5 }}>
                {/* Заголовок */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                    }}
                >
                    <Typography sx={{ fontSize: 16, fontWeight: 600, flex: 1 }}>
                        Пресеты схем
                    </Typography>
                    <Button
                        size="small"
                        startIcon={<BookmarkAddIcon />}
                        onClick={startSave}
                        variant="outlined"
                        sx={{ fontSize: 12, textTransform: 'none' }}
                    >
                        Сохранить текущую
                    </Button>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(false)}
                        sx={{ color: '#9d9d9d' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Форма сохранения */}
                {saving && (
                    <Box
                        sx={{
                            mb: 2,
                            p: 2,
                            border: '1px solid #3c3c3c',
                            borderRadius: 1,
                            bgcolor: '#1f1f20',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                        }}
                    >
                        <Typography sx={{ fontSize: 11, color: '#9d9d9d' }}>
                            Сохранить текущий документ как пресет
                        </Typography>
                        <TextField
                            size="small"
                            label="Название"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Например: Домен инцидентов v2"
                            autoFocus
                        />
                        <TextField
                            size="small"
                            label="Описание"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Краткое описание пресета"
                        />
                        <TextField
                            select
                            size="small"
                            label="Категория"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value as PresetCategory)}
                            sx={{ minWidth: 200 }}
                        >
                            {Object.entries(PRESET_CATEGORIES).map(([key, label]) => (
                                <MenuItem key={key} value={key}>
                                    {label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                                size="small"
                                onClick={() => setSaving(false)}
                                sx={{ fontSize: 12, textTransform: 'none' }}
                            >
                                Отмена
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={commitSave}
                                sx={{ fontSize: 12, textTransform: 'none' }}
                            >
                                Сохранить
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Поиск */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.5,
                        mb: 2,
                        border: '1px solid #3c3c3c',
                        borderRadius: 1,
                        bgcolor: '#1f1f20',
                    }}
                >
                    <SearchIcon sx={{ fontSize: 16, color: '#7a7a7a' }} />
                    <InputBase
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Поиск по названию, описанию, тегам…"
                        sx={{
                            flex: 1,
                            fontSize: 12,
                            '& input': { py: 0.5 },
                        }}
                    />
                </Box>

                {/* Список пресетов */}
                {filtered.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 12, color: '#7a7a7a' }}>
                            Пресеты не найдены
                        </Typography>
                    </Box>
                ) : (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                maxHeight: 480,
                                overflow: 'auto',
                                pr: 0.5,
                            }}
                        >
                            {query.trim()
                                ? // при активном поиске — плоский список
                                filtered.map((preset) => (
                                    <PresetRow
                                        key={preset.id}
                                        preset={preset}
                                        onOpen={() => replacePreset(preset)}
                                        onExport={() => exportPreset(preset)}
                                        onDelete={() => deletePreset(preset)}
                                    />
                                ))
                                : // без поиска — сгруппировано
                                Array.from(grouped.entries()).map(([category, list]) => (
                                    <Box key={category}>
                                        <Typography
                                            sx={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.6,
                                                color: '#7a7a7a',
                                                mb: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            {PRESET_CATEGORIES[category]}
                                            <span
                                                style={{
                                                    color: '#5a5a5a',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                }}
                                            >
                                                {list.length}
                                            </span>
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1,
                                            }}
                                        >
                                            {list.map((preset) => (
                                                <PresetRow
                                                    key={preset.id}
                                                    preset={preset}
                                                    onOpen={() => replacePreset(preset)}
                                                    onExport={() => exportPreset(preset)}
                                                    onDelete={() => deletePreset(preset)}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                ))}
                        </Box>
                )}
            </Box>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*                        Строка пресета                               */
/* ------------------------------------------------------------------ */

function PresetRow({
    preset,
    onOpen,
    onExport,
    onDelete,
}: {
    preset: DomainPreset;
    onOpen: () => void;
    onExport: () => void;
    onDelete: () => void;
}) {
    const isBuiltin = preset.source === 'builtin';
    const badge = isBuiltin ? 'встроенный' : 'пользовательский';
    const badgeColor = isBuiltin ? '#4fc1ff' : '#dcdcaa';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 1.5,
                border: '1px solid #3c3c3c',
                borderRadius: 1,
                bgcolor: '#1f1f20',
                transition: 'border-color 0.15s, background-color 0.15s',
                '&:hover': {
                    borderColor: '#0e639c',
                    bgcolor: 'rgba(14, 99, 156, 0.06)',
                },
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 0.5,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#d4d4d4',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {preset.name}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 9,
                            color: badgeColor,
                            textTransform: 'uppercase',
                            letterSpacing: 0.4,
                            border: `1px solid ${badgeColor}`,
                            borderRadius: 0.5,
                            px: 0.5,
                            py: 0.1,
                            flexShrink: 0,
                        }}
                    >
                        {badge}
                    </Typography>
                </Box>

                {preset.description && (
                    <Typography
                        sx={{
                            fontSize: 11,
                            color: '#9d9d9d',
                            lineHeight: 1.4,
                            mb: 0.5,
                        }}
                    >
                        {preset.description}
                    </Typography>
                )}

                {preset.tags && preset.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {preset.tags.map((tag) => (
                            <Typography
                                key={tag}
                                sx={{
                                    fontSize: 10,
                                    color: '#5a5a5a',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                            >
                                #{tag}
                            </Typography>
                        ))}
                    </Box>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                <Tooltip title="Сравнить с текущим документом" arrow>
                    <IconButton
                        size="small"
                        onClick={() => compareWithPreset(preset.id)}
                        sx={{ color: '#4fc1ff', width: 28, height: 28 }}
                    >
                        <CompareArrowsIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Загрузить в редактор" arrow>
                    <IconButton
                        size="small"
                        onClick={onOpen}
                        sx={{ color: '#4fc1ff', width: 28, height: 28 }}
                    >
                        <SwapHorizIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Скачать как .yaml" arrow>
                    <IconButton
                        size="small"
                        onClick={onExport}
                        sx={{ color: '#9d9d9d', width: 28, height: 28 }}
                    >
                        <FileDownloadIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
                {!isBuiltin && (
                    <Tooltip title="Удалить" arrow>
                        <IconButton
                            size="small"
                            onClick={onDelete}
                            sx={{
                                color: '#9d9d9d',
                                width: 28,
                                height: 28,
                                '&:hover': { color: '#f48771' },
                            }}
                        >
                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        </Box>
    );
}