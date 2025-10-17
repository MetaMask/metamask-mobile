import { noop } from 'lodash';
import { getAccountsControllerMessenger } from './accounts-controller-messenger';
import {
  getAccountTreeControllerInitMessenger,
  getAccountTreeControllerMessenger,
} from '../../../multichain-accounts/messengers/account-tree-controller-messenger';
import { getMultichainNetworkControllerMessenger } from './multichain-network-controller-messenger/multichain-network-controller-messenger';
import { getNetworkEnablementControllerMessenger } from './network-enablement-controller-messenger/network-enablement-controller-messenger';
import { getCurrencyRateControllerMessenger } from './currency-rate-controller-messenger/currency-rate-controller-messenger';
import { getAppMetadataControllerMessenger } from './app-metadata-controller-messenger';
import {
  getDeFiPositionsControllerInitMessenger,
  getDeFiPositionsControllerMessenger,
} from './defi-positions-controller-messenger/defi-positions-controller-messenger';
import {
  getBackendWebSocketServiceMessenger,
  getBackendWebSocketServiceInitMessenger,
  getAccountActivityServiceMessenger,
} from './core-backend';
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
import {
  getRatesControllerInitMessenger,
  getRatesControllerMessenger,
} from './rates-controller-messenger';
import {
  getSnapKeyringBuilderInitMessenger,
  getSnapKeyringBuilderMessenger,
} from './snap-keyring-builder-messenger';
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
import { getPredictControllerMessenger } from './predict-controller-messenger';
import { getBridgeControllerMessenger } from './bridge-controller-messenger';
import { getBridgeStatusControllerMessenger } from './bridge-status-controller-messenger';
import {
  getMultichainAccountServiceInitMessenger,
  getMultichainAccountServiceMessenger,
} from './multichain-account-service-messenger/multichain-account-service-messenger';
import { getRewardsControllerMessenger } from './rewards-controller-messenger';
import { getGatorPermissionsControllerMessenger } from './gator-permissions-controller-messenger';
import { getSelectedNetworkControllerMessenger } from './selected-network-controller-messenger';
import {
  getPermissionControllerInitMessenger,
  getPermissionControllerMessenger,
} from './permission-controller-messenger';
import { getSubjectMetadataControllerMessenger } from './subject-metadata-controller-messenger';
import { getPreferencesControllerMessenger } from './preferences-controller-messenger';
import { getKeyringControllerMessenger } from './keyring-controller-messenger';
import {
  getNetworkControllerInitMessenger,
  getNetworkControllerMessenger,
} from './network-controller-messenger';
import { getTokenSearchDiscoveryDataControllerMessenger } from './token-search-discovery-data-controller-messenger';
import { getAssetsContractControllerMessenger } from './assets-contract-controller-messenger';
import {
  getTokensControllerInitMessenger,
  getTokensControllerMessenger,
} from './tokens-controller-messenger';
import {
  getTokenListControllerInitMessenger,
  getTokenListControllerMessenger,
} from './token-list-controller-messenger';
import { getTokenSearchDiscoveryControllerMessenger } from './token-search-discovery-controller-messenger';
import {
  getTokenDetectionControllerInitMessenger,
  getTokenDetectionControllerMessenger,
} from './token-detection-controller-messenger';
import {
  getTokenBalancesControllerInitMessenger,
  getTokenBalancesControllerMessenger,
} from './token-balances-controller-messenger';
import { getTokenRatesControllerMessenger } from './token-rates-controller-messenger';
import { getAccountTrackerControllerMessenger } from './account-tracker-controller-messenger';
import { getNftControllerMessenger } from './nft-controller-messenger';
import { getNftDetectionControllerMessenger } from './nft-detection-controller-messenger';
import { getSmartTransactionsControllerMessenger } from './smart-transactions-controller-messenger';
import { getUserStorageControllerMessenger } from './identity/user-storage-controller-messenger';
import { getAuthenticationControllerMessenger } from './identity/authentication-controller-messenger';
import {
  getEarnControllerInitMessenger,
  getEarnControllerMessenger,
} from './earn-controller-messenger';
import { getRewardsDataServiceMessenger } from './rewards-data-service-messenger';
import { getSwapsControllerMessenger } from './swaps-controller-messenger';
import {
  getDelegationControllerInitMessenger,
  getDelegationControllerMessenger,
} from './delegation/delegation-controller-messenger';
import { getRemoteFeatureFlagControllerMessenger } from './remote-feature-flag-controller-messenger';
import {
  getPPOMControllerInitMessenger,
  getPPOMControllerMessenger,
} from './ppom-controller-messenger';
import { getErrorReportingServiceMessenger } from './error-reporting-service-messenger';

/**
 * The messengers for the controllers that have been.
 */
