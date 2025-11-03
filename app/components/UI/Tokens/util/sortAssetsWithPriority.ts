import { CaipChainId, Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  BtcScope,
  SolScope,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import { Asset } from '@metamask/assets-controllers';
import { sortAssets, SortCriteria } from './sortAssets';

// These are the only two options for sorting assets
// {"key": "name", "order": "asc", "sortCallback": "alphaNumeric"}
// {"key": "tokenFiatAmount", "order": "dsc", "sortCallback": "stringNumeric"}
export function sortAssetsWithPriority<T extends Asset>(
  array: T[],
  criteria: SortCriteria,
): T[] {
  if (criteria.key === 'name') {
    return sortAssets(array, {
      key: 'name',
      order: 'asc',
      sortCallback: 'alphaNumeric',
    });
  }

  return [...array].sort(compareFiatBalanceWithPriority);
}

// Higher priority assets are last in the array to facilitate sorting
const defaultNativeAssetOrder: (Hex | CaipChainId)[] = [
  CHAIN_IDS.POLYGON,
  CHAIN_IDS.OPTIMISM,
  CHAIN_IDS.BSC,
  CHAIN_IDS.ARBITRUM,
  CHAIN_IDS.BASE,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope.Mainnet,
  ///: END:ONLY_INCLUDE_IF
  BtcScope.Mainnet,
  SolScope.Mainnet,
  CHAIN_IDS.LINEA_MAINNET,
  CHAIN_IDS.MAINNET,
];

/**
 * Compares assets by fiat balance with priority sorting.
 *
 * @param a - The first asset to compare.
 * @param b - The second asset to compare.
 * @returns A negative number if the first asset should appear before the second, a positive number if the first asset should appear after the second, or 0 if they are equal.
 */
export function compareFiatBalanceWithPriority(a: Asset, b: Asset) {
  // If one of the fiat balances is greater than the other, return the comparison
  if (a.fiat?.balance && b.fiat?.balance === undefined) {
    return -1;
  }

  if (b.fiat?.balance && a.fiat?.balance === undefined) {
    return 1;
  }

  let comparison = 0;
  if (a.fiat?.balance && b.fiat?.balance) {
    comparison = b.fiat.balance - a.fiat.balance;
  }

  if (comparison) {
    return comparison;
  }

  // With equal fiat balances
  // Always return native assets before token assets
  // Apply the priority defined in defaultNativeAssetOrder if both are native assets
  // If both assets are tokens or none is in the defaultNativeAssetOrder, compare by name
  if (a.isNative && !b.isNative) {
    return -1;
  }

  if (b.isNative && !a.isNative) {
    return 1;
  }

  if (!a.isNative && !b.isNative) {
    return a.name.localeCompare(b.name);
  }

  const nativeAssetOrderA = defaultNativeAssetOrder.indexOf(a.chainId);
  const nativeAssetOrderB = defaultNativeAssetOrder.indexOf(b.chainId);

  comparison = nativeAssetOrderB - nativeAssetOrderA;

  if (comparison) {
    return comparison;
  }

  // If neither asset is in the defaultNativeAssetOrder, compare by name
  return a.name.localeCompare(b.name);
}
