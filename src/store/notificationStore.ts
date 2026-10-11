import { create } from "zustand";
import { useSettingsStore } from "./settingsStore";

export type NotificationSeverity = "success" | "info" | "warning" | "error";

export type AppNotification = {
  id: string;
  message: string;
  severity: NotificationSeverity;
  duration: number;
};

type NotificationState = {
  notifications: AppNotification[];
  notify: (
    message: string,
    severity?: NotificationSeverity,
    durationMs?: number,
  ) => void;
  dismiss: (id: string) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  notify: (message, severity = "info", durationMs = 3000) => {
    const settings = useSettingsStore.getState();
    if (!settings.notificationsEnabled) return;

    const finalDuration = durationMs ?? settings.notificationDuration;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({
      notifications: [
        ...s.notifications,
        { id, message, severity, duration: finalDuration },
      ],
    }));
    if (finalDuration > 0) {
      setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        }));
      }, finalDuration);
    }
  },

  dismiss: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
}));
