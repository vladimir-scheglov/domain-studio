import { Box, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export type StripDirection = 'left' | 'right' | 'up' | 'down';

type Props = {
    direction: StripDirection;
    title: string;
    /** Основной текст под иконкой (например, «Сущность: Device»). */
    status?: string;
    /** Иконка статуса. */
    icon?: React.ReactNode;
    /** Дополнительная информация (например, счётчики). */
    extra?: React.ReactNode;
    onExpand: () => void;
    /** Цвет акцента. По умолчанию — нейтральный. */
    accent?: string;
};

export function CollapsedPanelStrip({
    direction,
    title,
    status,
    icon,
    extra,
    onExpand,
    accent = '#9d9d9d',
}: Props) {
    const isVertical = direction === 'left' || direction === 'right';
    const openIcon =
        direction === 'left' ? (
            <ChevronRightIcon sx={{ fontSize: 14 }} />
        ) : direction === 'right' ? (
            <ChevronLeftIcon sx={{ fontSize: 14 }} />
        ) : direction === 'up' ? (
            <ExpandMoreIcon sx={{ fontSize: 14 }} />
        ) : (
            <ExpandLessIcon sx={{ fontSize: 14 }} />
        );

    return (
        <Tooltip
            title={
                <Box sx={{ p: 0.5 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600 }}>
                        {title}
                    </Typography>
                    {status && (
                        <Typography sx={{ fontSize: 10, opacity: 0.7, mt: 0.25 }}>
                            {status}
                        </Typography>
                    )}
                    <Typography sx={{ fontSize: 10, opacity: 0.5, mt: 0.5 }}>
                        Нажмите, чтобы развернуть
                    </Typography>
                </Box>
            }
            placement={isVertical ? (direction === 'right' ? 'left' : 'right') : 'top'}
            arrow
        >
            <Box
                onClick={onExpand}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    userSelect: 'none',
                    bgcolor: '#1f1f20',
                    borderLeft: direction === 'right' ? '1px solid #3c3c3c' : undefined,
                    borderRight: direction === 'left' ? '1px solid #3c3c3c' : undefined,
                    borderTop: direction === 'down' ? '1px solid #3c3c3c' : undefined,
                    borderBottom: direction === 'up' ? '1px solid #3c3c3c' : undefined,
                    transition: 'background-color 0.15s',
                    '&:hover': {
                        bgcolor: '#2a2a2b',
                    },
                    ...(isVertical
                        ? {
                            width: 32,
                            flex: '0 0 32px',
                            flexDirection: 'column',
                            py: 1,
                            minHeight: 0,
                            overflow: 'hidden',
                        }
                        : {
                            height: 26,
                            flex: '0 0 26px',
                            flexDirection: 'row',
                            px: 1.5,
                            minWidth: 0,
                            overflow: 'hidden',
                        }),
                }}
            >
                {/* Иконка статуса */}
                {icon && (
                    <Box
                        sx={{
                            color: accent,
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {icon}
                    </Box>
                )}

                {/* Вертикальный/горизонтальный текст */}
                {isVertical ? (
                    <Typography
                        sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            color: '#9d9d9d',
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxHeight: '100%',
                        }}
                    >
                        {title}
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            minWidth: 0,
                            flex: 1,
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: 10,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                                color: '#9d9d9d',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            {title}
                        </Typography>

                        {status && (
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    color: '#c8c8c8',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    minWidth: 0,
                                }}
                            >
                                {status}
                            </Typography>
                        )}

                        {extra && <Box sx={{ flexShrink: 0, ml: 'auto' }}>{extra}</Box>}
                    </Box>
                )}

                {/* Иконка развернуть */}
                <Box
                    sx={{
                        color: '#5a5a5a',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                    }}
                >
                    {openIcon}
                </Box>
            </Box>
        </Tooltip>
    );
}