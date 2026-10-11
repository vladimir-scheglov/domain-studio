import { Box } from '@mui/material';
import { EditorPane } from './EditorPane';
import { InspectorPanel } from './InspectorPanel';
import { ProblemsPanel } from './ProblemsPanel';
import { StatusBar } from './StatusBar';

export function MainLayout() {
    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <Box sx={{ flex: 1, minWidth: 0, borderRight: '1px solid', borderColor: 'divider' }}>
                    <EditorPane />
                </Box>
                <InspectorPanel />
            </Box>

            <Box
                sx={{
                    height: 160,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <ProblemsPanel />
            </Box>

            <StatusBar />
        </Box>
    );
}