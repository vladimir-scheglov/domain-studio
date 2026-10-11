import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    Divider,
    FormControlLabel,
    IconButton,
    Switch,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useDiffStore } from '@/store/diffStore';
import { computeDiff, filterWithContext } from '@/domain/diff';

export function DiffDialog() {
    const open = useDiffStore((s) => s.open);
    const close = useDiffStore((s) => s.close);
    const leftYaml = useDiffStore((s) => s.leftYaml);
    const leftLabel = useDiffStore((s) => s.leftLabel);
    const rightYaml = useDiffStore((s) => s.rightYaml);
    const rightLabel = useDiffStore((s) => s.rightLabel);

    const [onlyChanges, setOnlyChanges] = useState(false);

    const { lines, stats } = useMemo(
        () => computeDiff(leftYaml, rightYaml),
        [leftYaml, rightYaml]
    );

    const visibleLines = useMemo(
        () => (onlyChanges ? filterWithContext(lines, 2) : lines),
        [lines, onlyChanges]
    );

    return (
        <Dialog
            open={open}
            onClose={close}
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
            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '85vh' }}>
                {/* Заголовок */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <CompareArrowsIcon sx={{ color: '#4fc1ff', fontSize: 20 }} />
                    <Typography sx={{ fontSize: 16, fontWeight: 600, flex: 1 }}>
                        Сравнение
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={close}
                        sx={{ color: '#9d9d9d' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Метки + статистика */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 1.5,
                    }}
                >
                    <LabelChip color="#f48771" text={leftLabel || 'Левый'} />
                    <CompareArrowsIcon sx={{ fontSize: 14, color: '#7a7a7a' }} />
                    <LabelChip color="#4ec9b0" text={rightLabel || 'Правый'} />

                    <Box sx={{ flex: 1 }} />

                    <StatBadge label="+" count={stats.added} color="#4ec9b0" />
                    <StatBadge label="−" count={stats.removed} color="#f48771" />
                    <StatBadge label="=" count={stats.unchanged} color="#7a7a7a" />

                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={onlyChanges}
                                onChange={(_, v) => setOnlyChanges(v)}
                            />
                        }
                        label={
                            <Typography sx={{ fontSize: 11, color: '#9d9d9d' }}>
                                Только изменения
                            </Typography>
                        }
                    />
                </Box>

                <Divider sx={{ mb: 1.5, borderColor: '#3c3c3c' }} />

                {/* Diff-таблица */}
                <Box
                    sx={{
                        flex: 1,
                        overflow: 'auto',
                        border: '1px solid #3c3c3c',
                        borderRadius: 1,
                        bgcolor: '#1e1e1e',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        lineHeight: 1.5,
                    }}
                >
                    {visibleLines.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: 12, color: '#4ec9b0' }}>
                                Документы идентичны
                            </Typography>
                        </Box>
                    ) : (
                        visibleLines.map((line, i) => (
                            <DiffRow key={i} line={line} />
                        ))
                    )}
                </Box>

                <Divider sx={{ mt: 1.5, mb: 1.5, borderColor: '#3c3c3c' }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        size="small"
                        onClick={close}
                        sx={{ fontSize: 12, textTransform: 'none' }}
                    >
                        Закрыть
                    </Button>
                </Box>
            </Box>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*                       Вспомогательные                               */
/* ------------------------------------------------------------------ */

function DiffRow({
    line,
}: {
    line: ReturnType<typeof computeDiff>['lines'][0];
}) {
    const bg =
        line.op === 'added'
            ? 'rgba(78, 201, 176, 0.12)'
            : line.op === 'removed'
                ? 'rgba(244, 135, 113, 0.12)'
                : 'transparent';

    const color =
        line.op === 'added'
            ? '#4ec9b0'
            : line.op === 'removed'
                ? '#f48771'
                : '#d4d4d4';

    const marker =
        line.op === 'added' ? '+' : line.op === 'removed' ? '−' : ' ';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'stretch',
                bgcolor: bg,
                borderLeft:
                    line.op === 'added'
                        ? '2px solid #4ec9b0'
                        : line.op === 'removed'
                            ? '2px solid #f48771'
                            : '2px solid transparent',
            }}
        >
            {/* left line# */}
            <Box
                sx={{
                    width: 48,
                    px: 0.75,
                    textAlign: 'right',
                    color: '#5a5a5a',
                    fontSize: 11,
                    userSelect: 'none',
                    borderRight: '1px solid #2a2a2a',
                    flexShrink: 0,
                }}
            >
                {line.leftLine ?? ''}
            </Box>
            {/* right line# */}
            <Box
                sx={{
                    width: 48,
                    px: 0.75,
                    textAlign: 'right',
                    color: '#5a5a5a',
                    fontSize: 11,
                    userSelect: 'none',
                    borderRight: '1px solid #2a2a2a',
                    flexShrink: 0,
                }}
            >
                {line.rightLine ?? ''}
            </Box>
            {/* marker */}
            <Box
                sx={{
                    width: 20,
                    textAlign: 'center',
                    color,
                    fontWeight: 600,
                    userSelect: 'none',
                    flexShrink: 0,
                }}
            >
                {marker}
            </Box>
            {/* content */}
            <Box
                sx={{
                    flex: 1,
                    px: 0.75,
                    color,
                    whiteSpace: 'pre',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {line.content || '\u00A0'}
            </Box>
        </Box>
    );
}

function LabelChip({ color, text }: { color: string; text: string }) {
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                border: `1px solid ${color}66`,
                bgcolor: `${color}11`,
                fontSize: 11,
                color,
                fontFamily: "'JetBrains Mono', monospace",
            }}
        >
            {text}
        </Box>
    );
}

function StatBadge({
    label,
    count,
    color,
}: {
    label: string;
    count: number;
    color: string;
}) {
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: 11,
                color: count > 0 ? color : '#5a5a5a',
                fontFamily: "'JetBrains Mono', monospace",
            }}
        >
            <Box component="span" sx={{ fontWeight: 600 }}>
                {label}
            </Box>
            <Box component="span">{count}</Box>
        </Box>
    );
}