import {
  SnapKeyringAccountAssetListUpdatedEvent as SnapKeyringAccountAssetListUpdatedEventType,
  SnapKeyringAccountBalancesUpdatedEvent as SnapKeyringAccountBalancesUpdatedEventType,
  SnapKeyringAccountTransactionsUpdatedEvent as SnapKeyringAccountTransactionsUpdatedEventType,
} from '@metamask/eth-snap-keyring';

// Events
export const SnapKeyringAccountAssetListUpdatedEvent: SnapKeyringAccountAssetListUpdatedEventType['type'] =
  'SnapKeyring:accountAssetListUpdated';

export const SnapKeyringAccountBalancesUpdatedEvent: SnapKeyringAccountBalancesUpdatedEventType['type'] =
  'SnapKeyring:accountBalancesUpdated';

export const SnapKeyringAccountTransactionsUpdatedEvent: SnapKeyringAccountTransactionsUpdatedEventType['type'] =
  'SnapKeyring:accountTransactionsUpdated';
