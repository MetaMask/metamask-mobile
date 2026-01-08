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
  'StorageService',
  'TokenDetectionController',
  'WebSocketService',
  'BackendWebSocketService',
  'AccountActivityService',
  'MultichainAccountService',
  'ProfileMetricsService',
  'RampsService',
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
  'PreferencesController:stateChange',
  'RemoteFeatureFlagController:stateChange',
  'RampsController:stateChange',
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
  'TransactionPayController:stateChange',
  'MultichainNetworkController:stateChange',
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  'SnapController:stateChange',
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
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  'SamplePetnamesController:stateChange',
  ///: END:ONLY_INCLUDE_IF
  'NetworkEnablementController:stateChange',
  'PredictController:stateChange',
  'DelegationController:stateChange',
  'ProfileMetricsController:stateChange',
] as const;

export const swapsSupportedChainIds = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.BSC,
  CHAIN_IDS.POLYGON,
  CHAIN_IDS.AVALANCHE,
  CHAIN_IDS.ARBITRUM,
  CHAIN_IDS.OPTIMISM,
  CHAIN_IDS.ZKSYNC_ERA,
  CHAIN_IDS.LINEA_MAINNET,
  CHAIN_IDS.BASE,
  CHAIN_IDS.SEI,
  CHAIN_IDS.MONAD,
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
export const MONAD_DISPLAY_NAME = 'Monad';

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
  // TODO: Update to use CHAIN_IDS.MONAD when it is added to the transaction controller
  [CHAIN_IDS.MONAD]: MONAD_DISPLAY_NAME,
} as const;
