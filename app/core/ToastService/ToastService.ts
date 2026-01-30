import { ToastRef, ToastOptions } from '../../component-library/components/Toast/Toast.types';
import Logger from '../../util/Logger';

/**
 * Toast service that manages the toast ref for use outside React components.
 *
 * This allows calling showToast from
 * controllers, services, and other non-React code.
 *
 * @example
 * // In a controller or service:
 * import ToastService from '../core/ToastService/ToastService';
 *
 * ToastService.showToast({
 *   variant: ToastVariants.Plain,
 *   labelOptions: [{ label: 'Success!' }],
 *   hasNoTimeout: false,
 * });
 */
class ToastService {
  static #toastRef: React.RefObject<ToastRef> | null = null;

  /**
   * Checks that the toast ref and its current value exist.
   * Returns the ToastRef for immediate use without optional chaining.
   */
  static #assertToastRefExists(message: string): ToastRef {
    if (!this.#toastRef?.current) {
      const error = new Error(
        `Toast reference is not available: ${message}`,
      );
      Logger.error(error);
      throw error;
    }
    return this.#toastRef.current;
  }

  /**
   * Set the toast ref. Should be called from the ToastContextWrapper
   */
  static set toastRef(ref: React.RefObject<ToastRef> | null) {
    this.#toastRef = ref;
  }

  /**
   * Get the toast ref
   */
  static get toastRef(): React.RefObject<ToastRef> | null {
    return this.#toastRef;
  }

  /**
   * Show a toast notification
   * @param options - Toast configuration options
   */
  static showToast(options: ToastOptions): void {
    const toast = this.#assertToastRefExists('showToast');
    toast.showToast(options);
  }

  /**
   * Close the current toast
   */
  static closeToast(): void {
    const toast = this.#assertToastRefExists('closeToast');
    toast.closeToast();
  }

  /**
   * Resets the toast reference. Only for testing purposes.
   * @internal
   */
  static resetForTesting(): void {
    this.#toastRef = null;
  }
}

export default ToastService;

