import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    Divider,
    IconButton,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useDocumentStore } from '@/store/documentStore';
import { useNotificationStore } from '@/store/notificationStore';
import { withHistory } from '@/services/historyService';
import { parseYaml, stringifyYaml } from '@/services/yamlService';
import { useMixinPriorityStore } from '@/store/mixinPriorityStore';

type MixinRow = {
    index: number;
    id: string;
    name?: string;
    type: 'linkage' | 'view';
    weight: number | null;
};

export function MixinPriorityPanel() {
    const open = useMixinPriorityStore((s) => s.open);
    const setOpen = useMixinPriorityStore((s) => s.setOpen);
    const parsed = useDocumentStore((s) => s.parsed);
    const setYaml = useDocumentStore((s) => s.setYaml);
    const notify = useNotificationStore((s) => s.notify);

    const initialRows = useMemo<MixinRow[]>(() => {
        if (typeof parsed !== 'object' || parsed === null) return [];
        const mixins = (parsed as Record<string, unknown>).mixins;
        if (!Array.isArray(mixins)) return [];
        return mixins.map((m, i) => {
            if (typeof m !== 'object' || m === null) {
                return { index: i, id: `#${i}`, type: 'linkage', weight: null };
            }
            const r = m as Record<string, unknown>;
            return {
                index: i,
                id: String(r.id ?? `#${i}`),
                name: typeof r.name === 'string' ? r.name : undefined,
                type: (r.type === 'view' ? 'view' : 'linkage') as 'linkage' | 'view',
                weight: typeof r.weight === 'number' ? r.weight : null,
            };
        });
    }, [parsed]);

    const [rows, setRows] = useState<MixinRow[]>(initialRows);
    const [dragging, setDragging] = useState<number | null>(null);

    // Сброс при открытии
    useMemo(() => {
        if (open) setRows(initialRows);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const reorder = (from: number, to: number) => {
        setRows((prev) => {
            const next = [...prev];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return next;
        });
    };

    const updateWeight = (id: string, value: string) => {
        setRows((prev) =>
            prev.map((r) =>
                r.id === id
                    ? { ...r, weight: value === '' ? null : Number(value) }
                    : r
            )
        );
    };

    const resetWeights = () => {
        setRows((prev) =>
            prev.map((r, i) => ({ ...r, weight: (i + 1) * 10 }))
        );
    };

    const save = () => {
        if (typeof parsed !== 'object' || parsed === null) return;
        const doc = { ...(parsed as Record<string, unknown>) };
        const mixins = Array.isArray(doc.mixins)
            ? ([...(doc.mixins as unknown[])] as Record<string, unknown>[])
            : [];

        // Обновляем в порядке rows
        const reordered: Record<string, unknown>[] = [];
        for (const row of rows) {
            const mixin = mixins.find((m) => m.id === row.id);
            if (!mixin) continue;
            const updated = { ...mixin };
            if (row.weight === null) {
                delete updated.weight;
            } else {
                updated.weight = row.weight;
            }
            reordered.push(updated);
        }

        doc.mixins = reordered;

        const newYaml = stringifyYaml(doc);

        const applied = withHistory('Порядок и веса миксинов', () => {
            const r = parseYaml(newYaml);
            setYaml(newYaml, r.parsed, r.doc);
            return r;
        });

        if (applied) {
            notify('Веса миксинов обновлены', 'success');
            setOpen(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            fullWidth
            maxWidth="sm"
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
                        Приоритеты миксинов
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(false)}
                        sx={{ color: '#9d9d9d' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                <Typography sx={{ fontSize: 11, color: '#9d9d9d', mb: 2 }}>
                    Порядок в списке определяет приоритет. Верхние примеси
                    встраиваются первыми. Вес (`weight`) — дополнительный
                    параметр: чем меньше число, тем выше приоритет.
                </Typography>

                <Divider sx={{ mb: 2, borderColor: '#3c3c3c' }} />

                {rows.length === 0 ? (
                    <Typography sx={{ fontSize: 12, color: '#7a7a7a', py: 2 }}>
                        В документе нет миксинов
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                            maxHeight: 400,
                            overflow: 'auto',
                        }}
                    >
                        {rows.map((row, i) => (
                            <Box
                                key={row.id}
                                draggable
                                onDragStart={() => setDragging(i)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                    if (dragging !== null && dragging !== i) {
                                        reorder(dragging, i);
                                    }
                                    setDragging(null);
                                }}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 1,
                                    py: 0.75,
                                    border: '1px solid #3c3c3c',
                                    borderRadius: 0.75,
                                    bgcolor:
                                        dragging === i
                                            ? 'rgba(14, 99, 156, 0.15)'
                                            : '#1f1f20',
                                    cursor: 'grab',
                                    '&:hover': {
                                        borderColor: '#0e639c',
                                    },
                                }}
                            >
                                <DragIndicatorIcon
                                    sx={{ fontSize: 16, color: '#7a7a7a' }}
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        sx={{
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 12,
                                            color: '#dcdcaa',
                                        }}
                                    >
                                        {row.id}
                                    </Typography>
                                    <Typography sx={{ fontSize: 10, color: '#7a7a7a' }}>
                                        {row.name ?? '—'} · {row.type}
                                    </Typography>
                                </Box>
                                <TextField
                                    type="number"
                                    size="small"
                                    value={row.weight ?? ''}
                                    onChange={(e) => updateWeight(row.id, e.target.value)}
                                    placeholder="—"
                                    inputProps={{ min: 0, max: 1000 }}
                                    sx={{
                                        width: 80,
                                        '& input': { py: 0.5, fontSize: 12 },
                                    }}
                                />
                            </Box>
                        ))}
                    </Box>
                )}

                <Divider sx={{ mt: 2, mb: 1.5, borderColor: '#3c3c3c' }} />

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Button
                        size="small"
                        onClick={resetWeights}
                        sx={{ fontSize: 12, textTransform: 'none', color: '#9d9d9d' }}
                    >
                        Авто-веса (10, 20, 30…)
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1 }}>
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
                            onClick={save}
                            sx={{ fontSize: 12, textTransform: 'none' }}
                        >
                            Сохранить
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Dialog>
    );
}