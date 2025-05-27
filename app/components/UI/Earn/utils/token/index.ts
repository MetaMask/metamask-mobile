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
  'aEthDAI',
  'AETHUSDC',
  'aEthUSDT',
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

// Temp: To help with internal testing.
export const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  [CHAIN_IDS.MAINNET]: {
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    aEthDAI: '0x018008bfb33d285247A21d44E50697654f754e63',
    AETHUSDC: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
    aEthUSDT: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a',
  },
  [CHAIN_IDS.BASE]: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    aBasUSDC: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB',
  },
  [CHAIN_IDS.LINEA_MAINNET]: {
    USDC: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    USDT: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
    aLinUSDC: '0x374D7860c4f2f604De0191298dD393703Cce84f3',
    aLinUSDT: '0x88231dfEC71D4FF5c1e466D08C321944A7adC673',
  },
  [CHAIN_IDS.ARBITRUM]: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'USD₮0': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    aArbUSDCn: '0x724dc807b04555b71ed48a6896b6F41593b8C637', // USDC
    aArbDAI: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE', // DAI
    aArbUSDT: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620', // USDT
  },
};

// Temporary: Will be replaced with supported markets from API request
export const SUPPORTED_LENDING_TOKENS = new Set(['DAI', 'USDC', 'USDT']);

export const LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP: Record<
  string,
  Record<string, string>
> = {
  [CHAIN_IDS.MAINNET]: {
    DAI: 'aEthDAI',
    USDC: 'AETHUSDC',
    USDT: 'aEthUSDT',
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
    aEthDAI: 'DAI',
    AETHUSDC: 'USDC',
    aEthUSDT: 'USDT',
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
