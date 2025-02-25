import { getAccountsControllerMessenger } from './accounts-controller-messenger';
import type { ControllerMessengerByControllerName } from '../types';

/**
 * The messengers for the controllers that have been.
 */
export const CONTROLLER_MESSENGERS: ControllerMessengerByControllerName = {
  AccountsController: {
    getMessenger: getAccountsControllerMessenger,
  },
} as const;
