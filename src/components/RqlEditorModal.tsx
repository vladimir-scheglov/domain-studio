import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type * as monaco from 'monaco-editor';
import { Box, Button, Dialog, Typography } from '@mui/material';
import { useRqlEditorStore } from '@/store/rqlEditorStore';
import { registerRqlLanguage } from '@/editor/rqlMonarch';

export function RqlEditorModal() {
    const request = useRqlEditorStore((s) => s.request);
    const close = useRqlEditorStore((s) => s.close);

    const [value, setValue] = useState('');
    const disposablesRef = useRef<monaco.IDisposable[]>([]);

    useEffect(() => {
        if (request) setValue(request.value);
    }, [request]);

    const onMount: OnMount = useCallback((editor, monacoApi) => {
        disposablesRef.current.push(...registerRqlLanguage(monacoApi));
        editor.focus();
    }, []);

    useEffect(() => {
        return () => {
            disposablesRef.current.forEach((d) => d.dispose());
            disposablesRef.current = [];
        };
    }, []);

    const apply = () => {
        if (request) {
            request.onApply(value);
        }
        close();
    };

    return (
        <Dialog
            open={Boolean(request)}
            onClose={close}
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
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {request?.title ?? 'RQL-редактор'}
                    </Typography>
                    {request?.help && (
                        <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                            {request.help}
                        </Typography>
                    )}
                </Box>

                <Box
                    sx={{
                        border: '1px solid #3c3c3c',
                        borderRadius: 1,
                        overflow: 'hidden',
                        height: 360,
                    }}
                >
                    <Editor
                        height="100%"
                        defaultLanguage="rql"
                        theme="rql-dark"
                        value={value}
                        onChange={(v) => setValue(v ?? '')}
                        onMount={onMount}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', monospace",
                            lineNumbers: 'on',
                            wordWrap: 'on',
                            tabSize: 2,
                            insertSpaces: true,
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                            quickSuggestions: { other: true, comments: false, strings: false },
                            suggestOnTriggerCharacters: true,
                            padding: { top: 8, bottom: 8 },
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={close}>Отмена</Button>
                    <Button onClick={apply} variant="contained">
                        Применить
                    </Button>
                </Box>
            </Box>
        </Dialog>
    );
}