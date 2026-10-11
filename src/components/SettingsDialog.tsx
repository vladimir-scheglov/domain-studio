import { useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    Divider,
    FormControlLabel,
    FormGroup,
    IconButton,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import {
    useSettingsStore,
    type WarningCategory,
} from '@/store/settingsStore';
import { useSettingsDialogStore } from '@/store/settingsDialogStore';
import { useTourStore } from '@/store/tourStore';
import { useWizardTourStore } from '@/store/wizardTourStore';

type TabId = 'appearance' | 'editor' | 'validation' | 'files' | 'notifications';

const TABS: Array<{ id: TabId; label: string }> = [
    { id: 'appearance', label: 'Внешний вид' },
    { id: 'editor', label: 'Редактор' },
    { id: 'validation', label: 'Валидация' },
    { id: 'files', label: 'Файлы' },
    { id: 'notifications', label: 'Уведомления' },
];

const CATEGORIES: Array<{ key: WarningCategory; label: string }> = [
    { key: 'unknown_property', label: 'Неизвестные свойства' },
    { key: 'broken_ref', label: 'Битые ссылки' },
    { key: 'semver', label: 'SemVer' },
    { key: 'duplicate_id', label: 'Дубликаты id' },
    { key: 'other', label: 'Прочее' },
];

export function SettingsDialog() {
    const open = useSettingsDialogStore((s) => s.open);
    const setOpen = useSettingsDialogStore((s) => s.setOpen);
    const [tab, setTab] = useState<TabId>('appearance');

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
                    minHeight: 460,
                },
            }}
        >
            {/* Заголовок */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2.5,
                    py: 1.5,
                    borderBottom: '1px solid #3c3c3c',
                }}
            >
                <SettingsIcon sx={{ color: '#4fc1ff', fontSize: 18 }} />
                <Typography sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
                    Настройки
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => setOpen(false)}
                    sx={{ color: '#9d9d9d' }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            <Box sx={{ display: 'flex', minHeight: 400 }}>
                {/* Левая панель — табы */}
                <Box
                    sx={{
                        width: 180,
                        flex: '0 0 180px',
                        borderRight: '1px solid #3c3c3c',
                        py: 1,
                    }}
                >
                    {TABS.map((t) => (
                        <Box
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            sx={{
                                px: 2,
                                py: 0.75,
                                cursor: 'pointer',
                                fontSize: 12,
                                color: tab === t.id ? '#ffffff' : '#9d9d9d',
                                bgcolor:
                                    tab === t.id ? 'rgba(14, 99, 156, 0.15)' : 'transparent',
                                borderLeft: `2px solid ${tab === t.id ? '#4fc1ff' : 'transparent'
                                    }`,
                                '&:hover': {
                                    bgcolor:
                                        tab === t.id
                                            ? 'rgba(14, 99, 156, 0.25)'
                                            : 'rgba(255, 255, 255, 0.04)',
                                },
                            }}
                        >
                            {t.label}
                        </Box>
                    ))}
                </Box>

                {/* Правая панель — содержимое вкладки */}
                <Box sx={{ flex: 1, p: 2.5, overflow: 'auto', maxHeight: 520 }}>
                    {tab === 'appearance' && <AppearanceTab />}
                    {tab === 'editor' && <EditorTab />}
                    {tab === 'validation' && <ValidationTab />}
                    {tab === 'files' && <FilesTab />}
                    {tab === 'notifications' && <NotificationsTab />}
                </Box>
            </Box>

            {/* Футер */}
            <Divider sx={{ borderColor: '#3c3c3c' }} />
            <Box
                sx={{
                    px: 2.5,
                    py: 1.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Button
                    size="small"
                    onClick={() => {
                        if (
                            window.confirm(
                                'Сбросить все настройки к значениям по умолчанию?'
                            )
                        ) {
                            useSettingsStore.getState().resetAll();
                        }
                    }}
                    sx={{ fontSize: 12, textTransform: 'none', color: '#9d9d9d' }}
                >
                    Сбросить всё
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    onClick={() => setOpen(false)}
                    sx={{ fontSize: 12, textTransform: 'none' }}
                >
                    Закрыть
                </Button>
            </Box>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*                       Внешний вид                                   */
/* ------------------------------------------------------------------ */

function AppearanceTab() {
    const theme = useSettingsStore((s) => s.theme);
    const setTheme = useSettingsStore((s) => s.setTheme);
    const fontSize = useSettingsStore((s) => s.editorFontSize);
    const setFontSize = useSettingsStore((s) => s.setEditorFontSize);

    return (
        <Box>
            <SectionTitle>Тема</SectionTitle>
            <TextField
                select
                size="small"
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                sx={{ minWidth: 220, mb: 3 }}
            >
                <MenuItem value="dark">Тёмная</MenuItem>
                <MenuItem value="light">Светлая (в разработке)</MenuItem>
            </TextField>

            <SectionTitle>Размер шрифта редактора</SectionTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                    type="number"
                    size="small"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    inputProps={{ min: 10, max: 24 }}
                    sx={{ width: 100 }}
                />
                <Typography sx={{ fontSize: 11, color: '#7a7a7a' }}>
                    Пикселей (10–24)
                </Typography>
            </Box>

            <Box sx={{ mt: 3 }}>
                <SectionTitle>Онбординг</SectionTitle>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                            useTourStore.getState().reset();
                            useTourStore.getState().start(0);
                        }}
                        sx={{ fontSize: 12, textTransform: 'none' }}
                    >
                        Общий тур
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                            useWizardTourStore.getState().resetAll();
                        }}
                        sx={{ fontSize: 12, textTransform: 'none' }}
                    >
                        Сбросить туры визардов
                    </Button>
                </Box>
                <Typography sx={{ fontSize: 11, color: '#7a7a7a', mt: 0.75 }}>
                    Общий тур показывается один раз. Туры визардов запускаются при
                    первом открытии каждого визарда.
                </Typography>
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                       Редактор                                      */
/* ------------------------------------------------------------------ */

function EditorTab() {
    const showMinimap = useSettingsStore((s) => s.showMinimap);
    const setShowMinimap = useSettingsStore((s) => s.setShowMinimap);
    const tabSize = useSettingsStore((s) => s.tabSize);
    const setTabSize = useSettingsStore((s) => s.setTabSize);

    return (
        <Box>
            <SectionTitle>Отображение</SectionTitle>
            <FormGroup>
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={showMinimap}
                            onChange={(e) => setShowMinimap(e.target.checked)}
                        />
                    }
                    label={
                        <Typography sx={{ fontSize: 12 }}>
                            Мини-карта справа
                        </Typography>
                    }
                />
            </FormGroup>

            <SectionTitle>Отступы</SectionTitle>
            <TextField
                select
                size="small"
                value={tabSize}
                onChange={(e) => setTabSize(Number(e.target.value))}
                sx={{ minWidth: 120 }}
            >
                <MenuItem value={2}>2 пробела</MenuItem>
                <MenuItem value={4}>4 пробела</MenuItem>
                <MenuItem value={8}>8 пробелов</MenuItem>
            </TextField>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                       Валидация                                     */
/* ------------------------------------------------------------------ */

function ValidationTab() {
    const warningsEnabled = useSettingsStore((s) => s.warningsEnabled);
    const toggleWarnings = useSettingsStore((s) => s.toggleWarnings);
    const hiddenCategories = useSettingsStore((s) => s.hiddenCategories);
    const toggleCategory = useSettingsStore((s) => s.toggleCategory);
    const zodEnabled = useSettingsStore((s) => s.zodEnabled);
    const setZodEnabled = useSettingsStore((s) => s.setZodEnabled);
    const debounce = useSettingsStore((s) => s.validationDebounce);
    const setDebounce = useSettingsStore((s) => s.setValidationDebounce);

    return (
        <Box>
            <SectionTitle>Структурная валидация (Zod)</SectionTitle>
            <FormGroup sx={{ mb: 3 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={zodEnabled}
                            onChange={(e) => setZodEnabled(e.target.checked)}
                        />
                    }
                    label={
                        <Typography sx={{ fontSize: 12 }}>
                            Проверять обязательные поля и типы
                        </Typography>
                    }
                />
            </FormGroup>

            <SectionTitle>Предупреждения</SectionTitle>
            <FormGroup sx={{ mb: 2 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={warningsEnabled}
                            onChange={toggleWarnings}
                        />
                    }
                    label={
                        <Typography sx={{ fontSize: 12 }}>
                            Показывать предупреждения в редакторе
                        </Typography>
                    }
                />
            </FormGroup>

            {warningsEnabled && (
                <Box sx={{ pl: 4, mb: 3 }}>
                    <Typography
                        sx={{ fontSize: 11, color: '#7a7a7a', mb: 1 }}
                    >
                        Скрытые категории:
                    </Typography>
                    {CATEGORIES.map((c) => (
                        <FormControlLabel
                            key={c.key}
                            control={
                                <Checkbox
                                    size="small"
                                    checked={!hiddenCategories.includes(c.key)}
                                    onChange={() => toggleCategory(c.key)}
                                />
                            }
                            label={
                                <Typography sx={{ fontSize: 12 }}>{c.label}</Typography>
                            }
                        />
                    ))}
                </Box>
            )}

            <SectionTitle>Задержка валидации</SectionTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                    type="number"
                    size="small"
                    value={debounce}
                    onChange={(e) => setDebounce(Number(e.target.value))}
                    inputProps={{ min: 100, max: 2000, step: 50 }}
                    sx={{ width: 120 }}
                />
                <Typography sx={{ fontSize: 11, color: '#7a7a7a' }}>
                    мс (100–2000)
                </Typography>
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                       Файлы                                         */
/* ------------------------------------------------------------------ */

function FilesTab() {
    const autoSave = useSettingsStore((s) => s.autoSaveEnabled);
    const setAutoSave = useSettingsStore((s) => s.setAutoSaveEnabled);
    const interval = useSettingsStore((s) => s.autoSaveInterval);
    const setInterval = useSettingsStore((s) => s.setAutoSaveInterval);
    const defaultFileName = useSettingsStore((s) => s.defaultFileName);
    const setDefaultFileName = useSettingsStore(
        (s) => s.setDefaultFileName
    );

    return (
        <Box>
            <SectionTitle>Автосохранение</SectionTitle>
            <FormGroup>
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={autoSave}
                            onChange={(e) => setAutoSave(e.target.checked)}
                        />
                    }
                    label={
                        <Typography sx={{ fontSize: 12 }}>
                            Сохранять автоматически
                        </Typography>
                    }
                />
            </FormGroup>

            {autoSave && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Typography sx={{ fontSize: 12 }}>Каждые</Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={Math.round(interval / 1000)}
                        onChange={(e) =>
                            setInterval(Number(e.target.value) * 1000)
                        }
                        inputProps={{ min: 10, max: 600 }}
                        sx={{ width: 100 }}
                    />
                    <Typography sx={{ fontSize: 11, color: '#7a7a7a' }}>
                        секунд (10–600)
                    </Typography>
                </Box>
            )}

            <Box sx={{ mt: 3 }}>
                <SectionTitle>Имя файла по умолчанию</SectionTitle>
                <TextField
                    size="small"
                    value={defaultFileName}
                    onChange={(e) => setDefaultFileName(e.target.value)}
                    placeholder="domain.yaml"
                    sx={{ width: 260 }}
                />
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                       Уведомления                                   */
/* ------------------------------------------------------------------ */

function NotificationsTab() {
    const enabled = useSettingsStore((s) => s.notificationsEnabled);
    const setEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
    const duration = useSettingsStore((s) => s.notificationDuration);
    const setDuration = useSettingsStore((s) => s.setNotificationDuration);

    return (
        <Box>
            <SectionTitle>Уведомления</SectionTitle>
            <FormGroup>
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                        />
                    }
                    label={
                        <Typography sx={{ fontSize: 12 }}>
                            Показывать всплывающие уведомления
                        </Typography>
                    }
                />
            </FormGroup>

            {enabled && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <Typography sx={{ fontSize: 12 }}>
                        Длительность показа
                    </Typography>
                    <TextField
                        type="number"
                        size="small"
                        value={Math.round(duration / 1000)}
                        onChange={(e) => setDuration(Number(e.target.value) * 1000)}
                        inputProps={{ min: 1, max: 15 }}
                        sx={{ width: 100 }}
                    />
                    <Typography sx={{ fontSize: 11, color: '#7a7a7a' }}>
                        секунд (1–15)
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                       Вспомогательные                               */
/* ------------------------------------------------------------------ */

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: '#9d9d9d',
                mb: 1,
            }}
        >
            {children}
        </Typography>
    );
}