export const CONTROLLER_MESSENGERS = {
  AccountsController: {
    getMessenger: getAccountsControllerMessenger,
    getInitMessenger: noop,
  },
  AccountTrackerController: {
    getMessenger: getAccountTrackerControllerMessenger,
    getInitMessenger: noop,
  },
  AccountTreeController: {
    getMessenger: getAccountTreeControllerMessenger,
    getInitMessenger: getAccountTreeControllerInitMessenger,
  },
  ApprovalController: {
    getMessenger: getApprovalControllerMessenger,
    getInitMessenger: noop,
  },
  AssetsContractController: {
    getMessenger: getAssetsContractControllerMessenger,
    getInitMessenger: noop,
  },
  EarnController: {
    getMessenger: getEarnControllerMessenger,
    getInitMessenger: getEarnControllerInitMessenger,
  },
  ErrorReportingService: {
    getMessenger: getErrorReportingServiceMessenger,
    getInitMessenger: noop,
  },
  TokenListController: {
    getMessenger: getTokenListControllerMessenger,
    getInitMessenger: getTokenListControllerInitMessenger,
  },
  TokensController: {
    getMessenger: getTokensControllerMessenger,
    getInitMessenger: getTokensControllerInitMessenger,
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
  KeyringController: {
    getMessenger: getKeyringControllerMessenger,
    getInitMessenger: noop,
  },
  NetworkController: {
    getMessenger: getNetworkControllerMessenger,
    getInitMessenger: getNetworkControllerInitMessenger,
  },
  NftController: {
    getMessenger: getNftControllerMessenger,
    getInitMessenger: noop,
  },
  NftDetectionController: {
    getMessenger: getNftDetectionControllerMessenger,
    getInitMessenger: noop,
  },
  AppMetadataController: {
    getMessenger: getAppMetadataControllerMessenger,
    getInitMessenger: noop,
  },
  PreferencesController: {
    getMessenger: getPreferencesControllerMessenger,
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
  AuthenticationController: {
    getMessenger: getAuthenticationControllerMessenger,
    getInitMessenger: noop,
  },
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
  SubjectMetadataController: {
    getMessenger: getSubjectMetadataControllerMessenger,
    getInitMessenger: noop,
  },
  UserStorageController: {
    getMessenger: getUserStorageControllerMessenger,
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
  RatesController: {
    getMessenger: getRatesControllerMessenger,
    getInitMessenger: getRatesControllerInitMessenger,
  },
  SnapKeyringBuilder: {
    getMessenger: getSnapKeyringBuilderMessenger,
    getInitMessenger: getSnapKeyringBuilderInitMessenger,
  },
  ///: END:ONLY_INCLUDE_IF
  PermissionController: {
    getMessenger: getPermissionControllerMessenger,
    getInitMessenger: getPermissionControllerInitMessenger,
  },
  SeedlessOnboardingController: {
    getMessenger: getSeedlessOnboardingControllerMessenger,
    getInitMessenger: noop,
  },
  SelectedNetworkController: {
    getMessenger: getSelectedNetworkControllerMessenger,
    getInitMessenger: noop,
  },
  SmartTransactionsController: {
    getMessenger: getSmartTransactionsControllerMessenger,
    getInitMessenger: noop,
  },
  SwapsController: {
    getMessenger: getSwapsControllerMessenger,
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
  PredictController: {
    getMessenger: getPredictControllerMessenger,
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
    getInitMessenger: getMultichainAccountServiceInitMessenger,
  },
  PPOMController: {
    getMessenger: getPPOMControllerMessenger,
    getInitMessenger: getPPOMControllerInitMessenger,
  },
  RemoteFeatureFlagController: {
    getMessenger: getRemoteFeatureFlagControllerMessenger,
    getInitMessenger: noop,
  },
  RewardsController: {
    getMessenger: getRewardsControllerMessenger,
    getInitMessenger: noop,
  },
  RewardsDataService: {
    getMessenger: getRewardsDataServiceMessenger,
    getInitMessenger: noop,
  },
  TokenBalancesController: {
    getMessenger: getTokenBalancesControllerMessenger,
    getInitMessenger: getTokenBalancesControllerInitMessenger,
  },
  TokenDetectionController: {
    getMessenger: getTokenDetectionControllerMessenger,
    getInitMessenger: getTokenDetectionControllerInitMessenger,
  },
  TokenRatesController: {
    getMessenger: getTokenRatesControllerMessenger,
    getInitMessenger: noop,
  },
  TokenSearchDiscoveryController: {
    getMessenger: getTokenSearchDiscoveryControllerMessenger,
    getInitMessenger: noop,
  },
  TokenSearchDiscoveryDataController: {
    getMessenger: getTokenSearchDiscoveryDataControllerMessenger,
    getInitMessenger: noop,
  },
  GatorPermissionsController: {
    getMessenger: getGatorPermissionsControllerMessenger,
    getInitMessenger: noop,
  },
  DelegationController: {
    getMessenger: getDelegationControllerMessenger,
    getInitMessenger: getDelegationControllerInitMessenger,
  },
  BackendWebSocketService: {
    getMessenger: getBackendWebSocketServiceMessenger,
    getInitMessenger: getBackendWebSocketServiceInitMessenger,
  },
  AccountActivityService: {
    getMessenger: getAccountActivityServiceMessenger,
    getInitMessenger: noop,
  },
} as const;
