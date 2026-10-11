import { useMemo } from 'react';
import {
    Box,
    Dialog,
    Divider,
    IconButton,
    LinearProgress,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useCoverageStore } from '@/store/coverageStore';
import { useDocumentStore } from '@/store/documentStore';
import { useEditorStore } from '@/store/editorStore';
import { positionByPath } from '@/domain/positionByPath';
import {
    buildCoverageReport,
    type CoverageIssue,
    type CoverageSeverity,
} from '@/domain/coverage';

export function CoveragePanel() {
    const open = useCoverageStore((s) => s.open);
    const setOpen = useCoverageStore((s) => s.setOpen);

    const parsed = useDocumentStore((s) => s.parsed);
    const doc = useDocumentStore((s) => s.doc);
    const revealPosition = useEditorStore((s) => s.revealPosition);

    const report = useMemo(() => buildCoverageReport(parsed), [parsed]);

    const goTo = (issue: CoverageIssue) => {
        if (!issue.path || !doc) return;
        const pos = positionByPath(doc, issue.path);
        if (pos) {
            revealPosition(pos.line, pos.column);
            setOpen(false);
        }
    };

    // Группируем по категории
    const grouped = useMemo(() => {
        const map = new Map<string, CoverageIssue[]>();
        for (const issue of report.issues) {
            const list = map.get(issue.category) ?? [];
            list.push(issue);
            map.set(issue.category, list);
        }
        return map;
    }, [report]);

    const coveragePct =
        report.stats.entities > 0
            ? Math.round(
                (report.stats.entitiesWithViews / report.stats.entities) * 100
            )
            : 100;

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
                {/* Заголовок */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1.5,
                    }}
                >
                    <Typography sx={{ fontSize: 16, fontWeight: 600, flex: 1 }}>
                        Карта покрытия
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(false)}
                        sx={{ color: '#9d9d9d' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Метрики */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    <StatCard label="Сущности" value={report.stats.entities} />
                    <StatCard label="Связи" value={report.stats.linkages} />
                    <StatCard label="Представления" value={report.stats.views} />
                    <StatCard label="Действия" value={report.stats.actions} />
                </Box>

                {/* Прогресс покрытия */}
                <Box sx={{ mb: 2 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 0.5,
                            gap: 1,
                        }}
                    >
                        <Typography sx={{ fontSize: 11, color: '#9d9d9d' }}>
                            Сущности с представлениями
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 11,
                                color:
                                    coveragePct >= 80
                                        ? '#4ec9b0'
                                        : coveragePct >= 50
                                            ? '#dcdcaa'
                                            : '#f48771',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 600,
                            }}
                        >
                            {coveragePct}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={coveragePct}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#1e1e1e',
                            '& .MuiLinearProgress-bar': {
                                bgcolor:
                                    coveragePct >= 80
                                        ? '#4ec9b0'
                                        : coveragePct >= 50
                                            ? '#dcdcaa'
                                            : '#f48771',
                            },
                        }}
                    />
                </Box>

                <Divider sx={{ my: 2, borderColor: '#3c3c3c' }} />

                {/* Список проблем */}
                {report.issues.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 13, color: '#4ec9b0', mb: 0.5 }}>
                            ✓ Схема полностью покрыта
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#7a7a7a' }}>
                            Нет висящих элементов и несвязанных сущностей
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {Array.from(grouped.entries()).map(([category, issues]) => (
                            <Box key={category} sx={{ mb: 2 }}>
                                <Typography
                                    sx={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        color: '#5a5a5a',
                                        mb: 0.75,
                                    }}
                                >
                                    {categoryLabel(category)} · {issues.length}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    {issues.map((issue) => (
                                        <IssueRow
                                            key={issue.id}
                                            issue={issue}
                                            onClick={() => goTo(issue)}
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
/*                        Метрика                                      */
/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <Box
            sx={{
                border: '1px solid #3c3c3c',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                bgcolor: '#1f1f20',
            }}
        >
            <Typography
                sx={{
                    fontSize: 22,
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#d4d4d4',
                    lineHeight: 1.1,
                }}
            >
                {value}
            </Typography>
            <Typography sx={{ fontSize: 10, color: '#7a7a7a', mt: 0.5 }}>
                {label}
            </Typography>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                        Строка проблемы                              */
/* ------------------------------------------------------------------ */

function IssueRow({
    issue,
    onClick,
}: {
    issue: CoverageIssue;
    onClick: () => void;
}) {
    const Icon =
        issue.severity === 'warning' ? WarningAmberIcon : InfoOutlinedIcon;
    const color = issue.severity === 'warning' ? '#dcdcaa' : '#4fc1ff';

    return (
        <Tooltip title={issue.description} placement="right" arrow>
            <Box
                onClick={onClick}
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    px: 1,
                    py: 0.75,
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.04)',
                        borderColor: '#3c3c3c',
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color,
                        mt: 0.15,
                        flexShrink: 0,
                    }}
                >
                    <Icon sx={{ fontSize: 14 }} />
                </Box>
                <Typography
                    sx={{
                        fontSize: 12,
                        color: '#d4d4d4',
                        lineHeight: 1.4,
                    }}
                >
                    {issue.title}
                </Typography>
            </Box>
        </Tooltip>
    );
}

/* ------------------------------------------------------------------ */
/*                        Утилиты                                      */
/* ------------------------------------------------------------------ */

function categoryLabel(cat: string): string {
    switch (cat) {
        case 'entity':
            return 'Сущности';
        case 'view':
            return 'Представления';
        case 'action':
            return 'Действия';
        case 'linkage':
            return 'Связи';
        case 'menu':
            return 'Меню';
        case 'rule':
            return 'Правила данных';
        default:
            return 'Прочее';
    }
}

// заглушка для типов
export type { CoverageSeverity };