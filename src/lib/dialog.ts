type DialogType = "alert" | "confirm";

export interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success" | "info";
}

export type DialogResolver = (value: boolean) => void;

class DialogService {
  private listener: ((type: DialogType, options: DialogOptions, resolve: DialogResolver) => void) | null = null;

  setListener(listener: (type: DialogType, options: DialogOptions, resolve: DialogResolver) => void) {
    this.listener = listener;
  }

  removeListener() {
    this.listener = null;
  }

  alert(message: string, options: Omit<DialogOptions, "message"> = {}): Promise<void> {
    return new Promise((resolve) => {
      if (this.listener) {
        this.listener(
          "alert",
          {
            title: options.title || "Notification",
            message,
            confirmText: options.confirmText || "OK",
            variant: options.variant || "info"
          },
          () => resolve()
        );
      } else {
        // Fallback for environment before component mounting
        alert(message);
        resolve();
      }
    });
  }

  confirm(message: string, options: Omit<DialogOptions, "message"> = {}): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.listener) {
        this.listener(
          "confirm",
          {
            title: options.title || "Confirmation Required",
            message,
            confirmText: options.confirmText || "Confirm",
            cancelText: options.cancelText || "Cancel",
            variant: options.variant || "warning"
          },
          resolve
        );
      } else {
        // Fallback for environment before component mounting
        const result = confirm(message);
        resolve(result);
      }
    });
  }
}

export const dialogService = new DialogService();
