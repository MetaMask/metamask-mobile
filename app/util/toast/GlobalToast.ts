import {
  ToastRef,
  ToastVariants,
} from '../../component-library/components/Toast/Toast.types';
import { IconName } from '../../component-library/components/Icons/Icon';
import { ButtonVariants } from '../../component-library/components/Buttons/Button';
import { colors } from '@metamask/design-tokens';

/**
 * Simple global toast utility for showing toasts from anywhere in the app
 */

let globalToastRef: React.RefObject<ToastRef> | null = null;
let queuedToasts: {
  title: string;
  description?: string;
  type: 'error' | 'success';
}[] = [];

// Runtime toast queue for sequential display
let runtimeToastQueue: {
  title: string;
  description?: string;
  type: 'error' | 'success';
}[] = [];
let isToastCurrentlyShowing = false;
let currentToastTimeoutId: NodeJS.Timeout | null = null;

/**
 * Show the next toast in the runtime queue
 */
const showNextToastFromQueue = (): void => {
  if (runtimeToastQueue.length === 0) {
    isToastCurrentlyShowing = false;
    return;
  }

  const nextToast = runtimeToastQueue.shift();
  if (nextToast) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    showToastImmediately(
      nextToast.title,
      nextToast.description,
      nextToast.type,
    );
  }
};

/**
 * Show a toast immediately without queuing
 */
const showToastImmediately = (
  title: string,
  description?: string,
  type: 'error' | 'success' = 'error',
): void => {
  if (!globalToastRef?.current) {
    return;
  }

  isToastCurrentlyShowing = true;

  // Clear any existing timeout
  if (currentToastTimeoutId) {
    clearTimeout(currentToastTimeoutId);
  }

  const isSuccess = type === 'success';
  const iconName = isSuccess ? IconName.CheckBold : IconName.Warning;
  const iconColor = isSuccess
    ? colors.light.success.default
    : colors.light.error.default;
  const backgroundColor = colors.light.background.default;
  const hasNoTimeout = type === 'error';

  // If toast will auto-dismiss (success toasts), set up timeout to show next toast
  if (!hasNoTimeout) {
    currentToastTimeoutId = setTimeout(() => {
      showNextToastFromQueue();
    }, 3300); // Default toast timeout (3s) + animation (300ms)
  }

  try {
    globalToastRef.current.showToast({
      closeButtonOptions: {
        variant: ButtonVariants.Primary,
        endIconName: IconName.CircleX,
        label: '',
        onPress: () => {
          // Clear auto-dismiss timeout since user manually dismissed
          if (currentToastTimeoutId) {
            clearTimeout(currentToastTimeoutId);
            currentToastTimeoutId = null;
          }

          globalToastRef?.current?.closeToast();
          // Wait for current toast to fully dismiss before showing next one
          setTimeout(() => {
            showNextToastFromQueue();
          }, 300); // Small delay to let animation complete
        },
      },
      variant: ToastVariants.Icon,
      iconName,
      iconColor,
      backgroundColor,
      labelOptions: [
        { label: title, isBold: true },
        ...(description
          ? [
              { label: '\n', isBold: false },
              { label: description, isBold: false },
            ]
          : []),
      ],
      hasNoTimeout,
    });
  } catch (error) {
    console.error(`Failed to show ${type} toast:`, error);
    isToastCurrentlyShowing = false;
    showNextToastFromQueue();
  }
};

/**
 * Show a simple error toast (queues if toast system not ready or another toast is showing)
 */
export const showErrorToast = (title: string, description?: string): void => {
  // If toast system isn't ready, queue the toast
  if (!globalToastRef?.current) {
    queuedToasts.push({ title, description, type: 'error' });
    return;
  }

  // If another toast is currently showing, add to runtime queue
  if (isToastCurrentlyShowing) {
    runtimeToastQueue.push({ title, description, type: 'error' });
    return;
  }

  showToastImmediately(title, description, 'error');
};

/**
 * Show a simple success toast (queues if toast system not ready or another toast is showing)
 */
export const showSuccessToast = (title: string, description?: string): void => {
  // If toast system isn't ready, queue the toast
  if (!globalToastRef?.current) {
    queuedToasts.push({ title, description, type: 'success' });
    return;
  }

  // If another toast is currently showing, add to runtime queue
  if (isToastCurrentlyShowing) {
    runtimeToastQueue.push({ title, description, type: 'success' });
    return;
  }

  showToastImmediately(title, description, 'success');
};

/**
 * Set the global toast reference and show any queued toasts
 */
export const setGlobalToastRef = (
  toastRef: React.RefObject<ToastRef>,
): void => {
  globalToastRef = toastRef;

  // Show any toasts that were queued before the toast system was ready
  if (queuedToasts.length > 0) {
    queuedToasts.forEach(({ title, description, type }) => {
      if (type === 'success') {
        showSuccessToast(title, description);
      } else {
        showErrorToast(title, description);
      }
    });
    queuedToasts = [];
  }
};

/**
 * Clear the global toast reference
 */
export const clearGlobalToastRef = (): void => {
  globalToastRef = null;
  queuedToasts = [];
  runtimeToastQueue = [];
  isToastCurrentlyShowing = false;
  if (currentToastTimeoutId) {
    clearTimeout(currentToastTimeoutId);
    currentToastTimeoutId = null;
  }
};
