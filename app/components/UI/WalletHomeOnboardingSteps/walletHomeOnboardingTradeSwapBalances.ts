import { CHAIN_IDS } from '@metamask/transaction-controller';
import { BigNumber } from 'ethers';
import { Hex } from '@metamask/utils';
import { createSelector } from 'reselect';
import type { RootState } from '../../../reducers';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import {
  selectSingleTokenBalance,
  selectTokensBalances,
} from '../../../selectors/tokenBalancesController';
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

/** Stable references so selectors and press handlers avoid per-render allocations. */
export const MAINNET_MUSD_TO_ETH_SWAP_PAIR: WalletHomeOnboardingTradeSwapPair =
  {
    sourceToken: getMainnetMusdBridgeToken(),
    destToken: getMainnetEthBridgeToken(),
  };

export const MAINNET_ETH_TO_BTC_SWAP_PAIR: WalletHomeOnboardingTradeSwapPair = {
  sourceToken: getMainnetEthBridgeToken(),
  destToken: getMainnetBtcBridgeToken(),
};

const selectSelectedAccountMainnetMusdBalanceHex = createSelector(
  [selectSelectedInternalAccountAddress, selectTokensBalances],
  (accountAddress, tokenBalances) => {
    if (!accountAddress) {
      return undefined;
    }

    return tokenBalances?.[accountAddress as Hex]?.[CHAIN_IDS.MAINNET]?.[
      MAINNET_MUSD_TOKEN_ADDRESS
    ];
  },
);

const selectSelectedAccountMainnetEthBalanceHex = createSelector(
  [selectSelectedInternalAccountAddress, selectTokensBalances],
  (accountAddress, tokenBalances) => {
    if (!accountAddress) {
      return undefined;
    }

    return tokenBalances?.[accountAddress as Hex]?.[CHAIN_IDS.MAINNET]?.[
      MAINNET_NATIVE_ETH_TOKEN_ADDRESS
    ];
  },
);

/**
 * Memoized swap pair for the selected account; output is one of the stable pair constants.
 */
export const selectWalletHomeOnboardingTradeSwapPair = createSelector(
  [
    selectSelectedInternalAccountAddress,
    selectSelectedAccountMainnetMusdBalanceHex,
    selectSelectedAccountMainnetEthBalanceHex,
  ],
  (accountAddress, musdBalanceHex, ethBalanceHex) => {
    if (!accountAddress) {
      return undefined;
    }

    if (hasPositiveHexTokenBalance(musdBalanceHex)) {
      return MAINNET_MUSD_TO_ETH_SWAP_PAIR;
    }

    if (hasPositiveHexTokenBalance(ethBalanceHex)) {
      return MAINNET_ETH_TO_BTC_SWAP_PAIR;
    }

    return undefined;
  },
);

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
    return MAINNET_MUSD_TO_ETH_SWAP_PAIR;
  }

  if (hasMainnetEthBalance(state, accountAddress)) {
    return MAINNET_ETH_TO_BTC_SWAP_PAIR;
  }

  return undefined;
}
