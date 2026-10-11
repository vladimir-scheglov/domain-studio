import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Dialog,
    InputBase,
    List,
    ListItemButton,
    ListItemText,
    Typography,
} from '@mui/material';
import { useCommandStore, type Command } from '@/store/commandStore';

export function CommandPalette() {
    const open = useCommandStore((s) => s.open);
    const query = useCommandStore((s) => s.query);
    const setQuery = useCommandStore((s) => s.setQuery);
    const setOpen = useCommandStore((s) => s.setOpen);
    const commands = useCommandStore((s) => s.commands);
    const run = useCommandStore((s) => s.run);

    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const filtered = useMemo(
        () => filterCommands(commands, query),
        [commands, query]
    );

    // сброс активного индекса при смене запроса
    useEffect(() => {
        setActiveIndex(0);
    }, [query, open]);

    // автофокус на input при открытии
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // скролл активного элемента в поле зрения
    useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
        if (el) {
            el.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = filtered[activeIndex];
            if (cmd) run(cmd.id);
        } else if (e.key === 'Escape') {
            e.preventDefault();
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
                    overflow: 'hidden',
                },
            }}
        >
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid #3c3c3c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <Typography variant="caption" sx={{ opacity: 0.5 }}>
                    &gt;
                </Typography>
                <InputBase
                    inputRef={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Введите команду…"
                    fullWidth
                    sx={{ fontSize: 14 }}
                />
            </Box>

            {filtered.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.5 }}>
                        Ничего не найдено
                    </Typography>
                </Box>
            ) : (
                <List
                    ref={listRef}
                    dense
                    sx={{
                        maxHeight: 400,
                        overflow: 'auto',
                        py: 0.5,
                    }}
                >
                    {filtered.map((cmd, index) => (
                        <ListItemButton
                            key={cmd.id}
                            selected={index === activeIndex}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => run(cmd.id)}
                            sx={{
                                '&.Mui-selected': {
                                    bgcolor: '#0e639c',
                                    '&:hover': { bgcolor: '#1177bb' },
                                },
                            }}
                        >
                            <ListItemText
                                primary={cmd.title}
                                secondary={
                                    cmd.description ? (
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            sx={{ opacity: 0.6 }}
                                        >
                                            {cmd.description}
                                        </Typography>
                                    ) : undefined
                                }
                                primaryTypographyProps={{ fontSize: 13 }}
                                secondaryTypographyProps={{ fontSize: 11 }}
                            />
                            {cmd.group && (
                                <Typography
                                    variant="caption"
                                    sx={{ opacity: 0.4, mr: 1, fontSize: 10 }}
                                >
                                    {cmd.group}
                                </Typography>
                            )}
                            {cmd.keybindingLabel && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        opacity: 0.5,
                                        fontFamily: 'monospace',
                                        fontSize: 11,
                                    }}
                                >
                                    {cmd.keybindingLabel}
                                </Typography>
                            )}
                        </ListItemButton>
                    ))}
                </List>
            )}
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*                       Фильтрация команд                            */
/* ------------------------------------------------------------------ */

function filterCommands(commands: Command[], query: string): Command[] {
    const q = query.trim().toLowerCase();
    if (!q) return sortCommands(commands);

    const scored = commands
        .map((cmd) => ({ cmd, score: scoreCommand(cmd, q) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

    return scored.map((s) => s.cmd);
}

function scoreCommand(cmd: Command, q: string): number {
    const title = cmd.title.toLowerCase();
    const desc = (cmd.description ?? '').toLowerCase();
    const keywords = (cmd.keywords ?? []).map((k) => k.toLowerCase()).join(' ');

    let score = 0;
    if (title.startsWith(q)) score += 100;
    else if (title.includes(q)) score += 50;
    if (desc.includes(q)) score += 20;
    if (keywords.includes(q)) score += 10;
    return score;
}

function sortCommands(commands: Command[]): Command[] {
    // сначала по group (по алфавиту), затем по title
    return [...commands].sort((a, b) => {
        const g = (a.group ?? '').localeCompare(b.group ?? '');
        if (g !== 0) return g;
        return a.title.localeCompare(b.title);
    });
}