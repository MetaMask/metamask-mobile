import { isSupportedChain } from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { getDecimalChainId } from '../../../../../util/networks';
import { TokenI } from '../../../Tokens/types';

const SUPPORTED_STAKING_TOKENS = new Set(['Ethereum']);

// Temporary: Will be replaced with supported markets from API request
export const SUPPORTED_LENDING_RECEIPT_TOKENS = new Set([
  // Ethereum mainnet
  'ADAI',
  'AETHUSDC',
  'AUSDT',
  // Base
  'aBasUSDC',
]);

// Temporary: Will be replaced with supported markets from API request
export const SUPPORTED_LENDING_TOKENS = new Set(['DAI', 'USDC', 'USDT']);

export const LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP: Record<
  string,
  Record<string, string>
> = {
  '0x1': {
    DAI: 'ADAI',
    USDC: 'AETHUSDC',
    USDT: 'AUSDT',
  },
  '0x2105': {
    USDC: 'aBasUSDC',
  },
};

export const RECEIPT_TOKEN_TO_LENDING_TOKEN_MAP: Record<
  string,
  Record<string, string>
> = {
  '0x1': {
    ADAI: 'DAI',
    AETHUSDC: 'USDC',
    AUSDT: 'USDT',
  },
  '0x2105': {
    aBasUSDC: 'USDC',
  },
};

const SUPPORTED_CHAIN_IDS = new Set<string>([
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.BASE,
]);

export const getSupportedEarnTokens = (
  tokens: TokenI[],
  // Passing "true" for a given token type will include it in the output.
  // Passing "false" for a given token type will exclude it from the output.
  filter: Partial<{
    stakingTokens: boolean;
    lendingTokens: boolean;
    receiptTokens: boolean;
  }> = {},
) =>
  Object.values(tokens).filter(({ isETH, isStaked, symbol, chainId }) => {
    // We only support staking on Ethereum
    if (isETH && !isSupportedChain(getDecimalChainId(chainId))) return false;
    if (isStaked) return false;

    const {
      stakingTokens = false,
      lendingTokens = false,
      receiptTokens = false,
    } = filter;

    const tokenFilter = new Set();

    if (stakingTokens) {
      for (const token of SUPPORTED_STAKING_TOKENS) tokenFilter.add(token);
    }

    if (lendingTokens) {
      for (const token of SUPPORTED_LENDING_TOKENS) tokenFilter.add(token);
    }

    if (receiptTokens) {
      for (const token of SUPPORTED_LENDING_RECEIPT_TOKENS)
        tokenFilter.add(token);
    }

    return (
      SUPPORTED_CHAIN_IDS.has(chainId as string) && tokenFilter.has(symbol)
    );
  });

const removeStakingTokens = (tokens: TokenI[]) => {
  const tokensCopy = [...tokens];

  return tokensCopy.filter(
    (token) => !SUPPORTED_STAKING_TOKENS.has(token.symbol),
  );
};

const removeLendingTokens = (tokens: TokenI[]) => {
  const tokensCopy = [...tokens];
  return tokensCopy.filter(
    (token) => !SUPPORTED_LENDING_TOKENS.has(token.symbol),
  );
};

const removeLendingReceiptTokens = (tokens: TokenI[]) => {
  const tokensCopy = [...tokens];
  return tokensCopy.filter(
    (token) => !SUPPORTED_LENDING_RECEIPT_TOKENS.has(token.symbol),
  );
};

const removeLendingTokenPairs = (tokens: TokenI[]) => {
  const tokensCopy = [...tokens];
  const withoutLendingTokens = removeLendingTokens(tokensCopy);
  return removeLendingReceiptTokens(withoutLendingTokens);
};

export const filterEligibleTokens = (
  tokens: TokenI[],
  options: { canStake: boolean; canLend: boolean },
) => {
  const { canStake = false, canLend = false } = options;

  let tokensCopy = [...tokens];

  if (!canStake) {
    tokensCopy = removeStakingTokens(tokensCopy);
  }

  if (!canLend) {
    tokensCopy = removeLendingTokenPairs(tokensCopy);
  }

  return tokensCopy;
};

export const isSupportedLendingTokenByChainId = (
  tokenSymbol: string,
  chainId: string,
) =>
  SUPPORTED_LENDING_TOKENS.has(tokenSymbol) && SUPPORTED_CHAIN_IDS.has(chainId);

export const isSupportedLendingReceiptTokenByChainId = (
  tokenSymbol: string,
  chainId: string,
) =>
  SUPPORTED_LENDING_RECEIPT_TOKENS.has(tokenSymbol) &&
  SUPPORTED_CHAIN_IDS.has(chainId);
