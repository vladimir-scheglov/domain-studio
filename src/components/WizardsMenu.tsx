import { useMemo, useRef, useState, useEffect } from 'react';
import {
    Box,
    Button,
    Divider,
    InputBase,
    Menu,
    MenuItem,
    Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import StorageIcon from '@mui/icons-material/Storage';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import LinkIcon from '@mui/icons-material/Link';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import MenuIcon from '@mui/icons-material/Menu';
import RuleIcon from '@mui/icons-material/Rule';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WidgetsIcon from '@mui/icons-material/Widgets';
import IconButton from '@mui/material/IconButton';

import {
    wizardRegistry,
    type Wizard,
    type WizardCategory,
} from '@/services/wizardRegistry';
import { useWizardStore } from '@/store/wizardStore';
import { useMixinLibraryStore } from '@/store/mixinLibraryStore';

type CategoryMeta = {
    key: WizardCategory;
    label: string;
    Icon: React.ComponentType<{ sx?: object }>;
};

const CATEGORIES: CategoryMeta[] = [
    { key: 'entity', label: 'Сущности', Icon: StorageIcon },
    { key: 'attribute', label: 'Атрибуты', Icon: TextFieldsIcon },
    { key: 'linkage', label: 'Связи', Icon: LinkIcon },
    { key: 'view', label: 'Представления', Icon: ViewQuiltIcon },
    { key: 'action', label: 'Действия', Icon: FlashOnIcon },
    { key: 'menu', label: 'Меню', Icon: MenuIcon },
    { key: 'rule', label: 'Правила данных', Icon: RuleIcon },
    { key: 'uirule', label: 'Правила UI', Icon: VisibilityOffIcon },
    { key: 'scenario', label: 'Сценарии и примеси', Icon: WidgetsIcon },
];

const RECENT_KEY = 'wizards-recent';
const MAX_RECENT = 5;

export function WizardsMenu() {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [query, setQuery] = useState('');
    const [recent, setRecent] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const openWizard = useWizardStore((s) => s.open);
    const allWizards = wizardRegistry.list();

    // Загружаем недавние
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(RECENT_KEY);
            if (raw) setRecent(JSON.parse(raw) as string[]);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (anchor) {
            setQuery('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [anchor]);

    const handleOpen = (wizardId: string) => {
        // сохранить в недавние
        const next = [
            wizardId,
            ...recent.filter((id) => id !== wizardId),
        ].slice(0, MAX_RECENT);
        setRecent(next);
        try {
            window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
            /* ignore */
        }

        openWizard(wizardId);
        setAnchor(null);
    };

    // Фильтрация
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return null;

        return allWizards.filter((w) => {
            const hay = [
                w.title,
                w.description ?? '',
                w.id,
                w.command ?? '',
                w.category,
            ]
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }, [allWizards, query]);

    const recentWizards = useMemo(
        () =>
            recent
                .map((id) => wizardRegistry.get(id))
                .filter((w): w is Wizard => Boolean(w)),
        [recent]
    );

    const grouped = useMemo(
        () =>
            CATEGORIES.map((meta) => ({
                ...meta,
                wizards: allWizards.filter((w) => w.category === meta.key),
            })).filter((g) => g.wizards.length > 0),
        [allWizards]
    );

    const totalCount = allWizards.length;

    return (
        <>
            <Button
                size="small"
                data-tour="wizards"
                onClick={(e) => setAnchor(e.currentTarget)}
                endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
                startIcon={<AutoFixHighIcon sx={{ fontSize: 14 }} />}
                sx={{
                    fontSize: 12,
                    textTransform: 'none',
                    color: '#c8c8c8',
                    height: 28,
                    px: 1,
                    minWidth: 0,
                    '&:hover': {
                        color: '#ffffff',
                        bgcolor: 'rgba(255, 255, 255, 0.06)',
                    },
                }}
            >
                Визарды
                <Box
                    component="span"
                    sx={{
                        ml: 0.5,
                        fontSize: 10,
                        color: '#5a5a5a',
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {totalCount}
                </Box>
            </Button>

            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                autoFocus={false}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: '#252526',
                            backgroundImage: 'none',
                            border: '1px solid #3c3c3c',
                            borderRadius: 1.5,
                            minWidth: 340,
                            maxWidth: 400,
                            mt: 0.5,
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '80vh',
                        },
                    },
                }}
            >
                {/* Поиск */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.75,
                        borderBottom: '1px solid #3c3c3c',
                        flexShrink: 0,
                    }}
                >
                    <SearchIcon sx={{ fontSize: 14, color: '#7a7a7a' }} />
                    <InputBase
                        inputRef={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Поиск визарда…"
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
                            sx={{ color: '#7a7a7a', width: 20, height: 20 }}
                        >
                            <ClearIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                    )}
                </Box>

                {/* Область скролла */}
                <Box sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
                    {filtered ? (
                        // Режим поиска — плоский список
                        filtered.length === 0 ? (
                            <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: 11, color: '#7a7a7a' }}>
                                    Ничего не найдено
                                </Typography>
                            </Box>
                        ) : (
                            filtered.map((w) => (
                                <WizardItem
                                    key={w.id}
                                    wizard={w}
                                    onSelect={() => handleOpen(w.id)}
                                />
                            ))
                        )
                    ) : (
                        <>
                            {/* Недавние */}
                            {recentWizards.length > 0 && (
                                <Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                            px: 1.5,
                                            py: 0.6,
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
                                            Недавние
                                        </Typography>
                                    </Box>
                                    {recentWizards.map((w) => (
                                        <WizardItem
                                            key={`recent-${w.id}`}
                                            wizard={w}
                                            onSelect={() => handleOpen(w.id)}
                                        />
                                    ))}
                                    <Divider sx={{ my: 0.5, borderColor: '#2a2a2a' }} />
                                </Box>
                            )}

                            {/* Все по категориям */}
                            {grouped.map((group, gi) => (
                                <Box key={group.key}>
                                    {gi > 0 && (
                                        <Divider sx={{ my: 0.5, borderColor: '#2a2a2a' }} />
                                    )}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                            px: 1.5,
                                            py: 0.6,
                                        }}
                                    >
                                        <group.Icon sx={{ fontSize: 13, color: '#7a7a7a' }} />
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
                                            {group.label}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: 10,
                                                color: '#5a5a5a',
                                                fontFamily: "'JetBrains Mono', monospace",
                                            }}
                                        >
                                            {group.wizards.length}
                                        </Typography>
                                    </Box>
                                    {group.wizards.map((w) => (
                                        <WizardItem
                                            key={w.id}
                                            wizard={w}
                                            onSelect={() => handleOpen(w.id)}
                                        />
                                    ))}
                                </Box>
                            ))}
                        </>
                    )}
                </Box>

                {/* Футер */}
                <Divider sx={{ borderColor: '#2a2a2a' }} />
                <MenuItem
                    onClick={() => {
                        setAnchor(null);
                        useMixinLibraryStore.getState().toggle();
                    }}
                    sx={{
                        fontSize: 11,
                        py: 0.75,
                        color: '#9d9d9d',
                        justifyContent: 'space-between',
                    }}
                >
                    <Box>Библиотека миксинов…</Box>
                    <Box
                        sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: '#5a5a5a',
                        }}
                    >
                        Ctrl+Shift+L
                    </Box>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setAnchor(null);
                        window.dispatchEvent(
                            new KeyboardEvent('keydown', {
                                key: 'k',
                                ctrlKey: true,
                                bubbles: true,
                            })
                        );
                    }}
                    sx={{
                        fontSize: 11,
                        py: 0.75,
                        color: '#9d9d9d',
                        justifyContent: 'space-between',
                    }}
                >
                    <Box>Все команды…</Box>
                    <Box
                        sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: '#5a5a5a',
                        }}
                    >
                        Ctrl+K
                    </Box>
                </MenuItem>
            </Menu>
        </>
    );
}

function WizardItem({
    wizard,
    onSelect,
}: {
    wizard: Wizard;
    onSelect: () => void;
}) {
    return (
        <MenuItem
            onClick={onSelect}
            sx={{
                px: 1.5,
                py: 0.75,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 0.25,
                '&:hover': { bgcolor: 'rgba(79, 193, 255, 0.08)' },
            }}
        >
            <Typography
                sx={{
                    fontSize: 12.5,
                    color: '#d4d4d4',
                    fontWeight: 500,
                    lineHeight: 1.3,
                }}
            >
                {wizard.title}
            </Typography>
            {wizard.description && (
                <Typography
                    sx={{
                        fontSize: 10.5,
                        color: '#7a7a7a',
                        lineHeight: 1.35,
                        whiteSpace: 'normal',
                    }}
                >
                    {wizard.description}
                </Typography>
            )}
        </MenuItem>
    );
}