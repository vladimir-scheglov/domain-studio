import { Box, Typography } from '@mui/material';
import { useSelectionStore } from '@/store/selectionStore';
import { useDocumentStore } from '@/store/documentStore';
import { useValidationStore } from '@/store/validationStore';
import { useSettingsStore, type WarningCategory } from '@/store/settingsStore';
import { Menu, MenuItem, IconButton, Tooltip, Divider } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState } from 'react';

export function StatusBar() {
  const cursorLine = useSelectionStore((s) => s.cursorLine);
  const cursorColumn = useSelectionStore((s) => s.cursorColumn);

  const fileName = useDocumentStore((s) => s.fileName);
  const dirty = useDocumentStore((s) => s.dirty);

  const diagnostics = useValidationStore((s) => s.diagnostics);
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;

  const warningsEnabled = useSettingsStore((s) => s.warningsEnabled);
  const hiddenCategories = useSettingsStore((s) => s.hiddenCategories);
  const toggleWarnings = useSettingsStore((s) => s.toggleWarnings);
  const toggleCategory = useSettingsStore((s) => s.toggleCategory);

  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const CATEGORIES: Array<{ key: WarningCategory; label: string }> = [
    { key: 'unknown_property', label: 'Неизвестные свойства' },
    { key: 'broken_ref', label: 'Битые ссылки' },
    { key: 'semver', label: 'SemVer' },
    { key: 'duplicate_id', label: 'Дубликаты id' },
    { key: 'other', label: 'Прочее' },
  ];

  return (
    <Box
      data-tour="statusbar"
      sx={{
        height: 26,
        flex: '0 0 26px',
        display: 'flex',
        alignItems: 'center',
        px: 1.5,
        gap: 2,
        borderTop: '1px solid #3c3c3c',
        bgcolor: '#0e639c',
        color: '#fff',
        fontSize: 11,
        userSelect: 'none',
      }}
    >
      {/* Слева: имя файла + индикатор грязности */}
      <Typography variant="caption" sx={{ fontSize: 11 }}>
        {fileName ?? 'Черновик'}
        {dirty ? ' •' : ''}
      </Typography>

      {/* Ошибки/предупреждения */}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Typography variant="caption" sx={{ fontSize: 11 }}>
          ⚠ {warnings}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 11 }}>
          ✕ {errors}
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* Позиция курсора */}
      <Typography variant="caption" sx={{ fontSize: 11 }}>
        Стр. {cursorLine}, Кол. {cursorColumn}
      </Typography>

      <Tooltip title="Настройки предупреждений" arrow>
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ color: warningsEnabled ? '#dcdcaa' : '#7a7a7a', width: 22, height: 22 }}
        >
          <WarningAmberIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: '#252526',
            backgroundImage: 'none',
            border: '1px solid #3c3c3c',
            minWidth: 240,
          },
        }}
      >
        <MenuItem
          onClick={(e) => {
            e.preventDefault();
            toggleWarnings();
          }}
          sx={{ fontSize: 12, py: 0.75 }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: 14,
              height: 14,
              mr: 1.5,
              border: '1px solid #7a7a7a',
              borderRadius: 0.5,
              bgcolor: warningsEnabled ? '#dcdcaa' : 'transparent',
              position: 'relative',
              '&::after': warningsEnabled
                ? {
                  content: '""',
                  position: 'absolute',
                  left: 3,
                  top: 0,
                  width: 5,
                  height: 9,
                  borderRight: '2px solid #1e1e1e',
                  borderBottom: '2px solid #1e1e1e',
                  transform: 'rotate(45deg)',
                }
                : {},
            }}
          />
          Показывать предупреждения
        </MenuItem>

        <Divider sx={{ my: 0.5, borderColor: '#3c3c3c' }} />

        {CATEGORIES.map((c) => {
          const hidden = hiddenCategories.includes(c.key);
          return (
            <MenuItem
              key={c.key}
              onClick={() => toggleCategory(c.key)}
              sx={{
                fontSize: 12,
                py: 0.75,
                pl: 3,
                opacity: hidden ? 0.5 : 1,
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  mr: 1.5,
                  border: '1px solid #7a7a7a',
                  borderRadius: 0.25,
                  bgcolor: hidden ? 'transparent' : '#dcdcaa',
                  position: 'relative',
                  '&::after': !hidden
                    ? {
                      content: '""',
                      position: 'absolute',
                      left: 2,
                      top: 0,
                      width: 4,
                      height: 8,
                      borderRight: '1.5px solid #1e1e1e',
                      borderBottom: '1.5px solid #1e1e1e',
                      transform: 'rotate(45deg)',
                    }
                    : {},
                }}
              />
              {c.label}
            </MenuItem>
          );
        })}
      </Menu>

      {/* Подсказка по хоткеям */}
      <Typography
        variant="caption"
        sx={{ fontSize: 10, opacity: 0.75 }}
      >
        Ctrl+Space / ⌘I — подсказки · Ctrl+K — палитра
      </Typography>

      {/* Язык */}
      <Typography variant="caption" sx={{ fontSize: 11 }}>
        YAML
      </Typography>
    </Box>
  );
}