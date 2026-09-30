import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import Logger from '../../../../util/Logger';

/**
 * Shows a DS toast. Never throws: `toast()` throws when no `<Toaster />` is
 * mounted, and a missing toast must not break a purchase or a sale.
 */
const showToast = (
  severity: ToastSeverity,
  title: string,
  description?: string,
): void => {
  try {
    toast({ severity, title, description, showCloseButton: false });
  } catch (error) {
    Logger.log('CollectorCrypt: toast unavailable', error);
  }
};

/** Success toast. */
export const showSuccessToast = (title: string): void =>
  showToast(ToastSeverity.Success, title);

/** Danger toast with an optional detail line. */
export const showErrorToast = (title: string, description?: string): void =>
  showToast(ToastSeverity.Danger, title, description);
