import { getAccountsControllerMessenger } from './accounts-controller-messenger';
import type { ControllerMessengerByControllerName } from '../types';
import { getCronJobControllerMessenger } from './cron-job-controller-messenger';
import { getMultichainAssetsRatesControllerMessenger } from './multichain-assets-rates-controller-messenger';
import { getMultichainAssetsControllerMessenger } from './multichain-assets-controller-messenger';
import { getCurrencyRateControllerMessenger } from './currency-rate-controller-messenger';
import { getMultichainBalancesControllerMessenger } from './multichain-balances-controller-messenger';
import { getMultichainNetworkControllerMessenger } from './multichain-network-controller-messenger';

/**
 * The messengers for the controllers that have been.
 */
export const CONTROLLER_MESSENGERS: ControllerMessengerByControllerName = {
  AccountsController: {
    getMessenger: getAccountsControllerMessenger,
  },
  CurrencyRateController: {
    getMessenger: getCurrencyRateControllerMessenger,
  },
  MultichainNetworkController: {
    getMessenger: getMultichainNetworkControllerMessenger,
  },
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  CronjobController: {
    getMessenger: getCronJobControllerMessenger,
  },
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainAssetsController: {
    getMessenger: getMultichainAssetsControllerMessenger,
  },
  MultichainAssetsRatesController: {
    getMessenger: getMultichainAssetsRatesControllerMessenger,
  },
  MultichainBalancesController: {
    getMessenger: getMultichainBalancesControllerMessenger,
  },
  ///: END:ONLY_INCLUDE_IF
} as const;
