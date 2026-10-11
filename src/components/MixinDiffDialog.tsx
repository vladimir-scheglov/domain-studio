import { useMemo } from 'react';
import {
    Box,
    Button,
    Dialog,
    Divider,
    IconButton,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDocumentStore } from '@/store/documentStore';
import { useMixinDiffStore } from '@/store/mixinDiffStore';
import { stringifyYaml } from '@/services/yamlService';

export function MixinDiffDialog() {
    const open = useMixinDiffStore((s) => s.open);
    const mixinId = useMixinDiffStore((s) => s.mixinId);
    const setOpen = useMixinDiffStore((s) => s.setOpen);
    const parsed = useDocumentStore((s) => s.parsed);

    const info = useMemo(() => {
        if (!parsed || typeof parsed !== 'object') return null;
        const mixins = (parsed as Record<string, unknown>).mixins;
        if (!Array.isArray(mixins)) return null;
        for (const m of mixins) {
            if (typeof m !== 'object' || m === null) continue;
            const r = m as Record<string, unknown>;
            if (r.id === mixinId) {
                return {
                    mixin: r,
                    summary: stringifyYaml(r),
                };
            }
        }
        return null;
    }, [parsed, mixinId]);

    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
                        Миксин «{mixinId}»
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(false)}
                        sx={{ color: '#9d9d9d' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                <Typography sx={{ fontSize: 11, color: '#9d9d9d', mb: 1.5 }}>
                    Полное содержимое примеси. Применяется через связь или
                    представление, заданное в поле `entity` / `linkage`.
                </Typography>

                <Divider sx={{ mb: 1.5, borderColor: '#3c3c3c' }} />

                {info ? (
                    <Box
                        component="pre"
                        sx={{
                            p: 2,
                            bgcolor: '#1e1e1e',
                            border: '1px solid #3c3c3c',
                            borderRadius: 1,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                            overflow: 'auto',
                            maxHeight: 500,
                            whiteSpace: 'pre',
                            color: '#d4d4d4',
                        }}
                    >
                        {info.summary}
                    </Box>
                ) : (
                    <Typography sx={{ fontSize: 12, color: '#7a7a7a' }}>
                        Миксин не найден
                    </Typography>
                )}

                <Divider sx={{ mt: 2, mb: 1.5, borderColor: '#3c3c3c' }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        size="small"
                        onClick={() => setOpen(false)}
                        sx={{ fontSize: 12, textTransform: 'none' }}
                    >
                        Закрыть
                    </Button>
                </Box>
            </Box>
        </Dialog>
    );
}