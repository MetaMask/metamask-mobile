import { isSupportedChain } from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { getDecimalChainId } from '../../../../../util/networks';
import { TokenI } from '../../../Tokens/types';

const SUPPORTED_STAKING_TOKENS = new Set(['Ethereum']);

/**
 * aToken Addresses:
 * Linea
 * aLinUSDC (USDC): 0x374D7860c4f2f604De0191298dD393703Cce84f3
 * aLinUSDT (USDT): 0x88231dfEC71D4FF5c1e466D08C321944A7adC673
 * Arbitrum
 * aArbUSDCn (USDC): 0x724dc807b04555b71ed48a6896b6F41593b8C637
 * aArbDAI (DAI): 0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE
 * aArbUSDT (USDT): 0x6ab707Aca953eDAeFBc4fD23bA73294241490620
 */

// Temporary: Will be replaced with supported markets from API request
export const SUPPORTED_LENDING_RECEIPT_TOKENS = new Set([
  // Ethereum mainnet
  'ADAI',
  'AETHUSDC',
  'AUSDT',
  // Base
  'aBasUSDC',
  // Linea
  'aLinUSDC', // USDC
  'aLinUSDT', // USDT
  // Arbitrum
  'aArbUSDCn', // USDC
  'aArbDAI', // DAI
  'aArbUSDT', // USDT
]);

// Temporary: Will be replaced with supported markets from API request
export const SUPPORTED_LENDING_TOKENS = new Set(['DAI', 'USDC', 'USDT']);

export const LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP: Record<
  string,
  Record<string, string>
> = {
  [CHAIN_IDS.MAINNET]: {
    DAI: 'ADAI',
    USDC: 'AETHUSDC',
    USDT: 'AUSDT',
  },
  [CHAIN_IDS.BASE]: {
    USDC: 'aBasUSDC',
  },
  [CHAIN_IDS.LINEA_MAINNET]: {
    USDC: 'aLinUSDC',
    USDT: 'aLinUSDT',
  },
  [CHAIN_IDS.ARBITRUM]: {
    USDC: 'aArbUSDCn',
    DAI: 'aArbDAI',
    USDT: 'aArbUSDT',
  },
};

export const RECEIPT_TOKEN_TO_LENDING_TOKEN_MAP: Record<
  string,
  Record<string, string>
> = {
  [CHAIN_IDS.MAINNET]: {
    ADAI: 'DAI',
    AETHUSDC: 'USDC',
    AUSDT: 'USDT',
  },
  [CHAIN_IDS.BASE]: {
    aBasUSDC: 'USDC',
  },
  [CHAIN_IDS.LINEA_MAINNET]: {
    aLinUSDC: 'USDC',
    aLinUSDT: 'USDT',
  },
  [CHAIN_IDS.ARBITRUM]: {
    aArbUSDCn: 'USDC',
    aArbDAI: 'DAI',
    aArbUSDT: 'USDT',
  },
};

const SUPPORTED_CHAIN_IDS = new Set<string>([
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.BASE,
  CHAIN_IDS.LINEA_MAINNET,
  CHAIN_IDS.ARBITRUM,
]);

// TODO: Update tests to support "nativeTokens" filter option
export const getSupportedEarnTokens = (
  tokens: TokenI[],
  // Passing "true" for a given token type will include it in the output.
  // Passing "false" for a given token type will exclude it from the output.
  filter: Partial<{
    nativeTokens: boolean; // ETH only for now
    stakingTokens: boolean;
    lendingTokens: boolean;
    receiptTokens: boolean;
  }> = {},
) =>
  Object.values(tokens).filter(({ isETH, isStaked, symbol, chainId }) => {
    const {
      nativeTokens = false,
      stakingTokens = false,
      lendingTokens = false,
      receiptTokens = false,
    } = filter;

    if (!SUPPORTED_CHAIN_IDS.has(chainId as string)) return false;

    if (
      isETH &&
      !isStaked &&
      nativeTokens &&
      isSupportedChain(getDecimalChainId(chainId))
    ) {
      return true;
    }

    if (
      isETH &&
      isStaked &&
      stakingTokens &&
      // We only support staking on Ethereum
      isSupportedChain(getDecimalChainId(chainId))
    ) {
      return true;
    }

    if (lendingTokens) {
      return SUPPORTED_LENDING_TOKENS.has(symbol);
    }

    if (receiptTokens) {
      return SUPPORTED_LENDING_RECEIPT_TOKENS.has(symbol);
    }

    return false;
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
