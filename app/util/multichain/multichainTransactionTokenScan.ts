import type { Transaction } from '@metamask/keyring-api';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';

/** Stable key: `{chain.namespace}:{assetReference}` for fungible token CAIP assets (matches PhishingController bulk scan grouping). */
export type MultichainTokenScanKey = `${string}:${string}`;

function tryParseTokenScanKey(
  assetType: string,
): MultichainTokenScanKey | null {
  if (!isCaipAssetType(assetType)) {
    return null;
  }
  const parsed = parseCaipAssetType(assetType);
  if (parsed.assetNamespace !== 'token') {
    return null;
  }
  return `${parsed.chain.namespace}:${parsed.assetReference}`;
}

function collectTokenScanKeysFromMovements(
  movements: {
    asset:
      | {
          fungible: true;
          type: string;
        }
      | {
          fungible: false;
          id: string;
        }
      | null;
  }[],
  into: Set<MultichainTokenScanKey>,
) {
  for (const movement of movements) {
    const asset = movement?.asset;
    if (!asset || !('fungible' in asset) || !asset.fungible) {
      continue;
    }
    const key = tryParseTokenScanKey(asset.type);
    if (key) {
      into.add(key);
    }
  }
}

/**
 * Collects unique token scan keys from a multichain {@link Transaction} (from / to / fees).
 * Only CAIP `token:` fungible assets are included — same set MultichainAssetsController sends to Blockaid.
 */
export function collectMultichainTransactionTokenScanKeys(
  transaction: Transaction,
): MultichainTokenScanKey[] {
  const keys = new Set<MultichainTokenScanKey>();
  collectTokenScanKeysFromMovements(transaction.from ?? [], keys);
  collectTokenScanKeysFromMovements(transaction.to ?? [], keys);
  for (const fee of transaction.fees ?? []) {
    collectTokenScanKeysFromMovements([fee], keys);
  }
  return [...keys];
}

/**
 * Returns true if any fungible token movement in the transaction matches a malicious scan key.
 */
export function multichainTransactionInvolvesMaliciousTokenKey(
  transaction: Transaction,
  maliciousKeys: Set<MultichainTokenScanKey>,
): boolean {
  if (maliciousKeys.size === 0) {
    return false;
  }
  for (const key of collectMultichainTransactionTokenScanKeys(transaction)) {
    if (maliciousKeys.has(key)) {
      return true;
    }
  }
  return false;
}

/**
 * Drops multichain activity rows that involve a Blockaid-malicious fungible token
 * (same Malicious signal as {@link MultichainAssetsController} uses for the token list).
 * When {@link maliciousKeys} is empty, returns the list unchanged (fail-open until scan results exist).
 */
export function filterMultichainTransactionsExcludingMaliciousTokenActivity<
  T extends Transaction,
>(transactions: readonly T[], maliciousKeys: Set<MultichainTokenScanKey>): T[] {
  if (maliciousKeys.size === 0) {
    return [...transactions];
  }
  return transactions.filter(
    (tx) => !multichainTransactionInvolvesMaliciousTokenKey(tx, maliciousKeys),
  );
}

/**
 * Builds a stable fingerprint of all scannable token keys across transactions (for effect deps).
 */
export function buildMultichainActivityTokenScanFingerprint(
  transactions: Transaction[],
): string {
  const all = new Set<MultichainTokenScanKey>();
  for (const tx of transactions) {
    for (const key of collectMultichainTransactionTokenScanKeys(tx)) {
      all.add(key);
    }
  }
  return [...all].sort().join('\u0000');
}
