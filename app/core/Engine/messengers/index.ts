import { noop } from 'lodash';
import { getAccountsControllerMessenger } from './accounts-controller-messenger';
import { getAccountTreeControllerMessenger } from '../../../multichain-accounts/messengers/account-tree-controller-messenger';
import { getMultichainNetworkControllerMessenger } from './multichain-network-controller-messenger/multichain-network-controller-messenger';
import { getNetworkEnablementControllerMessenger } from './network-enablement-controller-messenger/network-enablement-controller-messenger';
import { getCurrencyRateControllerMessenger } from './currency-rate-controller-messenger/currency-rate-controller-messenger';
import { getAppMetadataControllerMessenger } from './app-metadata-controller-messenger';
import {
  getDeFiPositionsControllerInitMessenger,
  getDeFiPositionsControllerMessenger,
} from './defi-positions-controller-messenger/defi-positions-controller-messenger';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  getCronjobControllerMessenger,
  getExecutionServiceMessenger,
  getSnapControllerInitMessenger,
  getSnapControllerMessenger,
  getSnapInterfaceControllerMessenger,
  getSnapsRegistryMessenger,
  getWebSocketServiceMessenger,
} from './snaps';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { getMultichainAssetsRatesControllerMessenger } from './multichain-assets-rates-controller-messenger/multichain-assets-rates-controller-messenger';
import { getMultichainAssetsControllerMessenger } from './multichain-assets-controller-messenger/multichain-assets-controller-messenger';
import { getMultichainBalancesControllerMessenger } from './multichain-balances-controller-messenger/multichain-balances-controller-messenger';
import { getMultichainTransactionsControllerMessenger } from './multichain-transactions-controller-messenger/multichain-transactions-controller-messenger';
///: END:ONLY_INCLUDE_IF
import {
  getTransactionControllerInitMessenger,
  getTransactionControllerMessenger,
} from './transaction-controller-messenger';
import { getNotificationServicesControllerMessenger } from './notifications/notification-services-controller-messenger';
import { getNotificationServicesPushControllerMessenger } from './notifications/notification-services-push-controller-messenger';
import { getGasFeeControllerMessenger } from './gas-fee-controller-messenger/gas-fee-controller-messenger';
import { getSignatureControllerMessenger } from './signature-controller-messenger';
import { getSeedlessOnboardingControllerMessenger } from './seedless-onboarding-controller-messenger';

import { getApprovalControllerMessenger } from './approval-controller-messenger';
import { getPerpsControllerMessenger } from './perps-controller-messenger';
import { getBridgeControllerMessenger } from './bridge-controller-messenger';
import { getBridgeStatusControllerMessenger } from './bridge-status-controller-messenger';
import { getMultichainAccountServiceMessenger } from './multichain-account-service-messenger/multichain-account-service-messenger';
import { getRewardsControllerMessenger } from './rewards-controller-messenger';
/**
 * The messengers for the controllers that have been.
 */
export const CONTROLLER_MESSENGERS = {
  AccountsController: {
    getMessenger: getAccountsControllerMessenger,
    getInitMessenger: noop,
  },
  AccountTreeController: {
    getMessenger: getAccountTreeControllerMessenger,
    getInitMessenger: noop,
  },
  ApprovalController: {
    getMessenger: getApprovalControllerMessenger,
    getInitMessenger: noop,
  },
  TransactionController: {
    getMessenger: getTransactionControllerMessenger,
    getInitMessenger: getTransactionControllerInitMessenger,
  },
  CurrencyRateController: {
    getMessenger: getCurrencyRateControllerMessenger,
    getInitMessenger: noop,
  },
  MultichainNetworkController: {
    getMessenger: getMultichainNetworkControllerMessenger,
    getInitMessenger: noop,
  },
  GasFeeController: {
    getMessenger: getGasFeeControllerMessenger,
    getInitMessenger: noop,
  },
  AppMetadataController: {
    getMessenger: getAppMetadataControllerMessenger,
    getInitMessenger: noop,
  },
  SignatureController: {
    getMessenger: getSignatureControllerMessenger,
    getInitMessenger: noop,
  },
  DeFiPositionsController: {
    getMessenger: getDeFiPositionsControllerMessenger,
    getInitMessenger: getDeFiPositionsControllerInitMessenger,
  },
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  CronjobController: {
    getMessenger: getCronjobControllerMessenger,
    getInitMessenger: noop,
  },
  ExecutionService: {
    getMessenger: getExecutionServiceMessenger,
    getInitMessenger: noop,
  },
  SnapController: {
    getMessenger: getSnapControllerMessenger,
    getInitMessenger: getSnapControllerInitMessenger,
  },
  SnapInterfaceController: {
    getMessenger: getSnapInterfaceControllerMessenger,
    getInitMessenger: noop,
  },
  SnapsRegistry: {
    getMessenger: getSnapsRegistryMessenger,
    getInitMessenger: noop,
  },
  NotificationServicesController: {
    getMessenger: getNotificationServicesControllerMessenger,
    getInitMessenger: noop,
  },
  NotificationServicesPushController: {
    getMessenger: getNotificationServicesPushControllerMessenger,
    getInitMessenger: noop,
  },
  WebSocketService: {
    getMessenger: getWebSocketServiceMessenger,
    getInitMessenger: noop,
  },
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainAssetsController: {
    getMessenger: getMultichainAssetsControllerMessenger,
    getInitMessenger: noop,
  },
  MultichainAssetsRatesController: {
    getMessenger: getMultichainAssetsRatesControllerMessenger,
    getInitMessenger: noop,
  },
  MultichainBalancesController: {
    getMessenger: getMultichainBalancesControllerMessenger,
    getInitMessenger: noop,
  },
  MultichainTransactionsController: {
    getMessenger: getMultichainTransactionsControllerMessenger,
    getInitMessenger: noop,
  },
  ///: END:ONLY_INCLUDE_IF
  SeedlessOnboardingController: {
    getMessenger: getSeedlessOnboardingControllerMessenger,
    getInitMessenger: noop,
  },
  NetworkEnablementController: {
    getMessenger: getNetworkEnablementControllerMessenger,
    getInitMessenger: noop,
  },
  PerpsController: {
    getMessenger: getPerpsControllerMessenger,
    getInitMessenger: noop,
  },
  BridgeController: {
    getMessenger: getBridgeControllerMessenger,
    getInitMessenger: noop,
  },
  BridgeStatusController: {
    getMessenger: getBridgeStatusControllerMessenger,
    getInitMessenger: noop,
  },
  MultichainAccountService: {
    getMessenger: getMultichainAccountServiceMessenger,
    getInitMessenger: noop,
  },
  RewardsController: {
    getMessenger: getRewardsControllerMessenger,
    getInitMessenger: noop,
  },
} as const;
