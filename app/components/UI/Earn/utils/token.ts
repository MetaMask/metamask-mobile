import { TokenI } from '../../Tokens/types';

interface TokenEligibility {
  canStake: boolean;
  canLend: boolean;
}

const SUPPORTED_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI'];

export const getSupportedEarnTokens = (tokens: TokenI[]) =>
  tokens.filter((token) => SUPPORTED_TOKENS.includes(token.symbol));

export const filterEligibleTokens = (
  tokens: TokenI[],
  eligibility: TokenEligibility,
) =>
  tokens.filter((token) => {
    if (token.isETH) {
      return eligibility.canStake;
    }
    return eligibility.canLend;
  });
