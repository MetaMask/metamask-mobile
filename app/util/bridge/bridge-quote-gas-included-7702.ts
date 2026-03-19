import {
  KeyringTypes,
  isCustodyKeyring,
  type KeyringObject,
} from '@metamask/keyring-controller';

/**
 * Keyrings that sign outside the app (hardware, QR, custody) cannot rely on
 * in-wallet EIP-7702 / relay flows the bridge API models with `gasIncluded7702`.
 */
const EXTERNAL_SIGNING_KEYRING_TYPES: ReadonlySet<KeyringTypes> = new Set([
  KeyringTypes.qr,
  KeyringTypes.ledger,
  KeyringTypes.trezor,
  KeyringTypes.oneKey,
  KeyringTypes.lattice,
]);

/**
 * @param keyringType - Keyring type string from KeyringController.
 * @returns Whether this keyring signs externally (not in-app software keyring).
 */
export function isExternalSigningKeyringType(keyringType: string): boolean {
  if (isCustodyKeyring(keyringType)) {
    return true;
  }
  return EXTERNAL_SIGNING_KEYRING_TYPES.has(keyringType as KeyringTypes);
}

/**
 * Finds the keyring type that owns the given EVM address.
 *
 * @param keyrings - Keyrings from KeyringController state.
 * @param address - Wallet address (any casing).
 * @returns The keyring `type` or undefined if not found.
 */
export function getKeyringTypeForAddress(
  keyrings: KeyringObject[],
  address: string,
): string | undefined {
  const normalized = address.toLowerCase();
  const keyring = keyrings.find((kr) =>
    kr.accounts.some((a) => a.toLowerCase() === normalized),
  );
  return keyring?.type;
}

/**
 * When true, bridge quote requests should send `gasIncluded7702: false` even if
 * other flags would enable gas-included 7702 quotes for software accounts.
 *
 * @param walletAddress - Source account for the bridge/swap (checksummed or not).
 * @param keyrings - Keyrings from KeyringController state.
 */
export function shouldDisableGasIncluded7702InBridgeQuoteRequest(
  walletAddress: string | undefined,
  keyrings: KeyringObject[] | undefined,
): boolean {
  if (!walletAddress?.length || !keyrings?.length) {
    return false;
  }
  const type = getKeyringTypeForAddress(keyrings, walletAddress);
  return type !== undefined && isExternalSigningKeyringType(type);
}
