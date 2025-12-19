import { Token } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { getDecimalChainId } from '../../../../util/networks';
import { store } from '../../../../store';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import { EarnTokenDetails } from '../types/lending.types';

const LOG_TAG = '[TokenSnapshot]';

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
  Logger.log(LOG_TAG, 'Fetching token snapshot', { chainId, address });
  try {
    await Engine.context.TokenSearchDiscoveryDataController.fetchTokenDisplayData(
      chainId,
      address,
    );
    Logger.log(LOG_TAG, '✓ Token snapshot fetch complete');
  } catch (error) {
    Logger.log(LOG_TAG, '❌ Token snapshot fetch failed', { error });
    throw error;
  }
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
    Logger.log(LOG_TAG, 'Token snapshot not found in state', {
      chainId,
      address,
    });
    return null;
  }

  Logger.log(LOG_TAG, '✓ Token snapshot found', {
    symbol: entry.token.symbol,
    address: entry.address,
  });

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

  Logger.log(
    LOG_TAG,
    '[getEarnTokenPairAddressesFromState] Looking up markets',
    chainId,
    tokenAddress,
    {
      markets: JSON.stringify(
        state.engine.backgroundState.EarnController.lending.markets.map(
          (m) => ({
            chainId: m.chainId,
            outputToken: m.outputToken.address,
            underlying: m.underlying.address,
          }),
        ),
        null,
        2,
      ),
    },
  );

  const market =
    state.engine.backgroundState.EarnController.lending.markets.find(
      (m) =>
        m.chainId === Number(getDecimalChainId(chainId)) &&
        (m.outputToken.address.toLowerCase() === tokenAddress.toLowerCase() ||
          m.underlying.address.toLowerCase() === tokenAddress.toLowerCase()),
    );

  Logger.log(LOG_TAG, '[getEarnTokenPairFromState] Looking up token', {
    chainId,
    market,
    markets: state.engine.backgroundState.EarnController.lending.markets,
  });

  // Try to find as earn token (underlying)
  const earnToken = market?.underlying.address;
  // Try to find as output token (receipt token like aToken)
  const outputToken = market?.outputToken.address;

  if (earnToken) {
    Logger.log(
      LOG_TAG,
      '[getEarnTokenPairFromState] ✓ Found as earn token',
      earnToken,
    );
  } else if (outputToken) {
    Logger.log(
      LOG_TAG,
      '[getEarnTokenPairFromState] ✓ Found as output token',
      outputToken,
    );
  } else {
    Logger.log(
      LOG_TAG,
      '[getEarnTokenPairFromState] ⚠️ Token not found in earn state',
    );
  }

  return {
    earnToken,
    outputToken,
  };
}
