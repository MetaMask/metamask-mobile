/**
 * Card navigation parameters
 */

/** Card confirm modal parameters */
export interface CardConfirmModalParams {
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}
