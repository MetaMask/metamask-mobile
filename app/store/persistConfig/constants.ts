/**
 * List of controllers that are persisted individually
 * This list should match the controllers that have state change events
 * in BACKGROUND_STATE_CHANGE_EVENT_NAMES
 */
export const CONTROLLER_LIST = [
  'AccountTrackerController',
  'AddressBookController',
  'AssetsContractController',
  'NftController',
  'TokensController',
  'TokenDetectionController',
  'NftDetectionController',
  'KeyringController',
  'NetworkController',
  'PhishingController',
  'PreferencesController',
  'TokenBalancesController',
  'TokenRatesController',
  'TransactionController',
  'SwapsController',
  'TokenListController',
  'CurrencyRateController',
  'GasFeeController',
  'ApprovalController',
  'SnapController',
  'SubjectMetadataController',
  'PermissionController',
  'LoggingController',
  'PPOMController',
] as const;
