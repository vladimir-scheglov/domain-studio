import { useCallback, useEffect } from 'react';
import {
  CssBaseline,
  ThemeProvider,
} from '@mui/material';
import { theme } from './theme';
import { EditorPane } from '@/components/EditorPane';
import { InspectorPanel } from '@/components/InspectorPanel';
import { ProblemsPanel } from '@/components/ProblemsPanel';
import { StatusBar } from '@/components/StatusBar';
import { CommandPalette } from '@/components/CommandPalette';
import { WizardHost } from '@/components/WizardHost';
import { RqlEditorModal } from '@/components/RqlEditorModal';
import { GraphView } from '@/components/GraphView';
import { NotificationHost } from '@/components/NotificationHost';

import { useCommandStore } from '@/store/commandStore';
import { useDocumentStore } from '@/store/documentStore';
import { useWizardStore } from '@/store/wizardStore';
import { useNotificationStore } from '@/store/notificationStore';
import { wizardRegistry } from '@/services/wizardRegistry';
import {
  pickOpenFile,
  pickSaveFile,
  writeToHandle,
  downloadFile,
} from '@/services/fileService';

import '@/wizards';
import { useEditorStore } from '@/store/editorStore';
import { OutlinePanel } from '@/components/OutlinePanel';
import { SnippetPalette } from '@/components/SnippetPalette';
import { useSnippetPaletteStore } from '@/store/snippetPaletteStore';
import { CoveragePanel } from '@/components/CoveragePanel';
import { useCoverageStore } from '@/store/coverageStore';
import { PresetDialog } from '@/components/PresetDialog';
import { usePresetDialogStore } from '@/store/presetDialogStore';
import { HelpDialog } from '@/components/HelpDialog';
import { useHelpStore } from '@/store/helpStore';
import { useHistoryStore } from '@/store/historyStore';
import {
  undoLastAction,
  redoLastAction,
} from '@/services/historyService';
import { SettingsDialog } from '@/components/SettingsDialog';
import { useSettingsDialogStore } from '@/store/settingsDialogStore';
import { useSettingsStore } from '@/store/settingsStore';
import { MixinPriorityPanel } from '@/components/MixinPriorityPanel';
import { useMixinPriorityStore } from '@/store/mixinPriorityStore';
import { MixinDiffDialog } from '@/components/MixinDiffDialog';
import { MixinLibraryDialog } from '@/components/MixinLibraryDialog';
import { useMixinLibraryStore } from '@/store/mixinLibraryStore';
import { AppToolbar } from '@/components/AppToolbar';
import { compareWithFile } from '@/services/diffService';
import { DiffDialog } from '@/components/DiffDialog';
import { TourOverlay } from '@/components/TourOverlay';
import { useTourStore } from '@/store/tourStore';
import { useViewStore } from '@/store/viewStore';
import { WizardTourOverlay } from '@/components/WizardTourOverlay';

