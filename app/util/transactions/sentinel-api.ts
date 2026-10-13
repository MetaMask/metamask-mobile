import { convertHexToDecimal } from '@metamask/controller-utils';
import {
  SentinelChainNotSupportedError,
  type SentinelApiServiceMessenger,
  type SentinelNetwork,
} from '@metamask/sentinel-api-service';
import { Hex } from '@metamask/utils';
import { prefixError } from './error-prefix';

export type { SentinelNetwork } from '@metamask/sentinel-api-service';

/**
 * Minimal messenger used to call the `SentinelApiService`.
 */
export type SentinelApiMessenger = Pick<SentinelApiServiceMessenger, 'call'>;

const ERROR_PREFIX = 'Sentinel: ';

let sentinelApiMessenger: SentinelApiMessenger | undefined;

/**
 * Sets the messenger used to query the `SentinelApiService`.
 * Called once when the `SentinelApiService` is initialized.
 *
 * @param messenger - Messenger able to call `SentinelApiService` actions.
 */
export function setSentinelApiMessenger(
  messenger: SentinelApiMessenger | undefined,
): void {
  sentinelApiMessenger = messenger;
}

/**
 * Gets the messenger used to query the `SentinelApiService`.
 *
 * @returns Messenger able to call `SentinelApiService` actions.
 */
export function getSentinelApiMessenger(): SentinelApiMessenger {
  if (!sentinelApiMessenger) {
    throw new Error('Messenger not initialized');
  }

  return sentinelApiMessenger;
}

/**
 * Get Sentinel network flags by chain ID.
 *
 * @param chainId - The chain ID to get the network flags for.
 * @returns A promise that resolves to the Sentinel network flags for the given chain ID, or undefined if not supported.
 */
export async function getSentinelNetworkFlags(
  chainId: Hex,
): Promise<SentinelNetwork | undefined> {
  try {
    return await getSentinelApiMessenger().call(
      'SentinelApiService:getNetwork',
      chainId,
    );
  } catch (error) {
    if (error instanceof SentinelChainNotSupportedError) {
      return undefined;
    }

    throw prefixError(error, ERROR_PREFIX);
  }
}

/**
 * Returns true if this chain supports sendBundle feature.
 *
 * @param chainId - The chain ID to check.
 * @returns A promise that resolves to true if sendBundle is supported, false otherwise.
 */
export async function isSendBundleSupported(chainId: Hex): Promise<boolean> {
  const network = await getSentinelNetworkFlags(chainId);

  return Boolean(network?.sendBundle);
}

/**
 * Returns the addresses the Sentinel relay submits transactions from on a given chain.
 *
 * @param chainId - The chain ID to get the signers for.
 * @returns A promise that resolves to the signer addresses, or an empty array if none are available.
 */
export async function getSentinelSigners(chainId: Hex): Promise<Hex[]> {
  const network = await getSentinelNetworkFlags(chainId);
  const signers = network?.cubistSigners;

  return Array.isArray(signers) ? signers : [];
}

/**
 * Returns a map of chain IDs to whether sendBundle is supported for each chain.
 *
 * @param chainIds - The chain IDs to check.
 * @returns A map of chain IDs to their sendBundle support status.
 */
export async function getSendBundleSupportedChains(
  chainIds: Hex[],
): Promise<Record<string, boolean>> {
  let networks: Record<string, SentinelNetwork>;

  try {
    networks = await getSentinelApiMessenger().call(
      'SentinelApiService:getNetworks',
    );
  } catch (error) {
    throw prefixError(error, ERROR_PREFIX);
  }

  return chainIds.reduce<Record<string, boolean>>((acc, chainId) => {
    acc[chainId] = Boolean(networks[convertHexToDecimal(chainId)]?.sendBundle);
    return acc;
  }, {});
}
