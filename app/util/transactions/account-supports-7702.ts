import ExtendedKeyringTypes from '../../constants/keyringTypes';

/** Minimal shape; KeyringController.getKeyringForAccount is typed as Promise<unknown>. */
interface KeyringControllerLike {
  getKeyringForAccount: (address: string) => Promise<unknown>;
}

/**
 * Keyring types that support EIP-7702 (Setup Smart Account).
 * Only HD (entropy) and simple (private key) accounts support this; hardware and snap do not.
 */
const KEYRING_TYPES_SUPPORTING_7702: string[] = [
  ExtendedKeyringTypes.hd,
  ExtendedKeyringTypes.simple,
  ExtendedKeyringTypes.money,
];

/**
 * Returns whether the given account's keyring supports EIP-7702 gas fee tokens.
 * Used to avoid requesting 7702 from sentinel for hardware and other unsupported keyrings.
 *
 * @param address - Account address (e.g. request.from or transactionMeta.txParams?.from).
 * @param keyringControllerOrGetter - KeyringController instance or a function that returns it.
 * @param fallback - Value returned when the account or keyring cannot be resolved.
 * @returns True if the account supports 7702, or the configured fallback when support cannot be determined.
 */
export async function accountSupports7702(
  address: string | undefined,
  keyringControllerOrGetter:
    | KeyringControllerLike
    | (() => KeyringControllerLike),
  fallback = true,
): Promise<boolean> {
  if (!address) {
    return fallback;
  }
  const keyringController =
    typeof keyringControllerOrGetter === 'function'
      ? keyringControllerOrGetter()
      : keyringControllerOrGetter;
  try {
    const keyring = await keyringController.getKeyringForAccount(address);
    const keyringType =
      keyring &&
      typeof keyring === 'object' &&
      'type' in keyring &&
      typeof (keyring as { type: unknown }).type === 'string'
        ? (keyring as { type: string }).type
        : '';
    return KEYRING_TYPES_SUPPORTING_7702.includes(keyringType);
  } catch {
    return fallback;
  }
}
