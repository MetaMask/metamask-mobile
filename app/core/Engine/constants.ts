///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { SnapControllerStateChangeEvent } from './controllers/snaps';
///: END:ONLY_INCLUDE_IF

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { RatesControllerStateChangeEvent } from './controllers/RatesController/constants';
///: END:ONLY_INCLUDE_IF

import { swapsUtils } from '@metamask/swaps-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
/**
 * Messageable modules that are part of the Engine's context, but are not defined with state.
 * TODO: Replace with type guard once consistent inheritance for non-controllers is implemented. See: https://github.com/MetaMask/decisions/pull/41
 */
export const STATELESS_NON_CONTROLLER_NAMES = [
  'AssetsContractController',
  'ExecutionService',
  'NftDetectionController',
  'RewardsDataService',
  'TokenDetectionController',
  'WebSocketService',
  'MultichainAccountService',
] as const;

export const BACKGROUND_STATE_CHANGE_EVENT_NAMES = [
  'AccountsController:stateChange',
  'AccountTreeController:stateChange',
  'AccountTrackerController:stateChange',
  'AddressBookController:stateChange',
  'AppMetadataController:stateChange',
  'ApprovalController:stateChange',
  'CurrencyRateController:stateChange',
  'GasFeeController:stateChange',
  'KeyringController:stateChange',
  'LoggingController:stateChange',
  'NetworkController:stateChange',
  'NftController:stateChange',
  'PermissionController:stateChange',
  'PhishingController:stateChange',
  'PPOMController:stateChange',
  'PreferencesController:stateChange',
  'RemoteFeatureFlagController:stateChange',
  'SelectedNetworkController:stateChange',
  'SignatureController:stateChange',
  'SmartTransactionsController:stateChange',
  'SwapsController:stateChange',
  'TokenBalancesController:stateChange',
  'TokenListController:stateChange',
  'TokenRatesController:stateChange',
  'TokensController:stateChange',
  'TokenSearchDiscoveryController:stateChange',
  'TokenSearchDiscoveryDataController:stateChange',
  'TransactionController:stateChange',
  'MultichainNetworkController:stateChange',
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  SnapControllerStateChangeEvent,
  'SnapsRegistry:stateChange',
  'SubjectMetadataController:stateChange',
  'AuthenticationController:stateChange',
  'UserStorageController:stateChange',
  'NotificationServicesController:stateChange',
  'NotificationServicesPushController:stateChange',
  'SnapInterfaceController:stateChange',
  'CronjobController:stateChange',
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  'MultichainBalancesController:stateChange',
  RatesControllerStateChangeEvent,
  'MultichainAssetsRatesController:stateChange',
  // TODO: Export this from the assets controller
  'MultichainAssetsController:stateChange',
  'MultichainTransactionsController:stateChange',
  ///: END:ONLY_INCLUDE_IF
  'BridgeController:stateChange',
  'BridgeStatusController:stateChange',
  'EarnController:stateChange',
  'PerpsController:stateChange',
  'RewardsController:stateChange',
  'DeFiPositionsController:stateChange',
  'SeedlessOnboardingController:stateChange',
  'NetworkEnablementController:stateChange',
  'PredictController:stateChange',
] as const;

export const swapsSupportedChainIds = [
  swapsUtils.ETH_CHAIN_ID,
  swapsUtils.BSC_CHAIN_ID,
  swapsUtils.SWAPS_TESTNET_CHAIN_ID,
  swapsUtils.POLYGON_CHAIN_ID,
  swapsUtils.AVALANCHE_CHAIN_ID,
  swapsUtils.ARBITRUM_CHAIN_ID,
  swapsUtils.OPTIMISM_CHAIN_ID,
  swapsUtils.ZKSYNC_ERA_CHAIN_ID,
  swapsUtils.LINEA_CHAIN_ID,
  swapsUtils.BASE_CHAIN_ID,
  swapsUtils.SEI_CHAIN_ID,
];

export const MAINNET_DISPLAY_NAME = 'Ethereum';
export const LINEA_MAINNET_DISPLAY_NAME = 'Linea';
export const POLYGON_DISPLAY_NAME = 'Polygon';
export const AVALANCHE_DISPLAY_NAME = 'Avalanche';
export const ARBITRUM_DISPLAY_NAME = 'Arbitrum';
export const BNB_DISPLAY_NAME = 'BNB Chain';
export const OPTIMISM_DISPLAY_NAME = 'OP';
export const ZK_SYNC_ERA_DISPLAY_NAME = 'zkSync Era';
export const BASE_DISPLAY_NAME = 'Base';
export const SEI_DISPLAY_NAME = 'Sei';

export const NETWORK_TO_NAME_MAP = {
  [CHAIN_IDS.MAINNET]: MAINNET_DISPLAY_NAME,
  [CHAIN_IDS.LINEA_MAINNET]: LINEA_MAINNET_DISPLAY_NAME,
  [CHAIN_IDS.POLYGON]: POLYGON_DISPLAY_NAME,
  [CHAIN_IDS.AVALANCHE]: AVALANCHE_DISPLAY_NAME,
  [CHAIN_IDS.ARBITRUM]: ARBITRUM_DISPLAY_NAME,
  [CHAIN_IDS.BSC]: BNB_DISPLAY_NAME,
  [CHAIN_IDS.OPTIMISM]: OPTIMISM_DISPLAY_NAME,
  [CHAIN_IDS.ZKSYNC_ERA]: ZK_SYNC_ERA_DISPLAY_NAME,
  [CHAIN_IDS.BASE]: BASE_DISPLAY_NAME,
  [CHAIN_IDS.SEI]: SEI_DISPLAY_NAME,
} as const;
