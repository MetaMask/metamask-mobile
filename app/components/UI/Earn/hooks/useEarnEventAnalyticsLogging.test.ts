import { renderHook } from '@testing-library/react-hooks';
import { useEarnAnalyticsEventLogging } from './useEarnEventAnalyticsLogging';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { TokenI } from '../../Tokens/types';
import { EarnTokenDetails } from '../types/lending.types';

// mock the EARN_EXPERIENCES constant
jest.mock('../constants/experiences', () => ({
  EARN_EXPERIENCES: {
    STABLECOIN_LENDING: 'STABLECOIN_LENDING',
  },
}));

describe('useEarnAnalyticsEventLogging', () => {
  const mockStablecoinToken: TokenI = {
    address: '0x123',
    symbol: 'USDC',
    decimals: 6,
    chainId: '0x1',
    isETH: false,
    ticker: 'USDC',
    aggregators: [],
    image: '',
    name: 'USD Coin',
    balance: '0',
    logo: '',
  };

  const mockETHToken: TokenI = {
    address: '0x0',
    symbol: 'ETH',
    decimals: 18,
    chainId: '0x1',
    isETH: true,
    ticker: 'ETH',
    aggregators: [],
    image: '',
    name: 'Ethereum',
    balance: '0',
    logo: '',
  };

  const mockEarnTokenStablecoin = {
    experience: {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    },
    symbol: 'USDC',
  } as unknown as EarnTokenDetails;

  const mockEarnTokenStaking = {
    experience: {
      type: 'STAKING',
    },
    symbol: 'ETH',
  } as unknown as EarnTokenDetails;

  describe('Stablecoin Lending scenarios', () => {
    it('should return shouldLogStablecoinEvent=true for stablecoin lending deposit', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: mockEarnTokenStablecoin,
          isStablecoinLendingEnabled: true,
          token: mockStablecoinToken,
          actionType: 'deposit',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(true);
      expect(result.current.shouldLogStakingEvent()).toBe(false);
    });

    it('should return shouldLogStablecoinEvent=true for stablecoin lending withdrawal', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: mockEarnTokenStablecoin,
          isStablecoinLendingEnabled: true,
          token: mockStablecoinToken,
          actionType: 'withdrawal',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(true);
      expect(result.current.shouldLogStakingEvent()).toBe(false);
    });

    it('should return shouldLogStakingEvent=true when stablecoin lending is disabled', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: mockEarnTokenStablecoin,
          isStablecoinLendingEnabled: false,
          token: mockStablecoinToken,
          actionType: 'deposit',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(false);
      expect(result.current.shouldLogStakingEvent()).toBe(true);
    });
  });

  describe('ETH Staking scenarios', () => {
    it('should return shouldLogStakingEvent=true for ETH token deposit', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: mockEarnTokenStaking,
          isStablecoinLendingEnabled: true,
          token: mockETHToken,
          actionType: 'deposit',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(false);
      expect(result.current.shouldLogStakingEvent()).toBe(true);
    });

    it('should return shouldLogStakingEvent=true for ETH token withdrawal', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: mockEarnTokenStaking,
          isStablecoinLendingEnabled: true,
          token: mockETHToken,
          actionType: 'withdrawal',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(false);
      expect(result.current.shouldLogStakingEvent()).toBe(true);
    });

    it('should return shouldLogStakingEvent=true when stablecoin lending is disabled for ETH', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: mockEarnTokenStaking,
          isStablecoinLendingEnabled: false,
          token: mockETHToken,
          actionType: 'deposit',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(false);
      expect(result.current.shouldLogStakingEvent()).toBe(true);
    });
  });

  describe('Edge cases and unsupported scenarios', () => {
    it('should handle undefined earnToken', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: undefined,
          isStablecoinLendingEnabled: true,
          token: mockStablecoinToken,
          actionType: 'deposit',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(false);
      expect(result.current.shouldLogStakingEvent()).toBe(false);
    });

    it('should handle earnToken without experience', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: {} as unknown as EarnTokenDetails,
          isStablecoinLendingEnabled: true,
          token: mockStablecoinToken,
          actionType: 'deposit',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(false);
      expect(result.current.shouldLogStakingEvent()).toBe(false);
    });

    it('should skip logging for unsupported experience when stablecoin lending is enabled', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: {
            experience: { type: 'UNSUPPORTED_EXPERIENCE' },
          } as unknown as EarnTokenDetails,
          isStablecoinLendingEnabled: true,
          token: mockStablecoinToken,
          actionType: 'deposit',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(false);
      expect(result.current.shouldLogStakingEvent()).toBe(false);
    });

    it('should return staking event for non-ETH token when stablecoin lending is disabled', () => {
      const { result } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: {
            experience: { type: 'UNSUPPORTED_EXPERIENCE' },
          } as unknown as EarnTokenDetails,
          isStablecoinLendingEnabled: false,
          token: mockStablecoinToken,
          actionType: 'deposit',
        }),
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(false);
      expect(result.current.shouldLogStakingEvent()).toBe(true);
    });
  });

  describe('Hook stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: mockEarnTokenStablecoin,
          isStablecoinLendingEnabled: true,
          token: mockStablecoinToken,
          actionType: 'deposit',
        }),
      );

      const firstRender = result.current;
      rerender();
      const secondRender = result.current;

      expect(firstRender.shouldLogStablecoinEvent).toBe(
        secondRender.shouldLogStablecoinEvent,
      );
      expect(firstRender.shouldLogStakingEvent).toBe(
        secondRender.shouldLogStakingEvent,
      );
    });

    it('should update when dependencies change', () => {
      const { result, rerender } = renderHook(
        ({ isEnabled }) =>
          useEarnAnalyticsEventLogging({
            earnToken: mockEarnTokenStablecoin,
            isStablecoinLendingEnabled: isEnabled,
            token: mockStablecoinToken,
            actionType: 'deposit',
          }),
        { initialProps: { isEnabled: true } },
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(true);
      expect(result.current.shouldLogStakingEvent()).toBe(false);

      rerender({ isEnabled: false });

      expect(result.current.shouldLogStablecoinEvent()).toBe(false);
      expect(result.current.shouldLogStakingEvent()).toBe(true);
    });

    it('should handle actionType changes correctly', () => {
      const { result, rerender } = renderHook(
        ({ actionType }: { actionType: 'deposit' | 'withdrawal' }) =>
          useEarnAnalyticsEventLogging({
            earnToken: mockEarnTokenStablecoin,
            isStablecoinLendingEnabled: true,
            token: mockStablecoinToken,
            actionType,
          }),
        { initialProps: { actionType: 'deposit' as 'deposit' | 'withdrawal' } },
      );

      expect(result.current.shouldLogStablecoinEvent()).toBe(true);

      rerender({ actionType: 'withdrawal' as const });

      expect(result.current.shouldLogStablecoinEvent()).toBe(true);
    });
  });

  describe('Action type differentiation', () => {
    it('should handle both deposit and withdrawal for stablecoin lending', () => {
      const depositResult = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: mockEarnTokenStablecoin,
          isStablecoinLendingEnabled: true,
          token: mockStablecoinToken,
          actionType: 'deposit',
        }),
      );

      const withdrawalResult = renderHook(() =>
        useEarnAnalyticsEventLogging({
          earnToken: mockEarnTokenStablecoin,
          isStablecoinLendingEnabled: true,
          token: mockStablecoinToken,
          actionType: 'withdrawal',
        }),
      );

      // Both should log stablecoin events but internal strategy should be different
      expect(depositResult.result.current.shouldLogStablecoinEvent()).toBe(
        true,
      );
      expect(withdrawalResult.result.current.shouldLogStablecoinEvent()).toBe(
        true,
      );

      expect(depositResult.result.current.shouldLogStakingEvent()).toBe(false);
      expect(withdrawalResult.result.current.shouldLogStakingEvent()).toBe(
        false,
      );
    });
  });
});