export function App() {
  const togglePalette = useCommandStore((s) => s.toggle);
  const registerMany = useCommandStore((s) => s.registerMany);
  const openWizard = useWizardStore((s) => s.open);
  const notify = useNotificationStore((s) => s.notify);

  const yaml = useDocumentStore((s) => s.yaml);
  const fileName = useDocumentStore((s) => s.fileName);
  const fileHandle = useDocumentStore((s) => s.fileHandle);
  const loadFromString = useDocumentStore((s) => s.loadFromString);
  const setFileName = useDocumentStore((s) => s.setFileName);
  const setFileHandle = useDocumentStore((s) => s.setFileHandle);
  const markSaved = useDocumentStore((s) => s.markSaved);
  const setOnBeforeReveal = useEditorStore((s) => s.setOnBeforeReveal);
  const toggleSnippets = useSnippetPaletteStore((s) => s.toggle);
  const toggleCoverage = useCoverageStore((s) => s.toggle);
  const togglePresets = usePresetDialogStore((s) => s.toggle);
  const toggleHelp = useHelpStore((s) => s.toggle);
  const toggleSettings = useSettingsDialogStore((s) => s.toggle);
  const autoSaveEnabled = useSettingsStore((s) => s.autoSaveEnabled);
  const autoSaveInterval = useSettingsStore((s) => s.autoSaveInterval);
  const toggleMixinPriority = useMixinPriorityStore((s) => s.toggle);
  const toggleMixinLibrary = useMixinLibraryStore((s) => s.toggle);
  const viewMode = useViewStore((s) => s.viewMode);
  const setViewMode = useViewStore((s) => s.setViewMode);
  const hydrated = useTourStore((s) => s.hydrated);
  const completed = useTourStore((s) => s.completed);

  const handleCopyYaml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      notify('YAML скопирован в буфер обмена', 'success');
    } catch (e) {
      notify(`Ошибка копирования: ${String(e)}`, 'error', 5000);
    }
  }, [yaml, notify]);

  useEffect(() => {
    setOnBeforeReveal(() => useViewStore.getState().setViewMode('editor'));
    return () => setOnBeforeReveal(null);
  }, [setOnBeforeReveal]);

  useEffect(() => {
    useHistoryStore.getState().clear();
  }, [fileName]);

  useEffect(() => {
    if (!hydrated) return;
    if (completed) return;

    const t = setTimeout(() => {
      useTourStore.getState().start(0);
    }, 600);
    return () => clearTimeout(t);
  }, [hydrated, completed]);


  /* ---------------- Команды палитры ---------------- */
  useEffect(() => {
    const wizardCommands = wizardRegistry.list().map((w) => ({
      id: `wizard:${w.id}`,
      title: w.title,
      description: w.description,
      group: 'Визарды',
      keywords: ['wizard', 'визард', w.category],
      run: () => openWizard(w.id),
    }));

    const fileCommands = [
      {
        id: 'file.open',
        title: 'Открыть YAML…',
        description: 'Открыть схему домена с диска',
        group: 'Файл',
        keywords: ['open', 'file', 'открыть'],
        keybindingLabel: '⌘O / Ctrl+O',
        run: () => {
          void handleOpen();
        },
      },
      {
        id: 'file.save',
        title: 'Сохранить',
        description: 'Сохранить текущую схему',
        group: 'Файл',
        keywords: ['save', 'сохранить'],
        keybindingLabel: '⌘S / Ctrl+S',
        run: () => {
          void handleSave();
        },
      },
      {
        id: 'file.saveAs',
        title: 'Сохранить как…',
        description: 'Сохранить схему под другим именем',
        group: 'Файл',
        keywords: ['save as', 'сохранить как'],
        run: () => {
          void handleSaveAs();
        },
      },
      {
        id: 'file.copy',
        title: 'Скопировать YAML',
        description: 'Скопировать содержимое схемы в буфер обмена',
        group: 'Файл',
        keywords: ['copy', 'копировать', 'clipboard'],
        keybindingLabel: '⌘⇧C / Ctrl+Shift+C',
        run: () => {
          void handleCopyYaml();
        },
      },
      {
        id: 'view.coverage',
        title: 'Карта покрытия схемы',
        description: 'Показать непокрытые сущности и связи',
        group: 'Анализ',
        keywords: ['coverage', 'покрытие', 'анализ', 'схема'],
        keybindingLabel: '⌘⇧U / Ctrl+Shift+U',
        run: () => {
          toggleCoverage();
        },
      },
      {
        id: 'file.presets',
        title: 'Пресеты схем',
        description: 'Сохранить текущую схему или загрузить готовый шаблон',
        group: 'Файл',
        keywords: ['preset', 'пресет', 'шаблон', 'template'],
        keybindingLabel: '⌘⇧T / Ctrl+Shift+T',
        run: () => {
          togglePresets();
        },
      },
      {
        id: 'edit.formatSoft',
        title: 'Форматировать документ',
        description: 'Отступы и пробелы (без сортировки ключей)',
        group: 'Редактор',
        keywords: ['format', 'формат', 'отступы'],
        keybindingLabel: 'Shift+Alt+F',
        run: () => {
          window.dispatchEvent(new CustomEvent('domain-studio:format', { detail: 'soft' }));
        },
      },
      {
        id: 'edit.formatStrict',
        title: 'Форматировать и упорядочить ключи',
        description: 'Отступы + стандартный порядок полей',
        group: 'Редактор',
        keywords: ['format', 'формат', 'sort', 'порядок', 'упорядочить'],
        keybindingLabel: 'Ctrl+Shift+Alt+F',
        run: () => {
          window.dispatchEvent(new CustomEvent('domain-studio:format', { detail: 'strict' }));
        },
      },
      {
        id: 'view.help',
        title: 'Горячие клавиши',
        description: 'Справка по хоткеям',
        group: 'Справка',
        keywords: ['help', 'справка', 'hotkeys', 'хоткеи', 'клавиши'],
        keybindingLabel: '⌘/ / Ctrl+/',
        run: () => {
          toggleHelp();
        },
      },
      {
        id: 'edit.undo',
        title: 'Отменить последнее действие',
        description: 'Откатывает последний применённый патч',
        group: 'Редактор',
        keywords: ['undo', 'отмена', 'откат'],
        keybindingLabel: '⌘Z / Ctrl+Z',
        run: () => undoLastAction(),
      },
      {
        id: 'edit.redo',
        title: 'Повторить отменённое действие',
        description: 'Возвращает отменённый патч',
        group: 'Редактор',
        keywords: ['redo', 'повтор'],
        keybindingLabel: '⌘⇧Z / Ctrl+Shift+Z',
        run: () => redoLastAction(),
      },
      {
        id: 'diff.withFile',
        title: 'Сравнить с файлом…',
        description: 'Сравнить текущий документ с YAML-файлом на диске',
        group: 'Сравнение',
        keywords: ['diff', 'сравнить', 'compare'],
        run: () => {
          void compareWithFile();
        },
      },
      {
        id: 'view.tour',
        title: 'Запустить обзорный тур',
        description: 'Провести по интерфейсу ещё раз',
        group: 'Справка',
        keywords: ['tour', 'тур', 'обучение', 'onboarding'],
        run: () => {
          useTourStore.getState().reset();
          useTourStore.getState().start(0);
        },
      },
    ];

    registerMany([...wizardCommands, ...fileCommands]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerMany, openWizard]);
  /* ---------------- Обработчики файлов ---------------- */

  const handleOpen = useCallback(async () => {
    try {
      const opened = await pickOpenFile();
      if (!opened) return;
      loadFromString(opened.content, opened.fileName);
      setFileHandle(opened.handle);
      notify(`Открыт файл: ${opened.fileName}`, 'success');
    } catch (e) {
      notify(`Не удалось открыть файл: ${String(e)}`, 'error', 5000);
    }
  }, [loadFromString, setFileHandle, notify]);


  const handleSaveAs = useCallback(async () => {
    const suggested = fileName ?? 'domain.yaml';
    try {
      const picked = await pickSaveFile(suggested);
      if (picked) {
        await writeToHandle(picked.handle, yaml);
        setFileName(picked.fileName);
        setFileHandle(picked.handle);
        markSaved();
        notify(`Сохранено: ${picked.fileName}`, 'success');
      } else {
        // fallback — скачивание
        downloadFile(yaml, suggested);
        setFileName(suggested);
        markSaved();
        notify(`Скачано: ${suggested}`, 'info');
      }
    } catch (e) {
      notify(`Ошибка сохранения: ${String(e)}`, 'error', 5000);
    }
  }, [fileName, yaml, setFileName, setFileHandle, markSaved, notify]);

  const handleSave = useCallback(async () => {
    // если есть хэндл — пишем в него
    if (fileHandle) {
      try {
        await writeToHandle(fileHandle, yaml);
        markSaved();
        notify('Файл сохранён', 'success');
      } catch (e) {
        notify(`Ошибка сохранения: ${String(e)}`, 'error', 5000);
      }
      return;
    }
    // хэндла нет — сохраняем как
    await handleSaveAs();
  }, [fileHandle, handleSaveAs, yaml, markSaved, notify]);

  /* ---------------- Хоткеи ---------------- */

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // палитра команд
      const isPalette = mod && !e.shiftKey && e.key.toLowerCase() === 'k';
      const isPalette2 = mod && e.shiftKey && e.key.toLowerCase() === 'p';
      if (isPalette || isPalette2) {
        e.preventDefault();
        togglePalette();
        return;
      }

      // открыть
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        void handleOpen();
        return;
      }

      // сохранить
      if (mod && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
        return;
      }

      // сохранить как
      if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveAs();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        void handleCopyYaml();
        return;
      }

      // палитра сниппетов
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleSnippets();
        return;
      }

      // карта покрытия
      if (mod && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        toggleCoverage();
        return;
      }

      // пресеты
      if (mod && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        togglePresets();
        return;
      }

      // справка (Ctrl+/ / Cmd+/)
      if (mod && e.shiftKey && e.key === '/') {
        e.preventDefault();
        toggleHelp();
        return;
      }

      if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        // если фокус НЕ в Monaco — откатываем наш патч
        const target = e.target as HTMLElement;
        const inEditor = target?.closest?.('.monaco-editor');
        if (!inEditor) {
          e.preventDefault();
          undoLastAction();
          return;
        }
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'z') {
        const target = e.target as HTMLElement;
        const inEditor = target?.closest?.('.monaco-editor');
        if (!inEditor) {
          e.preventDefault();
          redoLastAction();
          return;
        }
      }

      // Настройки (Ctrl+, / Cmd+,)
      if (mod && e.key === ',') {
        e.preventDefault();
        toggleSettings();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMixinPriority();
        return;
      }

      // Библиотека миксинов
      if (mod && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggleMixinLibrary();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        void compareWithFile();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        useTourStore.getState().reset();
        useTourStore.getState().start(0);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePalette, handleOpen, handleSave, handleSaveAs, handleCopyYaml, toggleSnippets, toggleCoverage, togglePresets, toggleHelp, toggleSettings, toggleMixinPriority, toggleMixinLibrary]);

  /* ---------------- Событие из редактора ---------------- */

  useEffect(() => {
    const handler = () => {
      void handleSave();
    };
    window.addEventListener('domain-studio:save', handler);
    return () => window.removeEventListener('domain-studio:save', handler);
  }, [handleSave]);

  useEffect(() => {
    const handler = () => {
      void handleCopyYaml();
    };
    window.addEventListener('domain-studio:copy', handler);
    return () => window.removeEventListener('domain-studio:copy', handler);
  }, [handleCopyYaml]);

  useEffect(() => {
    if (!autoSaveEnabled) return;
    if (!fileHandle) return; // сохраняем только в существующий файл

    const timer = setInterval(() => {
      if (!useDocumentStore.getState().dirty) return;
      void handleSave();
    }, autoSaveInterval);

    return () => clearInterval(timer);
  }, [autoSaveEnabled, autoSaveInterval, fileHandle, handleSave]);

  /* ---------------- Render ---------------- */

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="flex h-screen w-screen flex-col bg-[#1e1e1e] text-editor-fg">
        <AppToolbar
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpen={handleOpen}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onCopyYaml={handleCopyYaml}
          onFormat={(mode) => {
            window.dispatchEvent(
              new CustomEvent('domain-studio:format', { detail: mode })
            );
          }}
        />
        <main className="flex min-h-0 flex-1">
          <OutlinePanel />
          {viewMode === 'editor' ? <EditorPane /> : <GraphView />}
          <InspectorPanel />
        </main>
        
        <StatusBar />
        <ProblemsPanel />
      </div>

      <CommandPalette />
      <WizardHost />
      <WizardTourOverlay />
      <RqlEditorModal />
      <NotificationHost />
      <SnippetPalette />
      <CoveragePanel />
      <PresetDialog />
      <HelpDialog />
      <SettingsDialog />
      <MixinPriorityPanel />
      <MixinDiffDialog />
      <MixinLibraryDialog />
      <DiffDialog />
      <TourOverlay />
    </ThemeProvider>
  );
}