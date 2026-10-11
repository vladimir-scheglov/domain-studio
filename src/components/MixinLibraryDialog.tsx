import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    Divider,
    IconButton,
    InputBase,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useMixinLibraryStore } from '@/store/mixinLibraryStore';
import { useDocumentStore } from '@/store/documentStore';
import { useNotificationStore } from '@/store/notificationStore';
import { withHistory } from '@/services/historyService';
import { applyPatch } from '@/domain/patch';
import {
    MIXIN_PRESETS,
    MIXIN_PRESET_CATEGORIES,
    type MixinPreset,
    type MixinPresetCategory,
} from '@/domain/mixinLibrary';

const ALL_CATEGORIES: MixinPresetCategory[] = [
    'audit',
    'collaboration',
    'history',
    'workflow',
    'security',
    'info',
    'links',
    'integration',
];

export function MixinLibraryDialog() {
    const open = useMixinLibraryStore((s) => s.open);
    const setOpen = useMixinLibraryStore((s) => s.setOpen);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [params, setParams] = useState<Record<string, string>>({});
    const [query, setQuery] = useState('');
    const [activeCategories, setActiveCategories] = useState<
        Set<MixinPresetCategory>
    >(new Set(ALL_CATEGORIES));

    const selected = useMemo(
        () => MIXIN_PRESETS.find((p) => p.id === selectedId) ?? null,
        [selectedId]
    );

    useEffect(() => {
        if (open) {
            setSelectedId(null);
            setParams({});
            setQuery('');
            setActiveCategories(new Set(ALL_CATEGORIES));
        }
    }, [open]);

    useEffect(() => {
        if (selected) {
            const initial: Record<string, string> = {};
            for (const p of selected.parameters) {
                initial[p.name] = p.defaultValue ?? '';
            }
            setParams(initial);
        }
    }, [selected]);

    const toggleCategory = (cat: MixinPresetCategory) => {
        setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            if (next.size === 0) next.add(cat);
            return next;
        });
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return MIXIN_PRESETS.filter((p) => {
            if (!activeCategories.has(p.category)) return false;
            if (!q) return true;
            const hay = [
                p.name,
                p.description,
                p.id,
                p.category,
                ...(p.tags ?? []),
            ]
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }, [query, activeCategories]);

    const grouped = useMemo(() => {
        const map = new Map<MixinPresetCategory, MixinPreset[]>();
        for (const p of filtered) {
            const list = map.get(p.category) ?? [];
            list.push(p);
            map.set(p.category, list);
        }
        return map;
    }, [filtered]);

    const preview = useMemo(() => {
        if (!selected) return '';
        const filled: Record<string, string> = {};
        let allOk = true;
        for (const p of selected.parameters) {
            const v = params[p.name]?.trim() ?? '';
            if (p.required && !v) allOk = false;
            filled[p.name] = v;
        }
        if (!allOk) return '# Заполните обязательные параметры';
        try {
            return selected.generate(filled);
        } catch (e) {
            return `# Ошибка генерации: ${String(e)}`;
        }
    }, [selected, params]);

    const canApply = useMemo(() => {
        if (!selected) return false;
        for (const p of selected.parameters) {
            if (p.required && !params[p.name]?.trim()) return false;
        }
        return true;
    }, [selected, params]);

    const apply = () => {
        if (!selected || !canApply) return;

        const yaml = selected.generate(
            Object.fromEntries(
                Object.entries(params).map(([k, v]) => [k, v.trim()])
            )
        );

        const doc = useDocumentStore.getState();
        const applied = withHistory(`Пресет миксина: ${selected.name}`, () => {
            const r = applyPatch(doc.yaml, { yaml, mergeStrategy: 'merge' });
            doc.setYaml(r.yaml, r.parsed, r.doc);
            return r;
        });

        if (applied) {
            useNotificationStore
                .getState()
                .notify(`Пресет «${selected.name}» применён`, 'success');
            setOpen(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            fullWidth
            maxWidth="lg"
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AutoFixHighIcon sx={{ color: '#4fc1ff', fontSize: 20 }} />
                    <Typography sx={{ fontSize: 16, fontWeight: 600, flex: 1 }}>
                        Библиотека миксинов
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#7a7a7a', mr: 1 }}>
                        {MIXIN_PRESETS.length} пресетов
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(false)}
                        sx={{ color: '#9d9d9d' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                <Divider sx={{ mb: 1.5, borderColor: '#3c3c3c' }} />

                {/* Поиск */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.5,
                        mb: 1,
                        border: '1px solid #3c3c3c',
                        borderRadius: 1,
                        bgcolor: '#1f1f20',
                    }}
                >
                    <SearchIcon sx={{ fontSize: 14, color: '#7a7a7a' }} />
                    <InputBase
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Поиск по названию, описанию, тегам…"
                        sx={{
                            flex: 1,
                            fontSize: 12,
                            '& input': { py: 0.5 },
                            '& input::placeholder': { color: '#5a5a5a' },
                        }}
                    />
                    {query && (
                        <IconButton
                            size="small"
                            onClick={() => setQuery('')}
                            sx={{ color: '#7a7a7a', width: 18, height: 18 }}
                        >
                            <ClearIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                    )}
                </Box>

                {/* Фильтр категорий */}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        mb: 2,
                    }}
                >
                    {ALL_CATEGORIES.map((cat) => {
                        const active = activeCategories.has(cat);
                        const count = MIXIN_PRESETS.filter(
                            (p) => p.category === cat
                        ).length;
                        return (
                            <Chip
                                key={cat}
                                size="small"
                                label={`${MIXIN_PRESET_CATEGORIES[cat]} ${count}`}
                                onClick={() => toggleCategory(cat)}
                                sx={{
                                    height: 22,
                                    fontSize: 10.5,
                                    bgcolor: active
                                        ? 'rgba(79, 193, 255, 0.15)'
                                        : 'transparent',
                                    color: active ? '#4fc1ff' : '#7a7a7a',
                                    border: `1px solid ${active ? '#4fc1ff66' : '#3c3c3c'}`,
                                    '& .MuiChip-label': { px: 0.75 },
                                }}
                            />
                        );
                    })}
                </Box>

                <Divider sx={{ mb: 2, borderColor: '#3c3c3c' }} />

                <Box sx={{ display: 'flex', gap: 2, minHeight: 480 }}>
                    {/* Список пресетов */}
                    <Box
                        sx={{
                            width: 320,
                            flex: '0 0 320px',
                            borderRight: '1px solid #3c3c3c',
                            pr: 2,
                            overflow: 'auto',
                            maxHeight: 560,
                        }}
                    >
                        {filtered.length === 0 ? (
                            <Typography sx={{ fontSize: 11, color: '#7a7a7a', py: 2 }}>
                                Ничего не найдено
                            </Typography>
                        ) : (
                            Array.from(grouped.entries()).map(([cat, list]) => (
                                <Box key={cat} sx={{ mb: 2 }}>
                                    <Typography
                                        sx={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.6,
                                            color: '#7a7a7a',
                                            mb: 0.75,
                                        }}
                                    >
                                        {MIXIN_PRESET_CATEGORIES[cat]} · {list.length}
                                    </Typography>
                                    {list.map((p) => (
                                        <PresetCard
                                            key={p.id}
                                            preset={p}
                                            selected={selectedId === p.id}
                                            onClick={() => setSelectedId(p.id)}
                                        />
                                    ))}
                                </Box>
                            ))
                        )}
                    </Box>

                    {/* Параметры и превью */}
                    <Box
                        sx={{ flex: 1, minWidth: 0, overflow: 'auto', maxHeight: 560 }}
                    >
                        {!selected ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: 12, color: '#7a7a7a' }}>
                                    Выберите пресет слева
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 0.5,
                                    }}
                                >
                                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                        {selected.name}
                                    </Typography>
                                    <ComplexityBadge complexity={selected.complexity} />
                                </Box>
                                <Typography sx={{ fontSize: 11, color: '#9d9d9d', mb: 2 }}>
                                    {selected.description}
                                </Typography>

                                <Divider sx={{ mb: 2, borderColor: '#3c3c3c' }} />

                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1.5,
                                        mb: 2,
                                    }}
                                >
                                    {selected.parameters.map((p) => (
                                        <Box key={p.name}>
                                            <Typography
                                                sx={{ fontSize: 11, color: '#d4d4d4', mb: 0.5 }}
                                            >
                                                {p.label}
                                                {p.required && (
                                                    <Box
                                                        component="span"
                                                        sx={{ color: '#f48771', ml: 0.5 }}
                                                    >
                                                        *
                                                    </Box>
                                                )}
                                            </Typography>
                                            <Box
                                                component="input"
                                                type="text"
                                                value={params[p.name] ?? ''}
                                                placeholder={p.placeholder}
                                                onChange={(
                                                    e: React.ChangeEvent<HTMLInputElement>
                                                ) =>
                                                    setParams((prev) => ({
                                                        ...prev,
                                                        [p.name]: e.target.value,
                                                    }))
                                                }
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 10px',
                                                    fontSize: 12,
                                                    fontFamily:
                                                        "'JetBrains Mono', monospace",
                                                    color: '#d4d4d4',
                                                    background: '#1f1f20',
                                                    border: '1px solid #3c3c3c',
                                                    borderRadius: 4,
                                                    outline: 'none',
                                                }}
                                            />
                                            {p.help && (
                                                <Typography
                                                    sx={{ fontSize: 10, color: '#7a7a7a', mt: 0.5 }}
                                                >
                                                    {p.help}
                                                </Typography>
                                            )}
                                        </Box>
                                    ))}
                                </Box>

                                <Divider sx={{ mb: 2, borderColor: '#3c3c3c' }} />

                                <Typography
                                    sx={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        color: '#9d9d9d',
                                        mb: 1,
                                    }}
                                >
                                    Превью
                                </Typography>
                                <Box
                                    component="pre"
                                    sx={{
                                        p: 1.5,
                                        bgcolor: '#1e1e1e',
                                        border: '1px solid #3c3c3c',
                                        borderRadius: 1,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 11,
                                        overflow: 'auto',
                                        maxHeight: 320,
                                        whiteSpace: 'pre',
                                        color: '#d4d4d4',
                                        m: 0,
                                    }}
                                >
                                    {preview}
                                </Box>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: 1,
                                        mt: 2,
                                    }}
                                >
                                    <Button
                                        size="small"
                                        onClick={() => setOpen(false)}
                                        sx={{ fontSize: 12, textTransform: 'none' }}
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={apply}
                                        disabled={!canApply}
                                        sx={{ fontSize: 12, textTransform: 'none' }}
                                    >
                                        Применить
                                    </Button>
                                </Box>
                            </>
                        )}
                    </Box>
                </Box>
            </Box>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*                       Вспомогательные компоненты                    */
