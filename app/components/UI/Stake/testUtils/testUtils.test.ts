import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  createMockToken,
  getCreateMockTokenOptions,
  mockEarnControllerRootState,
} from '.';
import { TOKENS_WITH_DEFAULT_OPTIONS } from './testUtils.types';

const MOCK_ROOT_STATE_WITH_EARN_CONTROLLER = mockEarnControllerRootState();

describe('Staking Test Utils', () => {
  describe('createMockToken', () => {
    it('creates a mock token mainnet ETH token', () => {
      const token = createMockToken({
        chainId: CHAIN_IDS.MAINNET,
        name: 'Ethereum',
        symbol: 'Ethereum',
        decimals: 18,
        isStaked: false,
        ticker: 'ETH',
      });

      expect(token).toStrictEqual({
        address: '0xabc',
        aggregators: [],
        balance: '',
        balanceFiat: '',
        chainId: '0x1',
        decimals: 18,
        image: '',
        isETH: true,
        isNative: true,
        isStaked: false,
        logo: '',
        name: 'Ethereum',
        symbol: 'Ethereum',
        ticker: 'ETH',
      });
    });

    it('creates a mock USDC Base token', () => {
      const token = createMockToken({
        chainId: CHAIN_IDS.BASE,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 18,
        ticker: 'USDC',
      });

      expect(token).toStrictEqual({
        address: '0xabc',
        aggregators: [],
        balance: '',
        balanceFiat: '',
        chainId: '0x2105',
        decimals: 18,
        image: '',
        isETH: false,
        isNative: false,
        isStaked: false,
        logo: '',
        name: 'USD Coin',
        symbol: 'USDC',
        ticker: 'USDC',
      });
    });
  });

  describe('getCreateMockTokenOptions', () => {
    it('returns prebuilt options for mainnet ETH token mock', () => {
      const options = getCreateMockTokenOptions(
        CHAIN_IDS.MAINNET,
        TOKENS_WITH_DEFAULT_OPTIONS.ETH,
      );

      expect(options).toStrictEqual({
        chainId: '0x1',
        decimals: 18,
        isStaked: false,
        name: 'Ethereum',
        symbol: 'Ethereum',
        ticker: 'ETH',
      });
    });

    it('returns prebuilt options for BASE USDC token mock', () => {
      const options = getCreateMockTokenOptions(
        CHAIN_IDS.BASE,
        TOKENS_WITH_DEFAULT_OPTIONS.USDC,
      );

      expect(options).toStrictEqual({
        chainId: '0x2105',
        decimals: 6,
        isStaked: false,
        name: 'USDC',
        symbol: 'USDC',
        ticker: 'USDC',
      });
    });
  });

  describe('mockEarnControllerRootState', () => {
    it('returns default mock earn controller root state', () => {
      const result = mockEarnControllerRootState();

      expect(result).toStrictEqual(MOCK_ROOT_STATE_WITH_EARN_CONTROLLER);
    });

    it('returns correct state when overriding default values', () => {
      const result = mockEarnControllerRootState({
        isEligible: false,
      });

      expect(
        result.engine.backgroundState.EarnController.pooled_staking.isEligible,
      ).toBe(false);
    });
  });
});
