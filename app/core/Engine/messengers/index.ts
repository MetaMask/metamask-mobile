import { getAccountsControllerMessenger } from './accounts-controller-messenger';
import type { ControllerMessengerByControllerName } from '../types';
import { getMultichainNetworkControllerMessenger } from './multichain-network-controller-messenger/multichain-network-controller-messenger';
import { getCurrencyRateControllerMessenger } from './currency-rate-controller-messenger/currency-rate-controller-messenger';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { getCronjobControllerMessenger } from './cronjob-controller-messenger/cronjob-controller-messenger';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { getMultichainAssetsRatesControllerMessenger } from './multichain-assets-rates-controller-messenger/multichain-assets-rates-controller-messenger';
import { getMultichainAssetsControllerMessenger } from './multichain-assets-controller-messenger/multichain-assets-controller-messenger';
import { getMultichainBalancesControllerMessenger } from './multichain-balances-controller-messenger/multichain-balances-controller-messenger';
///: END:ONLY_INCLUDE_IF

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
    getMessenger: getCronjobControllerMessenger,
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
