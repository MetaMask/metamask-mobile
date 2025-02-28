import { getAccountsControllerMessenger } from './accounts-controller-messenger';
import type { ControllerMessengerByControllerName } from '../types';
import { getCronJobControllerMessenger } from './cron-job-controller-messenger';

/**
 * The messengers for the controllers that have been.
 */
export const CONTROLLER_MESSENGERS: ControllerMessengerByControllerName = {
  AccountsController: {
    getMessenger: getAccountsControllerMessenger,
  },
  CronjobController: {
    getMessenger: getCronJobControllerMessenger,
  },
} as const;
