import { Token } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { getDecimalChainId } from '../../../../util/networks';
import { store } from '../../../../store';

export interface TokenSnapshotResult {
  chainId: Hex;
  address: string;
  token: Token;
}

/**
 * Triggers fetch of token display data from TokenSearchDiscoveryDataController.
 * Data becomes available in Engine.state.TokenSearchDiscoveryDataController.tokenDisplayData
 * after the promise resolves.
 *
 * @param chainId - The chain ID (hex)
 * @param address - The token address (hex)
 */
export async function fetchTokenSnapshot(
  chainId: Hex,
  address: Hex,
): Promise<void> {
  await Engine.context.TokenSearchDiscoveryDataController.fetchTokenDisplayData(
    chainId,
    address,
  );
}

/**
 * Reads token display data from controller state.
 * Call this after fetchTokenSnapshot has resolved.
 *
 * @param chainId - The chain ID (hex)
 * @param address - The token address (hex)
 * @returns Token snapshot result or null if not found
 */
export function getTokenSnapshotFromState(
  chainId: Hex,
  address: Hex,
): TokenSnapshotResult | null {
  const tokenDisplayData =
    Engine.state.TokenSearchDiscoveryDataController.tokenDisplayData;

  const entry = tokenDisplayData.find(
    (d) =>
      d.chainId === chainId &&
      d.address.toLowerCase() === address.toLowerCase() &&
      d.found === true,
  );

  if (!entry || !entry.found || !entry.token) {
    return null;
  }

  return {
    chainId: entry.chainId as Hex,
    address: entry.address,
    token: entry.token,
  };
}

export interface EarnTokenPairResult {
  earnToken?: string;
  outputToken?: string;
}

/**
 * Reads earn token pair from Redux store using the selector.
 * Bypasses React render cycle to get the absolute latest derived data.
 *
 * @param chainId - The chain ID (hex)
 * @param tokenAddress - The token address to look up
 * @returns Earn token pair result with earnToken and/or outputToken
 */
export function getEarnTokenPairAddressesFromState(
  chainId: Hex,
  tokenAddress: string,
): EarnTokenPairResult {
  const state = store.getState();

  const market =
    state.engine.backgroundState.EarnController.lending.markets.find(
      (m) =>
        m.chainId === Number(getDecimalChainId(chainId)) &&
        (m.outputToken.address.toLowerCase() === tokenAddress.toLowerCase() ||
          m.underlying.address.toLowerCase() === tokenAddress.toLowerCase()),
    );

  // Try to find as earn token (underlying)
  const earnToken = market?.underlying.address;
  // Try to find as output token (receipt token like aToken)
  const outputToken = market?.outputToken.address;

  return {
    earnToken,
    outputToken,
  };
}
