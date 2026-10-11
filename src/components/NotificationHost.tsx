import { Alert, Snackbar, Stack } from '@mui/material';
import { useNotificationStore } from '@/store/notificationStore';

export function NotificationHost() {
    const notifications = useNotificationStore((s) => s.notifications);
    const dismiss = useNotificationStore((s) => s.dismiss);

    return (
        <Stack
            spacing={1}
            sx={{
                position: 'fixed',
                bottom: 32,
                right: 16,
                zIndex: 2000,
                pointerEvents: 'none',
            }}
        >
            {notifications.map((n) => (
                <Snackbar
                    key={n.id}
                    open
                    autoHideDuration={n.duration}
                    onClose={() => dismiss(n.id)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    sx={{
                        position: 'static',
                        transform: 'none',
                        pointerEvents: 'auto',
                        '& .MuiSnackbar-root': { position: 'static' },
                    }}
                >
                    <Alert
                        onClose={() => dismiss(n.id)}
                        severity={n.severity}
                        variant="filled"
                        sx={{ fontSize: 12, minWidth: 260 }}
                    >
                        {n.message}
                    </Alert>
                </Snackbar>
            ))}
        </Stack>
    );
}