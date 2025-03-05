///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { SnapControllerStateChangeEvent } from './controllers/SnapController/constants';
///: END:ONLY_INCLUDE_IF

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { RatesControllerStateChangeEvent } from './controllers/RatesController/constants';
///: END:ONLY_INCLUDE_IF
/**
 * Messageable modules that are part of the Engine's context, but are not defined with state.
 * TODO: Replace with type guard once consistent inheritance for non-controllers is implemented. See: https://github.com/MetaMask/decisions/pull/41
 */
export const STATELESS_NON_CONTROLLER_NAMES = [
  'AssetsContractController',
  'NftDetectionController',
  'TokenDetectionController',
] as const;

export const BACKGROUND_STATE_CHANGE_EVENT_NAMES = [
  'AccountsController:stateChange',
  'AccountTrackerController:stateChange',
  'AddressBookController:stateChange',
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
  ///: END:ONLY_INCLUDE_IF
  'BridgeController:stateChange',
  'BridgeStatusController:stateChange',
] as const;
