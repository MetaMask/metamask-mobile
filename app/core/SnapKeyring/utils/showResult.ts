import type { ErrorResult } from '@metamask/approval-controller';
import { SnapKeyringBuilderMessenger } from '../types';
import { IconName } from '../../../component-library/components/Icons/Icon';

/**
 * Options for result pages.
 */
export interface ResultComponentOptions {
  /**
   * The title to display above the message. Shown by default but can be hidden with `null`.
   */
  title: string | null;

  /**
   * The icon to display in the page. Shown by default but can be hidden with `null`.
   */
  icon: IconName | null;
}

/**
 * Shows an error result page.
 *
 * @param controllerMessenger - The controller messenger instance.
 * @param snapId - The Snap unique id.
 * @param opts - The result component options (title, icon).
 * @param properties - The properties used by SnapAccountErrorMessage component.
 * @returns Returns a promise that resolves once the user clicks the confirm
 * button.
 */
export const showError = (
  controllerMessenger: SnapKeyringBuilderMessenger,
  snapId: string,
  opts: ResultComponentOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>,
): Promise<ErrorResult> =>
  controllerMessenger.call('ApprovalController:showError', {
    header: [`${snapId}`],
    title: opts.title,
    icon: opts.icon,
    error: {
      key: 'snapAccountErrorMessage',
      name: 'SnapAccountErrorMessage',
      properties,
    },
  });

/**
 * Shows a success result page.
 *
 * @param controllerMessenger - The controller messenger instance.
 * @param snapId - The Snap unique id.
 * @param opts - The result component options (title, icon).
 * @param properties - The properties used by SnapAccountSuccessMessage component.
 * @returns Returns a promise that resolves once the user clicks the confirm
 * button.
 */
export const showSuccess = (
  controllerMessenger: SnapKeyringBuilderMessenger,
  snapId: string,
  opts: ResultComponentOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>,
): Promise<ErrorResult> =>
  controllerMessenger.call('ApprovalController:showSuccess', {
    header: [`${snapId}`],
    title: opts.title,
    icon: opts.icon,
    message: {
      key: 'snapAccountSuccessMessage',
      name: 'SnapAccountSuccessMessage',
      properties,
    },
  });
