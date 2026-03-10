/**
 * Card navigation parameters
 */

/** Card onboarding webview parameters */
export interface CardOnboardingWebviewParams {
  url?: string;
  title?: string;
}

/** Card confirm modal parameters */
export interface CardConfirmModalParams {
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}
