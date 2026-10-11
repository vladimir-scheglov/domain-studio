import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useNotificationStore } from '@/store/notificationStore';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as monaco from 'monaco-editor';

import { useDocumentStore } from '@/store/documentStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useValidationStore } from '@/store/validationStore';

import { parseYaml } from '@/services/yamlService';
import { debounce } from '@/utils/debounce';

import {
    registerCompletionProvider,
    registerEmmetTabCommand,
} from '@/editor/completion';
import { registerHoverProvider } from '@/editor/hover';
import { registerDiagnostics } from '@/editor/diagnostics';
import { setupMonacoYaml } from '@/editor/monacoSetup';
import { pathByOffset } from '@/domain/pathByOffset';

import './EditorPane.css';
import { useEditorStore } from '@/store/editorStore';
import { useCommandStore } from '@/store/commandStore';
import { useSnippetPaletteStore } from '@/store/snippetPaletteStore';
import { registerCodeActionProvider } from '@/editor/codeActions';
import { formatYaml, hasComments } from '@/domain/formatter';
import { useHelpStore } from '@/store/helpStore';
import { BUILTIN_SNIPPETS } from '@/editor/snippets.builtin';
import { useSnippetStore } from '@/store/snippetStore';
import { useSettingsStore } from '@/store/settingsStore';

const PARSE_DEBOUNCE_MS = 150;

