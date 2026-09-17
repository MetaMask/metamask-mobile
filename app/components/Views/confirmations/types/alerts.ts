import { ReactElement } from 'react';

export enum Severity {
  Danger = 'danger',
  Warning = 'warning',
  Info = 'info',
}

export type AlertSeverity = Severity.Danger | Severity.Warning | Severity.Info;

type MessageOrContent =
  | {
      /**
       * Alert summary components can be used as an alternative to a message.
       */
      content: ReactElement;

      /**
       * The message is a summary of the alert details.
       */
      message?: string | ReactElement;
    }
  | {
      /**
       * Alert summary components can be used as an alternative to a message.
       */
      content?: ReactElement;

      /**
       * The message is a summary of the alert details.
       */
      message: string | ReactElement;
    };

/**
 * A confirmable alert to be displayed in the UI.
 */
export type Alert = {
  /**
   * Additional details about the alert.
   */
  alertDetails?: string[];

  /**
   * Alternate actions the user can take, specific to the alert.
   */
  action?: { label: string; callback: () => void };

  /**
   * The field associated with the alert.
   */
  field?: string;

  /**
   * Whether the alert is a blocker and un-acknowledgeable, preventing the user
   * from proceeding and relying on actions to proceed. The default is `false`.
   */
  isBlocking?: boolean;

  /**
   * The unique key of the alert.
   */
  key: string;

  /**
   * The severity of the alert.
   */
  severity: AlertSeverity;

  /**
   * Whether the alert should be skipped confirmation.
   */
  skipConfirmation?: boolean;

  /**
   * The title of the alert.
   */
  title?: string;
} & MessageOrContent;

/**
 * Shared empty result for inactive alert hooks.
 *
 * Returning a fresh `[]` allocates a new array and changes the identity of the
 * `useMemo` chain that `useConfirmationAlerts` aggregates, even when no alert
 * fired. This constant keeps the inactive case allocation-free and
 * referentially stable. On its own it does not remove confirmation renders,
 * which have other causes.
 *
 * Frozen because it is shared and must never be mutated in place.
 */
export const NO_ALERTS: Alert[] = Object.freeze([]) as unknown as Alert[];
