import {
  filterEligibleTokens,
  getSupportedEarnTokens,
  SUPPORTED_LENDING_TOKENS,
} from '.';
import { TokenI } from '../../../Tokens/types';
import {
  MOCK_ACCOUNT_MULTI_CHAIN_TOKENS,
  MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE,
} from '../../__mocks__/mockData';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { createMockToken, getCreateMockTokenOptions } from '../../testUtils';
import { TOKENS_WITH_DEFAULT_OPTIONS } from '../../testUtils/testUtils.types';

describe('tokenUtils', () => {
  describe('getSupportedEarnTokens', () => {
    const MOCK_ETH_TOKEN = createMockToken(
      getCreateMockTokenOptions(
        CHAIN_IDS.MAINNET,
        TOKENS_WITH_DEFAULT_OPTIONS.ETH,
      ),
    );

    const MOCK_STAKED_ETH_TOKEN = createMockToken(
      getCreateMockTokenOptions(
        CHAIN_IDS.MAINNET,
        TOKENS_WITH_DEFAULT_OPTIONS.STAKED_ETH,
      ),
    );

    const MOCK_MAINNET_DAI = createMockToken(
      getCreateMockTokenOptions(
        CHAIN_IDS.MAINNET,
        TOKENS_WITH_DEFAULT_OPTIONS.DAI,
      ),
    );

    const MOCK_MAINNET_USDC = createMockToken(
      getCreateMockTokenOptions(
        CHAIN_IDS.MAINNET,
        TOKENS_WITH_DEFAULT_OPTIONS.USDC,
      ),
    );

    const MOCK_MAINNET_USDT_NO_BALANCE = createMockToken(
      getCreateMockTokenOptions(
        CHAIN_IDS.MAINNET,
        TOKENS_WITH_DEFAULT_OPTIONS.USDT,
      ),
    );

    const MOCK_BASE_USDC = createMockToken({
      chainId: CHAIN_IDS.BASE,
      name: 'USD Coin',
      symbol: 'USDC',
      ticker: 'USDC',
      decimals: 6,
    });

    const MOCK_BSC_USDC = createMockToken({
      chainId: CHAIN_IDS.BSC,
      name: 'USD Coin',
      symbol: 'USDC',
      ticker: 'USDC',
      decimals: 6,
    });

    const MOCK_SEPOLIA_USDC = createMockToken({
      chainId: CHAIN_IDS.SEPOLIA,
      name: 'USD Coin',
      symbol: 'USDC',
      ticker: 'USDC',
      decimals: 6,
    });

    it('extracts supported stable coins from owned tokens', () => {
      const result = getSupportedEarnTokens(MOCK_ACCOUNT_MULTI_CHAIN_TOKENS);
      expect(result).toEqual(MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE);
    });

    it('filters out Staked Ethereum', () => {
      const tokens = [MOCK_ETH_TOKEN, MOCK_STAKED_ETH_TOKEN];
      const result = getSupportedEarnTokens(tokens);
      expect(result).toEqual([MOCK_ETH_TOKEN]);
    });

    it('allows supported stablecoins on mainnet', () => {
      const tokens = [
        MOCK_ETH_TOKEN,
        MOCK_MAINNET_DAI,
        MOCK_MAINNET_USDC,
        MOCK_MAINNET_USDT_NO_BALANCE,
      ];
      const result = getSupportedEarnTokens(tokens as TokenI[]);
      expect(result).toEqual(tokens);
    });

    it('allows supported stablecoins on BASE', () => {
      const tokens = [MOCK_ETH_TOKEN, MOCK_BASE_USDC];
      const result = getSupportedEarnTokens(tokens as TokenI[]);
      expect(result).toEqual(tokens);
    });

    it('allows supported stablecoins on BSC', () => {
      const tokens = [MOCK_ETH_TOKEN, MOCK_BSC_USDC];
      const result = getSupportedEarnTokens(tokens as TokenI[]);
      expect(result).toEqual(tokens);
    });

    it('allows supported stablecoins on Sepolia', () => {
      const tokens = [MOCK_ETH_TOKEN, MOCK_SEPOLIA_USDC];
      const result = getSupportedEarnTokens(tokens as TokenI[]);
      expect(result).toEqual(tokens);
    });

    it('does not filter out tokens that have empty fiatBalance', () => {
      const tokens = [MOCK_ETH_TOKEN, MOCK_MAINNET_USDT_NO_BALANCE];
      const result = getSupportedEarnTokens(tokens as TokenI[]);
      expect(result).toEqual(tokens);
    });
  });

  describe('filterEligibleTokens', () => {
    it('removes staking tokens if canStake is false', () => {
      const withoutStakingTokens =
        MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE.filter(
          (token) => token.symbol !== 'Ethereum',
        );

      const result = filterEligibleTokens(
        MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE,
        { canStake: false, canLend: true },
      );

      expect(result).toStrictEqual(withoutStakingTokens);
    });

    it('removes lending tokens if canLend is false', () => {
      const withoutLendingTokens =
        MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE.filter(
          (token) => !SUPPORTED_LENDING_TOKENS.has(token.symbol),
        );

      const result = filterEligibleTokens(
        MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE,
        { canStake: true, canLend: false },
      );

      expect(result).toStrictEqual(withoutLendingTokens);
    });

    it('returns empty list if user cannot stake or lend', () => {
      const result = filterEligibleTokens(
        MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE,
        { canStake: false, canLend: false },
      );

      expect(result).toStrictEqual([]);
    });
  });
});
