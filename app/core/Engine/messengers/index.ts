import { getAccountsControllerMessenger } from './accounts-controller-messenger';
import type { ControllerMessengerByControllerName } from '../types';
import { getCronJobControllerMessenger } from './cron-job-controller-messenger';
import { getMultichainAssetsRatesControllerMessenger } from './multichain-assets-rates-controller-messenger';

/**
 * The messengers for the controllers that have been.
 */
export const CONTROLLER_MESSENGERS: ControllerMessengerByControllerName = {
  AccountsController: {
    getMessenger: getAccountsControllerMessenger,
  },
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  CronjobController: {
    getMessenger: getCronJobControllerMessenger,
  },
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainAssetsRatesController: {
    getMessenger: getMultichainAssetsRatesControllerMessenger,
  },
  ///: END:ONLY_INCLUDE_IF
} as const;