export function EditorPane() {
    const yaml = useDocumentStore((s) => s.yaml);
    const setYaml = useDocumentStore((s) => s.setYaml);
    const setCursorPath = useSelectionStore((s) => s.setCursorPath);
    const setDiagnostics = useValidationStore((s) => s.setDiagnostics);
    const setCursor = useSelectionStore((s) => s.setCursor);
    const [isDragging, setIsDragging] = useState(false);
    const notify = useNotificationStore((s) => s.notify);
    const loadFromString = useDocumentStore((s) => s.loadFromString);
    const setFileHandle = useDocumentStore((s) => s.setFileHandle);
    const setActiveEntity = useSelectionStore((s) => s.setActiveEntity);
    const setActiveLinkage = useSelectionStore((s) => s.setActiveLinkage);

    const disposablesRef = useRef<monaco.IDisposable[]>([]);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    const editorFontSize = useSettingsStore((s) => s.editorFontSize);
    const showMinimap = useSettingsStore((s) => s.showMinimap);
    const tabSize = useSettingsStore((s) => s.tabSize);

    const debouncedParse = useMemo(
        () =>
            debounce((text: string) => {
                const result = parseYaml(text);
                setYaml(text, result.parsed, result.doc);
            }, PARSE_DEBOUNCE_MS),
        [setYaml]
    );

    useEffect(() => {
        return () => {
            debouncedParse.cancel();
        };
    }, [debouncedParse]);

    const handleChange = useCallback(
        (value: string | undefined) => {
            debouncedParse(value ?? '');
        },
        [debouncedParse]
    );

    const formatEditor = useCallback(
        (mode: 'soft' | 'strict') => {
            const editor = editorRef.current;
            if (!editor) return;
            const model = editor.getModel();
            if (!model) return;

            const current = model.getValue();
            const commentsBefore = hasComments(current);
            const formatted = formatYaml(current, mode);

            if (formatted === current) {
                notify('Документ уже отформатирован', 'info', 2000);
                return;
            }

            const position = editor.getPosition();

            editor.executeEdits('format-document', [
                {
                    range: model.getFullModelRange(),
                    text: formatted,
                    forceMoveMarkers: true,
                },
            ]);

            if (position) {
                const lineCount = model.getLineCount();
                const lineNumber = Math.min(position.lineNumber, lineCount);
                const lineContent = model.getLineContent(lineNumber);
                const column = Math.min(position.column, lineContent.length + 1);
                editor.setPosition({ lineNumber, column });
            }

            const commentNote = commentsBefore ? ' (комментарии сохранены)' : '';
            notify(
                mode === 'strict'
                    ? `Документ отформатирован и упорядочен${commentNote}`
                    : `Документ отформатирован${commentNote}`,
                'success',
                2000
            );
        },
        [notify]
    );
    const tryExpandAtCursor = (editor: monaco.editor.IStandaloneCodeEditor) => {
        const model = editor.getModel();
        if (!model) return;
        const position = editor.getPosition();
        if (!position) return;

        const word = model.getWordUntilPosition(position);
        if (!word.word) return;

        const snippets = [
            ...useSnippetStore.getState().userSnippets,
            ...BUILTIN_SNIPPETS,
        ];
        const match = snippets.find((s) => s.prefix === word.word);
        if (!match) return;

        const range = new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
        );

        editor.executeEdits('emmet-expand', [
            { range, text: match.body, forceMoveMarkers: true },
        ]);
    };
    
    const handleMount: OnMount = useCallback(
        (editor, monacoApi) => {
            editorRef.current = editor;
            const setEditor = useEditorStore.getState().setEditor;
            setEditor(editor);
            
            disposablesRef.current.push(setupMonacoYaml(monacoApi));
            disposablesRef.current.push(registerCompletionProvider(monacoApi));
            registerEmmetTabCommand(editor, monacoApi);
            disposablesRef.current.push(registerHoverProvider(monacoApi));

            disposablesRef.current.push(
                registerDiagnostics(monacoApi, editor, setDiagnostics)
            );

            disposablesRef.current.push(registerCodeActionProvider(monacoApi));

            const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
                const model = editor.getModel();
                if (!model) return;
                const offset = model.getOffsetAt(e.position);
                const doc = useDocumentStore.getState().doc;
                const path = doc ? pathByOffset(doc, offset) : [];
                setCursorPath(path);
                setCursor(e.position.lineNumber, e.position.column);

                // синхронизация с диаграммой
                const root = path[0];
                const second = path[1];
                if (root === 'entities' && typeof second === 'string') {
                    setActiveEntity(second);
                } else if (root === 'linkages' && typeof second === 'string') {
                    setActiveLinkage(second);
                } else {
                    setActiveEntity(null);
                    setActiveLinkage(null);
                }
            });
            disposablesRef.current.push({ dispose: () => cursorDisposable.dispose() });

            // Основной вариант: Alt+Tab (⌥Tab на Mac)
            editor.addCommand(
                monacoApi.KeyMod.Alt | monacoApi.KeyCode.Tab,
                () => {
                    editor.trigger('keyboard', 'editor.action.insertSnippet', {});
                    // или напрямую наш tryExpandEmmet
                    tryExpandAtCursor(editor);
                }
            );

            // Альтернатива: Ctrl+Space
            editor.addCommand(
                monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Space,
                () => {
                    tryExpandAtCursor(editor);
                }
            );

            // Альтернатива: Ctrl+Enter
            editor.addCommand(
                monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Enter,
                () => {
                    tryExpandAtCursor(editor);
                }
            );

            editor.addCommand(
                monacoApi.KeyMod.CtrlCmd | monacoApi.KeyMod.Shift | monacoApi.KeyCode.Slash,
                () => {
                    useHelpStore.getState().toggle();
                }
            );
            
            // Альтернативный хоткей для подсказок (macOS-friendly)
            editor.addCommand(
                monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyI,
                () => {
                    editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
                }
            );

            editor.addCommand(
                monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyK,
                () => {
                    useCommandStore.getState().toggle();
                }
            );

            editor.addCommand(
                monacoApi.KeyMod.CtrlCmd | monacoApi.KeyMod.Shift | monacoApi.KeyCode.KeyC,
                () => {
                    window.dispatchEvent(new CustomEvent('domain-studio:copy'));
                }
            );

            editor.addCommand(
                monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyJ,
                () => {
                    useSnippetPaletteStore.getState().toggle();
                }
            );

            editor.addCommand(
                monacoApi.KeyMod.Shift | monacoApi.KeyMod.Alt | monacoApi.KeyCode.KeyF,
                () => {
                    formatEditor('soft');
                }
            );

            editor.addCommand(
                monacoApi.KeyMod.CtrlCmd |
                monacoApi.KeyMod.Shift |
                monacoApi.KeyMod.Alt |
                monacoApi.KeyCode.KeyF,
                () => {
                    formatEditor('strict');
                }
            );
        },
        [setDiagnostics, setCursorPath, setCursor, setActiveEntity, setActiveLinkage, formatEditor]
    );

    useEffect(() => {
        return () => {
            useEditorStore.getState().setEditor(null);
            disposablesRef.current.forEach((d) => d.dispose());
            disposablesRef.current = [];
        };
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // проверяем, что тащат именно файл
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // уходим только если курсор вышел за пределы контейнера
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const file = e.dataTransfer.files?.[0];
            if (!file) return;

            if (!file.name.match(/\.ya?ml$/i)) {
                notify('Можно перетащить только .yaml или .yml', 'warning', 4000);
                return;
            }

            try {
                const text = await file.text();
                loadFromString(text, file.name);
                setFileHandle(null);
                notify(`Открыт файл: ${file.name}`, 'success');
            } catch (err) {
                notify(`Ошибка чтения: ${String(err)}`, 'error', 5000);
            }
        },
        [notify, loadFromString, setFileHandle]
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as 'soft' | 'strict';
            formatEditor(detail);
        };
        window.addEventListener('domain-studio:format', handler);
        return () => window.removeEventListener('domain-studio:format', handler);
    }, [formatEditor]);

    return (
        <div
            data-tour="editor"
            className="editor-pane"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <Editor
                height="100%"
                width="100%"
                defaultLanguage="yaml"
                theme="domain-dark"
                value={yaml}
                onChange={handleChange}
                onMount={handleMount}
                options={{
                    autoIndent: 'brackets',
                    fontSize: editorFontSize,
                    minimap: { enabled: showMinimap },
                    tabSize: tabSize,
                    fontFamily: "'JetBrains Mono', 'Menlo', 'Consolas', monospace",
                    lineHeight: 20,
                    wordWrap: 'on',
                    insertSpaces: true,
                    detectIndentation: false,
                    lineNumbers: 'on',
                    glyphMargin: true,
                    folding: true,
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    guides: { indentation: true, bracketPairs: true },
                    quickSuggestions: { other: true, comments: false, strings: true },
                    suggestOnTriggerCharacters: true,
                    tabCompletion: 'on',
                    wordBasedSuggestions: 'off',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    contextmenu: true,
                    mouseWheelZoom: true,
                    padding: { top: 12, bottom: 12 },
                    fixedOverflowWidgets: true,
                    acceptSuggestionOnEnter: 'on',
                }}
                loading={<div className="editor-pane__loading">Загрузка редактора…</div>}
            />

            {isDragging && <DropOverlay />}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*                    Overlay при перетаскивании                       */
/* ------------------------------------------------------------------ */

function DropOverlay() {
    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(14, 99, 156, 0.15)',
                border: '2px dashed #4fc1ff',
                pointerEvents: 'none',
                backdropFilter: 'blur(2px)',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 4,
                    py: 3,
                    bgcolor: 'rgba(37, 37, 38, 0.95)',
                    border: '1px solid #4fc1ff',
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <CloudUploadIcon sx={{ fontSize: 40, color: '#4fc1ff' }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#d4d4d4' }}>
                    Отпустите, чтобы открыть
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#9d9d9d' }}>
                    Поддерживаются файлы .yaml и .yml
                </Typography>
            </Box>
        </Box>
    );
}