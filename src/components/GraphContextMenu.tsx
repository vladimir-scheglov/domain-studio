import { useEffect, useRef } from 'react';
import { Box, Divider, Typography } from '@mui/material';

export type ContextMenuTarget =
    | { kind: 'node'; id: string }
    | { kind: 'edge'; id: string }
    | { kind: 'pane' };

export type ContextMenuItem = {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    dividerBefore?: boolean;
};

type Props = {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
};

export function GraphContextMenu({ x, y, items, onClose }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) onClose();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        // откладываем подписку на следующий тик, чтобы клик, открывший меню,
        // не закрыл его сразу
        const id = setTimeout(() => {
            document.addEventListener('mousedown', onClickOutside);
            document.addEventListener('keydown', onKey);
        }, 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener('mousedown', onClickOutside);
            document.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return (
        <Box
            ref={ref}
            sx={{
                position: 'fixed',
                left: x,
                top: y,
                zIndex: 3000,
                minWidth: 220,
                bgcolor: '#252526',
                border: '1px solid #3c3c3c',
                borderRadius: 1,
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                py: 0.5,
                overflow: 'hidden',
            }}
        >
            {items.map((item, idx) => (
                <Box key={item.id}>
                    {item.dividerBefore && idx > 0 && (
                        <Divider sx={{ my: 0.5, borderColor: '#3c3c3c' }} />
                    )}
                    <MenuItem item={item} onClose={onClose} />
                </Box>
            ))}
        </Box>
    );
}

function MenuItem({
    item,
    onClose,
}: {
    item: ContextMenuItem;
    onClose: () => void;
}) {
    return (
        <Box
            onClick={() => {
                item.onClick();
                onClose();
            }}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                cursor: 'pointer',
                userSelect: 'none',
                color: item.danger ? '#f48771' : '#d4d4d4',
                fontSize: 12,
                '&:hover': {
                    bgcolor: item.danger
                        ? 'rgba(244, 135, 113, 0.12)'
                        : 'rgba(255,255,255,0.06)',
                    color: item.danger ? '#f8b3b3' : '#fff',
                },
            }}
        >
            {item.icon && (
                <Box sx={{ display: 'flex', alignItems: 'center', width: 16 }}>
                    {item.icon}
                </Box>
            )}
            <Typography component="span" sx={{ fontSize: 12 }}>
                {item.label}
            </Typography>
        </Box>
    );
}