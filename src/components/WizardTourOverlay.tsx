import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useWizardTourStore } from '@/store/wizardTourStore';
import { WIZARD_TOURS } from '@/domain/wizardTours';

type Rect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

const PADDING = 6;

export function WizardTourOverlay() {
    const active = useWizardTourStore((s) => s.active);
    const wizardId = useWizardTourStore((s) => s.wizardId);
    const stepIndex = useWizardTourStore((s) => s.stepIndex);
    const next = useWizardTourStore((s) => s.next);
    const prev = useWizardTourStore((s) => s.prev);
    const stop = useWizardTourStore((s) => s.stop);
    const markSeen = useWizardTourStore((s) => s.markSeen);

    const [rect, setRect] = useState<Rect | null>(null);

    const tour = wizardId ? WIZARD_TOURS[wizardId] : null;
    const step = tour?.steps[stepIndex];

    useEffect(() => {
        if (!active || !step) return;

        const update = () => {
            const el = document.querySelector(
                `[data-wizard-field="${step.field}"]`
            ) as HTMLElement | null;

            if (!el) {
                setRect(null);
                return;
            }

            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            const r = el.getBoundingClientRect();
            setRect({
                top: r.top - PADDING,
                left: r.left - PADDING,
                width: r.width + PADDING * 2,
                height: r.height + PADDING * 2,
            });
        };

        const t = setTimeout(update, 350);

        const onResize = () => update();
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onResize, true);

        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onResize, true);
        };
    }, [active, step]);

    // Смена шага визарда при смене шага тура
    useEffect(() => {
        if (!active || !step) return;
        // WizardHost сам подписан на stepIndex — вызовем его синхронизацию через событие
        window.dispatchEvent(
            new CustomEvent('domain-studio:wizard-tour-go-to-step', {
                detail: step.wizardStep,
            })
        );
    }, [active, step]);

    // Хоткеи
    useEffect(() => {
        if (!active) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                markSeenSafe();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (stepIndex > 0) prev();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, stepIndex]);

    if (!active || !tour || !step) return null;

    const isLast = stepIndex === tour.steps.length - 1;

    function markSeenSafe() {
        if (wizardId) markSeen(wizardId);
        stop();
    }

    function handleNext() {
        if (isLast) {
            markSeenSafe();
        } else {
            next();
        }
    }

    // Позиция попапа — под подсвеченным полем
    const popoverTop = rect ? rect.top + rect.height + 12 : window.innerHeight / 2;
    const popoverLeft = rect
        ? Math.max(16, Math.min(rect.left, window.innerWidth - 360 - 16))
        : window.innerWidth / 2 - 180;

    return (
        <>
            {/* Затемнение с дыркой */}
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10000,
                    pointerEvents: 'auto',
                    bgcolor: 'rgba(0, 0, 0, 0.45)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {rect && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height,
                            borderRadius: 1,
                            boxShadow:
                                '0 0 0 9999px rgba(0, 0, 0, 0.45), 0 0 0 2px #4fc1ff',
                            pointerEvents: 'none',
                            transition: 'all 0.25s ease',
                        }}
                    />
                )}
            </Box>

            {/* Попап */}
            <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                    position: 'fixed',
                    top: popoverTop,
                    left: popoverLeft,
                    width: 360,
                    zIndex: 10100,
                    bgcolor: '#252526',
                    border: '1px solid #3c3c3c',
                    borderRadius: 2,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                    <Typography
                        sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            color: '#7a7a7a',
                            mb: 0.5,
                        }}
                    >
                        {stepIndex + 1} / {tour.steps.length}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#d4d4d4',
                            mb: 0.5,
                        }}
                    >
                        {step.title}
                    </Typography>
                    <Typography
                        sx={{ fontSize: 11.5, color: '#9d9d9d', lineHeight: 1.5 }}
                    >
                        {step.content}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 2,
                        py: 1.25,
                        borderTop: '1px solid #3c3c3c',
                        mt: 1.5,
                    }}
                >
                    <Button
                        size="small"
                        onClick={markSeenSafe}
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
                        onClick={handleNext}
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
                        {isLast ? 'Понятно' : 'Далее'}
                    </Button>
                </Box>
            </Box>
        </>
    );
}