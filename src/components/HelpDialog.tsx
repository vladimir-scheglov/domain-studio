import {
    Box,
    Button,
    Dialog,
    Divider,
    IconButton,
    InputBase,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { useHelpStore } from '@/store/helpStore';
import { HOTKEY_GROUPS, isMacPlatform } from '@/domain/hotkeys';
import { useMemo, useState } from 'react';

import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTourStore } from '@/store/tourStore';

export function HelpDialog() {
    const open = useHelpStore((s) => s.open);
    const setOpen = useHelpStore((s) => s.setOpen);
    const mac = isMacPlatform();

    const [query, setQuery] = useState('');

    const filteredGroups = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return HOTKEY_GROUPS;

        return HOTKEY_GROUPS.map((g) => ({
            ...g,
            items: g.items.filter((it) => {
                const hay = [
                    it.action,
                    it.mac,
                    it.win,
                    it.hint ?? '',
                ]
                    .join(' ')
                    .toLowerCase();
                return hay.includes(q);
            }),
        })).filter((g) => g.items.length > 0);
    }, [query]);

    const totalShown = filteredGroups.reduce(
        (sum, g) => sum + g.items.length,
        0
    );

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
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1.5,
                    }}
                >
                    <KeyboardIcon sx={{ color: '#4fc1ff', fontSize: 20 }} />
                    <Typography sx={{ fontSize: 16, fontWeight: 600, flex: 1 }}>
                        Горячие клавиши
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#7a7a7a', mr: 1 }}>
                        {mac ? 'Раскладка macOS' : 'Раскладка Windows / Linux'}
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
                        mb: 2,
                        border: '1px solid #3c3c3c',
                        borderRadius: 1,
                        bgcolor: '#1f1f20',
                    }}
                >
                    <SearchIcon sx={{ fontSize: 14, color: '#7a7a7a' }} />
                    <InputBase
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Поиск по названию или комбинации…"
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

                {/* Сетка категорий */}
                {totalShown === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 12, color: '#7a7a7a' }}>
                            Ничего не найдено по запросу «{query}»
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 2.5,
                            maxHeight: '60vh',
                            overflow: 'auto',
                            pr: 0.5,
                        }}
                    >
                        {filteredGroups.map((group) => (
                            <Box key={group.id}>
                                <Typography
                                    sx={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.6,
                                        color: '#7a7a7a',
                                        mb: 1,
                                    }}
                                >
                                    {group.title}
                                </Typography>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.75,
                                    }}
                                >
                                    {group.items.map((item, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 1,
                                                py: 0.25,
                                            }}
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: 12,
                                                        color: '#d4d4d4',
                                                        lineHeight: 1.3,
                                                    }}
                                                >
                                                    {item.action}
                                                </Typography>
                                                {item.hint && (
                                                    <Typography
                                                        sx={{
                                                            fontSize: 10,
                                                            color: '#7a7a7a',
                                                            lineHeight: 1.3,
                                                            mt: 0.25,
                                                        }}
                                                    >
                                                        {item.hint}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Kbd>{mac ? item.mac : item.win}</Kbd>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
                
                <Divider sx={{ mt: 2, mb: 1.5, borderColor: '#3c3c3c' }} />
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mt: 2,
                }}>
                    <Typography sx={{ fontSize: 11, color: '#7a7a7a', flex: 1 }}>
                        На macOS некоторые сочетания могут перехватываться системой.
                        Для подсказок используйте <Kbd>⌃Space</Kbd> или <Kbd>⌘I</Kbd>.
                    </Typography>

                    <Button
                        size="small"
                        onClick={() => {
                            setOpen(false);
                            useTourStore.getState().reset();
                            useTourStore.getState().start(0);
                        }}
                        sx={{ fontSize: 11, textTransform: 'none', color: '#4fc1ff' }}
                    >
                        Запустить обзорный тур
                    </Button>
                </Box>
            </Box>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*                        Кнопка-хоткей                                */
/* ------------------------------------------------------------------ */

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <Box
            component="kbd"
            sx={{
                display: 'inline-block',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: '#d4d4d4',
                bgcolor: '#1e1e1e',
                border: '1px solid #3c3c3c',
                borderBottom: '2px solid #3c3c3c',
                borderRadius: 0.5,
                px: 0.75,
                py: 0.25,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                mx: 0.25,
            }}
        >
            {children}
        </Box>
    );
}