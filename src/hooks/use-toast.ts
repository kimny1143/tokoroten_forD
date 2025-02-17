import { toast as sonnerToast } from "sonner";

export type ToastType = "default" | "success" | "error" | "loading";

interface ToastOptions {
  type?: ToastType;
  title?: string;
  description?: string;
  duration?: number;
}

export function useToast() {
  const toast = ({ type = "default", title, description, duration = 3000 }: ToastOptions) => {
    const options = {
      duration,
      description,
    };

    switch (type) {
      case "success":
        sonnerToast.success(title, options);
        break;
      case "error":
        sonnerToast.error(title, options);
        break;
      case "loading":
        sonnerToast.loading(title, options);
        break;
      default:
        sonnerToast(title, options);
    }
  };

  return { toast };
} 