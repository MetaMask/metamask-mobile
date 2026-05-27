import { CHAIN_IDS } from '@metamask/transaction-controller';
import { BigNumber } from 'ethers';
import { Hex } from '@metamask/utils';
import type { RootState } from '../../../reducers';
import { selectSingleTokenBalance } from '../../../selectors/tokenBalancesController';
import type { BridgeToken } from '../Bridge/types';
import {
  getMainnetBtcBridgeToken,
  getMainnetEthBridgeToken,
  getMainnetMusdBridgeToken,
  MAINNET_MUSD_TOKEN_ADDRESS,
  MAINNET_NATIVE_ETH_TOKEN_ADDRESS,
} from './walletHomeOnboardingTradeSwapAssets';

export interface WalletHomeOnboardingTradeSwapPair {
  sourceToken: BridgeToken;
  destToken: BridgeToken;
}

function readTokenBalanceHex(
  state: RootState,
  accountAddress: Hex,
  chainId: Hex,
  tokenAddress: Hex,
): string | undefined {
  const balances = selectSingleTokenBalance(
    state,
    accountAddress,
    chainId,
    tokenAddress,
  );
  return balances[tokenAddress];
}

export function hasPositiveHexTokenBalance(
  balanceHex: string | undefined,
): boolean {
  if (!balanceHex) {
    return false;
  }

  try {
    return BigNumber.from(balanceHex).gt(0);
  } catch {
    return false;
  }
}

export function hasMainnetMusdBalance(
  state: RootState,
  accountAddress: Hex,
): boolean {
  const balanceHex = readTokenBalanceHex(
    state,
    accountAddress,
    CHAIN_IDS.MAINNET,
    MAINNET_MUSD_TOKEN_ADDRESS,
  );
  return hasPositiveHexTokenBalance(balanceHex);
}

export function hasMainnetEthBalance(
  state: RootState,
  accountAddress: Hex,
): boolean {
  const balanceHex = readTokenBalanceHex(
    state,
    accountAddress,
    CHAIN_IDS.MAINNET,
    MAINNET_NATIVE_ETH_TOKEN_ADDRESS,
  );
  return hasPositiveHexTokenBalance(balanceHex);
}

/**
 * Resolves onboarding trade-step swap tokens: mUSD → ETH, else ETH → BTC.
 */
export function resolveWalletHomeOnboardingTradeSwapPair(
  state: RootState,
  accountAddress: Hex,
): WalletHomeOnboardingTradeSwapPair | undefined {
  if (hasMainnetMusdBalance(state, accountAddress)) {
    return {
      sourceToken: getMainnetMusdBridgeToken(),
      destToken: getMainnetEthBridgeToken(),
    };
  }

  if (hasMainnetEthBalance(state, accountAddress)) {
    return {
      sourceToken: getMainnetEthBridgeToken(),
      destToken: getMainnetBtcBridgeToken(),
    };
  }

  return undefined;
}
