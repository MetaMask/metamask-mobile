import { isSupportedChain } from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { getDecimalChainId } from '../../../../../util/networks';
import { TokenI } from '../../../Tokens/types';

// Temporary: Will be replaced with supported vaults from API request
const HOLESKY_CHAIN_ID_HEX = '0x4268';

const SUPPORTED_STAKING_TOKENS = new Set(['Ethereum']);

export const SUPPORTED_LENDING_TOKENS = new Set(['DAI', 'USDC', 'USDT']);

const SUPPORTED_EARN_TOKENS = new Set([
  ...SUPPORTED_STAKING_TOKENS,
  ...SUPPORTED_LENDING_TOKENS,
]);
const SUPPORTED_CHAIN_IDS = new Set<string>([
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.BASE,
  CHAIN_IDS.BSC,
  CHAIN_IDS.SEPOLIA,
  HOLESKY_CHAIN_ID_HEX,
]);

export const getSupportedEarnTokens = (tokens: TokenI[]) =>
  Object.values(tokens).filter(({ isETH, isStaked, symbol, chainId }) => {
    // We only support staking on Ethereum
    if (isETH && !isSupportedChain(getDecimalChainId(chainId))) return false;
    if (isStaked) return false;

    return (
      SUPPORTED_CHAIN_IDS.has(chainId as string) &&
      SUPPORTED_EARN_TOKENS.has(symbol)
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
    tokensCopy = removeLendingTokens(tokensCopy);
  }

  return tokensCopy;
};

export const isSupportedLendingTokenByChainId = (
  tokenSymbol: string,
  chainId: string,
) =>
  SUPPORTED_LENDING_TOKENS.has(tokenSymbol) && SUPPORTED_CHAIN_IDS.has(chainId);
