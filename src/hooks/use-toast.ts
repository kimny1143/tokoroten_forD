import { toast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number;
}

export const useToast = () => {
  const showToast = ({ title, description, type = 'info', duration }: ToastProps) => {
    const options = {
      description,
      duration
    };

    switch (type) {
      case 'success':
        toast.success(title, options);
        break;
      case 'error':
        toast.error(title, options);
        break;
      case 'warning':
        toast.warning(title, options);
        break;
      case 'loading':
        toast.loading(title, options);
        break;
      default:
        toast(title, options);
    }
  };

  return { toast: showToast };
}; 