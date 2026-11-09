import type { AudioLifecycleHandlers, AudioLifecycleSource } from "./engine";

export class BrowserAudioLifecycleSource implements AudioLifecycleSource {
    subscribe(handlers: AudioLifecycleHandlers): () => void {
        if (typeof document === "undefined") return () => undefined;
        const onVisibilityChange = () =>
            handlers.onVisibilityChange(
                document.visibilityState === "hidden" ? "hidden" : "visible",
            );
        const mediaDevices = navigator.mediaDevices;
        const onDeviceChange = () => handlers.onDeviceChange();
        document.addEventListener("visibilitychange", onVisibilityChange);
        onVisibilityChange();
        mediaDevices?.addEventListener("devicechange", onDeviceChange);

        let permissionStatus: PermissionStatus | null = null;
        let permissionHandler: (() => void) | null = null;
        let disposed = false;
        if (navigator.permissions?.query) {
            void navigator.permissions
                .query({ name: "microphone" as PermissionName })
                .then((status) => {
                    if (disposed) return;
                    permissionStatus = status;
                    permissionHandler = () =>
                        handlers.onPermissionChange(status.state);
                    status.addEventListener("change", permissionHandler);
                    handlers.onPermissionChange(status.state);
                })
                .catch(() => undefined);
        }

        return () => {
            disposed = true;
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
            mediaDevices?.removeEventListener("devicechange", onDeviceChange);
            if (permissionStatus && permissionHandler)
                permissionStatus.removeEventListener(
                    "change",
                    permissionHandler,
                );
        };
    }
}
