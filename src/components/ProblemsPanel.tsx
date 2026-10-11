import { useMemo, useState } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CloseIcon from '@mui/icons-material/Close';
import { useValidationStore } from '@/store/validationStore';
import { useDocumentStore } from '@/store/documentStore';
import { useEditorStore } from '@/store/editorStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useNotificationStore } from '@/store/notificationStore';
import { positionByPath } from '@/domain/positionByPath';
import type { DiagnosticSeverity } from '@/store/validationStore';
import { usePanelLayoutStore } from '@/store/panelLayoutStore';
import { CollapsedPanelStrip } from './CollapsedPanelStrip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const FILTER_OPTIONS: Array<{
    value: DiagnosticSeverity;
    label: string;
    color: string;
}> = [
        { value: 'error', label: 'Ошибки', color: '#f48771' },
        { value: 'warning', label: 'Предупреждения', color: '#dcdcaa' },
        { value: 'info', label: 'Информация', color: '#4fc1ff' },
    ];

export function ProblemsPanel() {
    const diagnostics = useValidationStore((s) => s.diagnostics);
    const [activeFilters, setActiveFilters] = useState<
        Set<DiagnosticSeverity>
    >(new Set(['error', 'warning', 'info']));

    const collapsed = usePanelLayoutStore((s) => s.collapsed.problems);
    const setCollapsed = usePanelLayoutStore((s) => s.setCollapsed);

    const toggleFilter = (s: DiagnosticSeverity) => {
        setActiveFilters((prev) => {
            const next = new Set(prev);
            if (next.has(s)) next.delete(s);
            else next.add(s);
            // не позволяем отключить всё сразу — оставим хотя бы один
            if (next.size === 0) next.add(s);
            return next;
        });
    };

    const stats = useMemo(() => {
        const errors = diagnostics.filter((d) => d.severity === 'error').length;
        const warnings = diagnostics.filter(
            (d) => d.severity === 'warning'
        ).length;
        const infos = diagnostics.filter((d) => d.severity === 'info').length;
        return { errors, warnings, infos };
    }, [diagnostics]);

    const filtered = useMemo(
        () => diagnostics.filter((d) => activeFilters.has(d.severity)),
        [diagnostics, activeFilters]
    );

    if (collapsed) {
        // Счётчики для отображения на свёрнутой панели
        const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
        const warningCount = diagnostics.filter(
            (d) => d.severity === 'warning'
        ).length;

        return (
            <CollapsedPanelStrip
                direction="down"
                title="Проблемы"
                status={
                    diagnostics.length === 0
                        ? 'Нет проблем'
                        : `${errorCount} ошибок, ${warningCount} предупреждений`
                }
                icon={<ErrorOutlineIcon sx={{ fontSize: 14 }} />}
                accent={
                    errorCount > 0 ? '#f48771' : warningCount > 0 ? '#dcdcaa' : '#4ec9b0'
                }
                extra={
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        {errorCount > 0 && (
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    color: '#f48771',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 600,
                                }}
                            >
                                ✕ {errorCount}
                            </Typography>
                        )}
                        {warningCount > 0 && (
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    color: '#dcdcaa',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 600,
                                }}
                            >
                                ⚠ {warningCount}
                            </Typography>
                        )}
                    </Box>
                }
                onExpand={() => setCollapsed('problems', false)}
            />
        );
    }

    return (
        <Box
            data-tour="problems"
            sx={{
                height: 200,
                flex: '0 0 200px',
                borderTop: '1px solid #3c3c3c',
                bgcolor: '#252526',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
            }}
        >
            {/* Заголовок и фильтры */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
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
                    }}
                >
                    Проблемы
                </Typography>

                <Typography
                    sx={{
                        fontSize: 10,
                        color: '#5a5a5a',
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {diagnostics.length}
                </Typography>

                <Box sx={{ width: '1px', height: 14, bgcolor: '#3c3c3c', mx: 0.5 }} />

                <FilterAltIcon sx={{ fontSize: 14, color: '#7a7a7a' }} />

                {FILTER_OPTIONS.map((opt) => {
                    const count =
                        opt.value === 'error'
                            ? stats.errors
                            : opt.value === 'warning'
                                ? stats.warnings
                                : stats.infos;
                    const active = activeFilters.has(opt.value);
                    return (
                        <Chip
                            key={opt.value}
                            size="small"
                            label={`${opt.label} ${count}`}
                            onClick={() => toggleFilter(opt.value)}
                            sx={{
                                height: 20,
                                fontSize: 10,
                                bgcolor: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                                color: active ? opt.color : '#5a5a5a',
                                border: `1px solid ${active ? opt.color + '66' : '#3c3c3c'}`,
                                '& .MuiChip-label': { px: 0.75 },
                                '&:hover': {
                                    bgcolor: active
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(255,255,255,0.03)',
                                },
                            }}
                        />
                    );
                })}

                <Box sx={{ flex: 1 }} />

                {diagnostics.length > 0 && (
                    <Typography
                        sx={{ fontSize: 10, color: '#5a5a5a' }}
                    >
                        Двойной клик — перейти к строке
                    </Typography>
                )}
                <Tooltip title="Свернуть" arrow>
                    <IconButton
                        size="small"
                        onClick={() => setCollapsed('problems', true)}
                        sx={{ color: '#7a7a7a', width: 22, height: 22 }}
                    >
                        <ExpandMoreIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Список проблем */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {diagnostics.length === 0 ? (
                    <Box sx={{ px: 2, py: 2 }}>
                        <Typography sx={{ fontSize: 11, color: '#5a5a5a' }}>
                            ✓ Нет проблем
                        </Typography>
                    </Box>
                ) : filtered.length === 0 ? (
                    <Box sx={{ px: 2, py: 2 }}>
                        <Typography sx={{ fontSize: 11, color: '#5a5a5a' }}>
                            Все проблемы отфильтрованы
                        </Typography>
                    </Box>
                ) : (
                    filtered.map((d, i) => (
                        <ProblemRow key={i} diagnostic={d} />
                    ))
                )}
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                          Строка проблемы                            */
/* ------------------------------------------------------------------ */

function ProblemRow({
    diagnostic,
}: {
    diagnostic: ReturnType<typeof useValidationStore.getState>['diagnostics'][0];
}) {
    const doc = useDocumentStore((s) => s.doc);
    const revealPosition = useEditorStore((s) => s.revealPosition);
    const setCursorPath = useSelectionStore((s) => s.setCursorPath);
    const notify = useNotificationStore((s) => s.notify);

    const { icon, color } = getSeverityVisual(diagnostic.severity);

    const goTo = () => {
        // приоритет: точная позиция из диагностики
        if (diagnostic.startLine > 0) {
            revealPosition(diagnostic.startLine, diagnostic.startColumn);
            // синхронизируем инспектор — если есть path
            if (diagnostic.path.length > 0) {
                setCursorPath(diagnostic.path);
            }
            return;
        }

        // fallback по path
        if (doc && diagnostic.path.length > 0) {
            const pos = positionByPath(doc, diagnostic.path);
            if (pos) {
                revealPosition(pos.line, pos.column);
                setCursorPath(diagnostic.path);
                return;
            }
        }

        notify('Не удалось определить позицию', 'warning', 2000);
    };

    return (
        <Box
            onClick={goTo}
            onDoubleClick={goTo}
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                px: 1.5,
                py: 0.5,
                cursor: 'pointer',
                borderLeft: '2px solid transparent',
                transition: 'background-color 0.1s, border-color 0.1s',
                '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                    borderLeftColor: color,
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
                {icon}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: 12,
                        color: '#d4d4d4',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                    }}
                >
                    {diagnostic.message}
                </Typography>
                {diagnostic.path.length > 0 && (
                    <Typography
                        sx={{
                            fontSize: 10,
                            color: '#5a5a5a',
                            fontFamily: "'JetBrains Mono', monospace",
                            mt: 0.15,
                        }}
                    >
                        {diagnostic.path.join(' › ')}
                    </Typography>
                )}
            </Box>

            <Typography
                sx={{
                    fontSize: 10,
                    color: '#5a5a5a',
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                    ml: 1,
                }}
            >
                {diagnostic.startLine}:{diagnostic.startColumn}
            </Typography>
        </Box>
    );
}

function getSeverityVisual(s: DiagnosticSeverity) {
    switch (s) {
        case 'error':
            return {
                icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} />,
                color: '#f48771',
            };
        case 'warning':
            return {
                icon: <WarningAmberIcon sx={{ fontSize: 14 }} />,
                color: '#dcdcaa',
            };
        case 'info':
        default:
            return {
                icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />,
                color: '#4fc1ff',
            };
    }
}

// заглушка для типов
void IconButton;
void Tooltip;
void CloseIcon;