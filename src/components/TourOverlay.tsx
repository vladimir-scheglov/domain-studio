import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTourStore } from '@/store/tourStore';
import { TOUR_STEPS, type TourPlacement } from '@/domain/tourSteps';

type Rect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

type PopoverPos = {
    top: number;
    left: number;
    placement: TourPlacement;
};

const PADDING = 8; // отступ подсветки вокруг целевого элемента
const POPOVER_WIDTH = 340;
const POPOVER_OFFSET = 16; // расстояние от подсвеченной области

export function TourOverlay() {
    const active = useTourStore((s) => s.active);
    const stepIndex = useTourStore((s) => s.stepIndex);
    const next = useTourStore((s) => s.next);
    const prev = useTourStore((s) => s.prev);
    const stop = useTourStore((s) => s.stop);
    const markCompleted = useTourStore((s) => s.markCompleted);

    const [targetRect, setTargetRect] = useState<Rect | null>(null);
    const [popoverPos, setPopoverPos] = useState<PopoverPos>({
        top: 0,
        left: 0,
        placement: 'center',
    });
    const popoverRef = useRef<HTMLDivElement>(null);

    const step = TOUR_STEPS[stepIndex];

    /* ----- Реакция на смену шага ----- */
    useEffect(() => {
        if (!active || !step) return;

        step.beforeShow?.();

        // Небольшая задержка, чтобы beforeShow успел применить изменения
        const timer = setTimeout(() => {
            updatePositions();
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, stepIndex]);

    /* ----- Позиция обновляется при ресайзе и скролле ----- */
    useEffect(() => {
        if (!active) return;

        const handler = () => updatePositions();
        window.addEventListener('resize', handler);
        window.addEventListener('scroll', handler, true);

        return () => {
            window.removeEventListener('resize', handler);
            window.removeEventListener('scroll', handler, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, stepIndex]);

    /* ----- Основная функция расчёта позиций ----- */
    function updatePositions() {
        if (!step) return;

        // Если это центрированный шаг
        if (!step.target || step.placement === 'center') {
            setTargetRect(null);
            setPopoverPos({
                top: window.innerHeight / 2,
                left: window.innerWidth / 2,
                placement: 'center',
            });
            return;
        }

        // Ищем целевой элемент
        const el = document.querySelector(step.target) as HTMLElement | null;
        if (!el) {
            // Если не нашли — центрируем
            setTargetRect(null);
            setPopoverPos({
                top: window.innerHeight / 2,
                left: window.innerWidth / 2,
                placement: 'center',
            });
            return;
        }

        // Прокрутить в зону видимости
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

        const rect = el.getBoundingClientRect();
        const padded: Rect = {
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
        };
        setTargetRect(padded);

        // Позиция попапа
        setPopoverPos(computePopoverPos(padded, step.placement));
    }

    /* ----- Уточняем позицию попапа после его рендера ----- */
    useLayoutEffect(() => {
        if (!active || !popoverRef.current || !targetRect) return;

        const popoverRect = popoverRef.current.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        // Не даём выйти за пределы экрана
        let { top, left } = popoverPos;

        if (popoverPos.placement !== 'center') {
            if (left < 8) left = 8;
            if (left + popoverRect.width > viewportW - 8) {
                left = viewportW - popoverRect.width - 8;
            }
            if (top < 8) top = 8;
            if (top + popoverRect.height > viewportH - 8) {
                top = viewportH - popoverRect.height - 8;
            }
            setPopoverPos((prev) =>
                prev.top !== top || prev.left !== left
                    ? { ...prev, top, left }
                    : prev
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetRect, popoverPos.placement]);

    /* ----- Хоткеи ----- */
    useEffect(() => {
        if (!active) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                markCompleted();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (stepIndex < TOUR_STEPS.length - 1) next();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (stepIndex > 0) prev();
            }
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, stepIndex, next, prev, stop]);

    if (!active || !step) return null;

    const isLast = stepIndex === TOUR_STEPS.length - 1;

    return (
        <>
            {/* Затемнение фона с «дыркой» под целевой элемент */}
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9000,
                    pointerEvents: 'auto',
                    // клик по оверлею останавливает тур
                    bgcolor: 'rgba(0, 0, 0, 0.55)',
                }}
                onClick={markCompleted}
            >
                {targetRect && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: targetRect.top,
                            left: targetRect.left,
                            width: targetRect.width,
                            height: targetRect.height,
                            borderRadius: 1,
                            boxShadow:
                                '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 0 2px #4fc1ff, 0 0 20px rgba(79, 193, 255, 0.6)',
                            pointerEvents: 'none',
                            transition: 'all 0.25s ease',
                        }}
                    />
                )}
            </Box>

            {/* Попап */}
            <Box
                ref={popoverRef}
                onClick={(e) => e.stopPropagation()}
                sx={{
                    position: 'fixed',
                    top: popoverPos.top,
                    left: popoverPos.left,
                    width: POPOVER_WIDTH,
                    zIndex: 9100,
                    bgcolor: '#252526',
                    border: '1px solid #3c3c3c',
                    borderRadius: 2,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                    transform:
                        popoverPos.placement === 'center'
                            ? 'translate(-50%, -50%)'
                            : 'none',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                }}
            >
                {/* Заголовок */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        pt: 1.5,
                        pb: 0.5,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            color: '#7a7a7a',
                            flex: 1,
                        }}
                    >
                        Шаг {stepIndex + 1} из {TOUR_STEPS.length}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={markCompleted}
                        sx={{ color: '#7a7a7a', width: 22, height: 22 }}
                    >
                        <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </Box>

                {/* Контент */}
                <Box sx={{ px: 2, pb: 1.5 }}>
                    <Typography
                        sx={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#d4d4d4',
                            mb: 0.75,
                        }}
                    >
                        {step.title}
                    </Typography>
                    <Typography
                        sx={{ fontSize: 12, color: '#9d9d9d', lineHeight: 1.5 }}
                    >
                        {step.content}
                    </Typography>
                </Box>

                {/* Прогресс */}
                <Box
                    sx={{
                        height: 3,
                        bgcolor: '#1f1f20',
                        position: 'relative',
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: `${((stepIndex + 1) / TOUR_STEPS.length) * 100}%`,
                            bgcolor: '#0e639c',
                            transition: 'width 0.2s ease',
                        }}
                    />
                </Box>

                {/* Кнопки */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1.5,
                        borderTop: '1px solid #3c3c3c',
                    }}
                >
                    <Button
                        size="small"
                        onClick={markCompleted}
                        sx={{
                            fontSize: 11,
                            textTransform: 'none',
                            color: '#7a7a7a',
                            minWidth: 0,
                        }}
                    >
                        Пропустить
                    </Button>

                    <Box sx={{ flex: 1 }} />

                    <Button
                        size="small"
                        onClick={prev}
                        disabled={stepIndex === 0}
                        startIcon={<ArrowBackIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            fontSize: 12,
                            textTransform: 'none',
                            minWidth: 0,
                            '& .MuiButton-startIcon': { mr: 0.5 },
                        }}
                    >
                        Назад
                    </Button>

                    <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                            if (isLast) {
                                markCompleted();
                            } else {
                                next();
                            }
                        }}
                        endIcon={
                            !isLast ? <ArrowForwardIcon sx={{ fontSize: 14 }} /> : undefined
                        }
                        sx={{
                            fontSize: 12,
                            textTransform: 'none',
                            minWidth: 0,
                            '& .MuiButton-endIcon': { ml: 0.5 },
                        }}
                    >
                        {isLast ? 'Завершить' : 'Далее'}
                    </Button>
                </Box>
            </Box>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*                       Позиция попапа                                */
/* ------------------------------------------------------------------ */

function computePopoverPos(rect: Rect, placement: TourPlacement): PopoverPos {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    switch (placement) {
        case 'top':
            return {
                top: rect.top - POPOVER_OFFSET - 200,
                left: rect.left + rect.width / 2 - POPOVER_WIDTH / 2,
                placement,
            };
        case 'bottom':
            return {
                top: rect.top + rect.height + POPOVER_OFFSET,
                left: rect.left + rect.width / 2 - POPOVER_WIDTH / 2,
                placement,
            };
        case 'left':
            return {
                top: rect.top + rect.height / 2 - 100,
                left: rect.left - POPOVER_WIDTH - POPOVER_OFFSET,
                placement,
            };
        case 'right':
            return {
                top: rect.top + rect.height / 2 - 100,
                left: rect.left + rect.width + POPOVER_OFFSET,
                placement,
            };
        case 'center':
        default:
            return {
                top: viewportH / 2,
                left: viewportW / 2,
                placement: 'center',
            };
    }
}