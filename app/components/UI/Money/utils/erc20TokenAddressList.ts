import { isValidAddress } from 'ethereumjs-util';
import { bigIntToHex, isStrictHexString } from '@metamask/utils';

/**
 * Explicit EVM chain ID to ERC-20 contract-address allowlist.
 *
 * Unlike WildcardTokenList, this format deliberately does not support
 * wildcard chain IDs or token addresses.
 */
export type Erc20TokenAddressList = Record<string, string[]>;

/**
 * Returns whether a value is an EVM contract address with an `0x` prefix.
 * Address casing is accepted because callers normalize values before matching.
 */
export const isEvmTokenAddress = (value: unknown): value is string =>
  typeof value === 'string' && isValidAddress(value);

/**
 * Validates an explicit EVM chain ID to ERC-20 address mapping.
 */
export const isValidErc20TokenAddressList = (
  value: unknown,
): value is Erc20TokenAddressList => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([chainId, addresses]) =>
      isStrictHexString(chainId) &&
      Array.isArray(addresses) &&
      addresses.every(isEvmTokenAddress),
  );
};

const normalizeErc20TokenAddressList = (
  tokenAddressList: Erc20TokenAddressList,
): Erc20TokenAddressList =>
  Object.entries(tokenAddressList).reduce<Erc20TokenAddressList>(
    (normalized, [chainId, addresses]) => {
      // Normalize numeric chain IDs so equivalent config keys such as `0x01`
      // and `0x1` match the canonical chain IDs supplied by token assets.
      const normalizedChainId = bigIntToHex(BigInt(chainId));
      const normalizedAddresses = addresses.map((address) =>
        address.toLowerCase(),
      );

      normalized[normalizedChainId] = [
        ...(normalized[normalizedChainId] ?? []),
        ...normalizedAddresses,
      ];
      return normalized;
    },
    {},
  );

const parseErc20TokenAddressList = (
  rawValue: unknown,
  configName: string,
): Erc20TokenAddressList | undefined => {
  try {
    const parsed =
      typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;

    if (isValidErc20TokenAddressList(parsed)) {
      return normalizeErc20TokenAddressList(parsed);
    }

    console.warn(
      `${configName} produced invalid structure. Expected format: {"0x1":["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"]}`,
    );
  } catch (error) {
    console.warn(`Failed to parse ${configName}:`, error);
  }

  return undefined;
};

/**
 * Gets an explicit ERC-20 address allowlist from remote configuration or a
 * local JSON environment override. Remote config takes precedence.
 *
 * Invalid values are reported and never broaden eligibility. When neither
 * source is valid, the empty map safely disables address-based CTAs.
 */
export const getErc20TokenAddressListFromConfig = (
  remoteValue: unknown,
  remoteFlagName: string,
  localEnvValue: string | undefined,
  localEnvName: string,
): Erc20TokenAddressList => {
  if (remoteValue !== undefined && remoteValue !== null) {
    const remoteConfig = parseErc20TokenAddressList(
      remoteValue,
      `Remote ${remoteFlagName}`,
    );
    if (remoteConfig) {
      return remoteConfig;
    }
  }

  if (localEnvValue) {
    const localConfig = parseErc20TokenAddressList(
      localEnvValue,
      `Local ${localEnvName}`,
    );
    if (localConfig) {
      return localConfig;
    }
  }

  return {};
};
