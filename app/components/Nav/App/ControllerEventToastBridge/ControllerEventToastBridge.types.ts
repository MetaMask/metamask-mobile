import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';

export interface ToastRegistration {
  eventName: string;
  handler: (payload: unknown, showToast: ToastRef['showToast']) => void;
}

export interface ControllerEventToastBridgeProps {
  registrations: ToastRegistration[];
}
