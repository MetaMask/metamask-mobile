import {
  filterEligibleTokens,
  getSupportedEarnTokens,
  isSupportedLendingReceiptTokenByChainId,
  isSupportedLendingTokenByChainId,
  SUPPORTED_LENDING_RECEIPT_TOKENS,
  SUPPORTED_LENDING_TOKENS,
} from '.';
import { TokenI } from '../../../Tokens/types';
import {
  MOCK_ABASUSDC_BASE_MAINNET_ASSET,
  MOCK_ACCOUNT_MULTI_CHAIN_TOKENS,
  MOCK_ADAI_MAINNET_ASSET,
  MOCK_AETHUSDC_MAINNET_ASSET,
  MOCK_AUSDT_MAINNET_ASSET,
  MOCK_DAI_MAINNET_ASSET,
  MOCK_ETH_MAINNET_ASSET,
  MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE,
  MOCK_USDC_BASE_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
  MOCK_USDT_MAINNET_ASSET,
} from '../../../Stake/__mocks__/stakeMockData';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  createMockToken,
  getCreateMockTokenOptions,
} from '../../../Stake/testUtils';
import { TOKENS_WITH_DEFAULT_OPTIONS } from '../../../Stake/testUtils/testUtils.types';

describe('tokenUtils', () => {
  const MOCK_EARN_TOKENS = [
    ...MOCK_ACCOUNT_MULTI_CHAIN_TOKENS,
    MOCK_AETHUSDC_MAINNET_ASSET,
    MOCK_AUSDT_MAINNET_ASSET,
    MOCK_ADAI_MAINNET_ASSET,
    MOCK_ABASUSDC_BASE_MAINNET_ASSET,
  ];

  const MOCK_SUPPORTED_EARN_TOKENS = [
    MOCK_ETH_MAINNET_ASSET,
    MOCK_DAI_MAINNET_ASSET,
    MOCK_USDC_MAINNET_ASSET,
    MOCK_USDT_MAINNET_ASSET,
    MOCK_AETHUSDC_MAINNET_ASSET,
    MOCK_AUSDT_MAINNET_ASSET,
    MOCK_ADAI_MAINNET_ASSET,
    MOCK_ABASUSDC_BASE_MAINNET_ASSET,
  ];

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

    it('extracts supported earn tokens from owned tokens', () => {
      const result = getSupportedEarnTokens(MOCK_EARN_TOKENS, {
        lendingTokens: true,
        receiptTokens: true,
        stakingTokens: true,
      });
      expect(result).toEqual(MOCK_SUPPORTED_EARN_TOKENS);
    });

    it('filters out Staked Ethereum but keeps Native Ethereum when selecting stakingTokens', () => {
      const tokens = [MOCK_ETH_TOKEN, MOCK_STAKED_ETH_TOKEN];
      const result = getSupportedEarnTokens(tokens, {
        stakingTokens: true,
      });
      expect(result).toEqual([MOCK_ETH_TOKEN]);
    });

    it('allows supported earn tokens on mainnet', () => {
      const tokens = [
        MOCK_ETH_TOKEN,
        MOCK_MAINNET_DAI,
        MOCK_MAINNET_USDC,
        MOCK_MAINNET_USDT_NO_BALANCE,
        MOCK_AETHUSDC_MAINNET_ASSET,
        MOCK_AUSDT_MAINNET_ASSET,
        MOCK_ADAI_MAINNET_ASSET,
        MOCK_USDC_BASE_MAINNET_ASSET,
        MOCK_ABASUSDC_BASE_MAINNET_ASSET,
      ];
      const result = getSupportedEarnTokens(tokens as TokenI[], {
        lendingTokens: true,
        receiptTokens: true,
        stakingTokens: true,
      });
      expect(result).toEqual(tokens);
    });

    it('allows supported earn tokens on BASE', () => {
      const tokens = [
        MOCK_ETH_TOKEN,
        MOCK_BASE_USDC,
        MOCK_ABASUSDC_BASE_MAINNET_ASSET,
      ];
      const result = getSupportedEarnTokens(tokens as TokenI[], {
        lendingTokens: true,
        receiptTokens: true,
        stakingTokens: true,
      });
      expect(result).toEqual(tokens);
    });

    it('does not filter out tokens that have empty fiatBalance', () => {
      const tokens = [MOCK_ETH_TOKEN, MOCK_MAINNET_USDT_NO_BALANCE];
      const result = getSupportedEarnTokens(tokens as TokenI[], {
        lendingTokens: true,
        receiptTokens: true,
        stakingTokens: true,
      });
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

    it('removes lending and lending receipt tokens if canLend is false', () => {
      const withoutLendingTokens = MOCK_SUPPORTED_EARN_TOKENS.filter(
        (token) =>
          !SUPPORTED_LENDING_TOKENS.has(token.symbol) &&
          !SUPPORTED_LENDING_RECEIPT_TOKENS.has(token.symbol),
      );

      const result = filterEligibleTokens(MOCK_SUPPORTED_EARN_TOKENS, {
        canStake: true,
        canLend: false,
      });

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

  describe('isSupportedLendingTokenByChainId', () => {
    it('returns true when token is supported', () => {
      SUPPORTED_LENDING_TOKENS.forEach((token) => {
        const isSupported = isSupportedLendingTokenByChainId(
          token,
          CHAIN_IDS.MAINNET,
        );
        expect(isSupported).toBe(true);
      });
    });

    it('returns false when token is not supported but the chainId is', () => {
      const isSupported = isSupportedLendingTokenByChainId(
        'FAKE_TOKEN',
        CHAIN_IDS.MAINNET,
      );
      expect(isSupported).toBe(false);
    });

    it('returns false when token is supported but the chainId is not', () => {
      const isSupported = isSupportedLendingTokenByChainId('USDC', '0x123123');
      expect(isSupported).toBe(false);
    });

    it('returns false when both token and chainId are not supported', () => {
      const isSupported = isSupportedLendingTokenByChainId(
        'FAKE_TOKEN',
        '0x123123',
      );
      expect(isSupported).toBe(false);
    });

    it('returns false when token parameter is empty', () => {
      const isSupported = isSupportedLendingTokenByChainId(
        '',
        CHAIN_IDS.MAINNET,
      );
      expect(isSupported).toBe(false);
    });

    it('returns false when chainId parameter is empty', () => {
      const isSupported = isSupportedLendingTokenByChainId('USDC', '');
      expect(isSupported).toBe(false);
    });
  });

  describe('isSupportedLendingReceiptTokenByChainId', () => {
    it('returns true when token is supported', () => {
      SUPPORTED_LENDING_RECEIPT_TOKENS.forEach((receiptToken) => {
        const isSupported = isSupportedLendingReceiptTokenByChainId(
          receiptToken,
          CHAIN_IDS.MAINNET,
        );
        expect(isSupported).toBe(true);
      });
    });

    it('returns false when token is not supported but the chainId is', () => {
      const isSupported = isSupportedLendingReceiptTokenByChainId(
        'FAKE_TOKEN',
        CHAIN_IDS.MAINNET,
      );
      expect(isSupported).toBe(false);
    });

    it('returns false when token is supported but the chainId is not', () => {
      const isSupported = isSupportedLendingReceiptTokenByChainId(
        'AETHUSDC',
        '0x123123',
      );
      expect(isSupported).toBe(false);
    });

    it('returns false when both token and chainId are not supported', () => {
      const isSupported = isSupportedLendingReceiptTokenByChainId(
        'FAKE_TOKEN',
        '0x123123',
      );
      expect(isSupported).toBe(false);
    });

    it('returns false when token parameter is empty', () => {
      const isSupported = isSupportedLendingReceiptTokenByChainId(
        '',
        CHAIN_IDS.MAINNET,
      );
      expect(isSupported).toBe(false);
    });

    it('returns false when chainId parameter is empty', () => {
      const isSupported = isSupportedLendingReceiptTokenByChainId(
        'AETHUSDC',
        '',
      );
      expect(isSupported).toBe(false);
    });
  });
});
