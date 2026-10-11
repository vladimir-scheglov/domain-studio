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
import { useSnippetPaletteStore } from '@/store/snippetPaletteStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useDocumentStore } from '@/store/documentStore';
import { useNotificationStore } from '@/store/notificationStore';
import { getAllSnippets, type SnippetCatalogItem } from '@/domain/allSnippets';
import { applyPatch } from '@/domain/patch';
import { positionByPath } from '@/domain/positionByPath';
import { useEditorStore } from '@/store/editorStore';
import { useWizardStore } from '@/store/wizardStore';

export function SnippetPalette() {
    const open = useSnippetPaletteStore((s) => s.open);
    const setOpen = useSnippetPaletteStore((s) => s.setOpen);
    const cursorPath = useSelectionStore((s) => s.cursorPath);

    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const yaml = useDocumentStore((s) => s.yaml);
    const setYaml = useDocumentStore((s) => s.setYaml);
    const notify = useNotificationStore((s) => s.notify);
    const parsed = useDocumentStore((s) => s.parsed);
    const revealPosition = useEditorStore((s) => s.revealPosition);
    const openWizard = useWizardStore((s) => s.open);

    const snippets = useMemo(
        () => getAllSnippets(cursorPath, parsed),
        [cursorPath, parsed]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return snippets;
        return snippets.filter(
            (s) =>
                s.label.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q)
        );
    }, [snippets, query]);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setActiveIndex(0);
            setQuery('');
        }
    }, [open]);

    useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.children[activeIndex] as
            | HTMLElement
            | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const applySnippet = (snippet: SnippetCatalogItem) => {
        if (snippet.id === 'attr.enum') {
            const entityId =
                typeof cursorPath[1] === 'string' ? cursorPath[1] : '';
            openWizard('attr.enum', { entityId });
            setOpen(false);
            return;
        }

        const generated = snippet.generate({ parsed, cursorPath });
        if (!generated) {
            notify('Сниппет уже применён', 'info', 2000);
            return;
        }

        try {
            const patch = {
                yaml: generated.yaml,
                mergeStrategy: snippet.mergeStrategy,
                targetPath: snippet.targetPath,
            };
            const result = applyPatch(yaml, patch);
            setYaml(result.yaml, result.parsed, result.doc);
            notify(`Вставлено: ${snippet.label}`, 'success', 2000);
            if (generated.focusPath && result.doc) {
                const pos = positionByPath(result.doc, generated.focusPath);
                if (pos) setTimeout(() => revealPosition(pos.line, pos.column), 50);
            }
        } catch (e) {
            notify(`Ошибка вставки: ${String(e)}`, 'error', 5000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const s = filtered[activeIndex];
            if (s) applySnippet(s);
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
                <Typography sx={{ fontSize: 12, color: '#5a5a5a' }}>
                    Сниппет:
                </Typography>
                <InputBase
                    inputRef={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Поиск…"
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
                    sx={{ maxHeight: 400, overflow: 'auto', py: 0.5 }}
                >
                    {filtered.map((s, i) => (
                        <ListItemButton
                            key={s.id}
                            selected={i === activeIndex}
                            onMouseEnter={() => setActiveIndex(i)}
                            onClick={() => applySnippet(s)}
                            sx={{
                                '&.Mui-selected': {
                                    bgcolor: '#0e639c',
                                    '&:hover': { bgcolor: '#1177bb' },
                                },
                            }}
                        >
                            <ListItemText
                                primary={s.label}
                                secondary={s.description}
                                primaryTypographyProps={{ fontSize: 13 }}
                                secondaryTypographyProps={{ fontSize: 11 }}
                            />
                            <Typography
                                sx={{
                                    fontSize: 10,
                                    color: '#5a5a5a',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.4,
                                    flexShrink: 0,
                                    ml: 1,
                                }}
                            >
                                {s.category}
                            </Typography>
                        </ListItemButton>
                    ))}
                </List>
            )}
        </Dialog>
    );
}