/* ------------------------------------------------------------------ */

function PresetCard({
    preset,
    selected,
    onClick,
}: {
    preset: MixinPreset;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <Box
            onClick={onClick}
            sx={{
                px: 1.25,
                py: 1,
                mb: 0.5,
                borderRadius: 1,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selected ? '#0e639c' : 'transparent',
                bgcolor: selected
                    ? 'rgba(14, 99, 156, 0.15)'
                    : 'rgba(255, 255, 255, 0.02)',
                '&:hover': {
                    bgcolor: selected
                        ? 'rgba(14, 99, 156, 0.25)'
                        : 'rgba(255, 255, 255, 0.05)',
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                <Typography
                    sx={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#d4d4d4',
                        lineHeight: 1.3,
                        flex: 1,
                    }}
                >
                    {preset.name}
                </Typography>
                <ComplexityBadge complexity={preset.complexity} />
            </Box>
            <Typography
                sx={{
                    fontSize: 10.5,
                    color: '#7a7a7a',
                    mt: 0.25,
                    lineHeight: 1.35,
                }}
            >
                {preset.description}
            </Typography>
        </Box>
    );
}

function ComplexityBadge({ complexity }: { complexity: string }) {
    const meta: Record<string, { label: string; color: string }> = {
        simple: { label: 'простой', color: '#4ec9b0' },
        medium: { label: 'средний', color: '#dcdcaa' },
        advanced: { label: 'сложный', color: '#f48771' },
    };
    const m = meta[complexity] ?? meta.simple;
    return (
        <Box
            sx={{
                fontSize: 9,
                color: m.color,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                border: `1px solid ${m.color}66`,
                borderRadius: 0.5,
                px: 0.5,
                py: 0.1,
                flexShrink: 0,
            }}
        >
            {m.label}
        </Box>
    );
}