import { renderHook } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  WITHDRAWAL_CONSTANTS,
} from '@metamask/perps-controller';
import { useWithdrawValidation } from './useWithdrawValidation';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getWithdrawalRoutes: jest.fn(),
    },
  },
}));

// Mock other hooks
jest.mock('./usePerpsConnection', () => ({
  usePerpsConnection: jest.fn(),
}));

jest.mock('./stream', () => ({
  usePerpsLiveAccount: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'perps.withdrawal.insufficient_funds') {
      return 'Insufficient funds';
    }
    if (key === 'perps.withdrawal.minimum_amount_error') {
      return params?.amount
        ? `Minimum amount: ${params.amount}`
        : 'Minimum amount required';
    }
    if (key === 'perps.withdrawal.enter_amount') {
      return 'Enter amount';
    }
    if (key === 'perps.withdrawal.withdraw_usdc') {
      return 'Withdraw USDC';
    }
    return key;
  }),
}));

import { usePerpsConnection } from './usePerpsConnection';
import { usePerpsLiveAccount } from './stream';

describe('useWithdrawValidation', () => {
  const mockRoute = {
    assetId:
      'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
    chainId: 'eip155:42161',
    constraints: {
      minAmount: '2.00',
      fees: {
        fixed: 1,
        token: 'USDC',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsLiveAccount as jest.Mock).mockReturnValue({
      account: {
        spendableBalance: '$1000.00',
        withdrawableBalance: '$1000.00',
      },
      isInitialLoading: false,
    });
    (usePerpsConnection as jest.Mock).mockReturnValue({ isInitialized: true });
    (
      Engine.context.PerpsController.getWithdrawalRoutes as jest.Mock
    ).mockReturnValue([mockRoute]);
  });

  it('reads the route when the connection initializes with an already cached balance', () => {
    const connection = usePerpsConnection as jest.Mock;
    connection.mockReturnValue({ isInitialized: false });
    const { result, rerender } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '100' }),
    );
    expect(result.current.withdrawalRoute).toBeUndefined();

    connection.mockReturnValue({ isInitialized: true });
    rerender();

    expect(result.current.withdrawalRoute).toEqual(mockRoute);
  });

  it('should parse available balance correctly', () => {
    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '100' }),
    );

    expect(result.current.withdrawableBalance).toBe('1000');
  });

  it('uses withdrawableBalance populated by spot fold for Unified Account', () => {
    (usePerpsLiveAccount as jest.Mock).mockReturnValue({
      account: {
        spendableBalance: '$2500.00',
        withdrawableBalance: '$2500.00',
      },
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '100' }),
    );

    expect(result.current.withdrawableBalance).toBe('2500');
    expect(result.current.hasInsufficientBalance).toBe(false);
  });

  it('should handle empty balance', () => {
    (usePerpsLiveAccount as jest.Mock).mockReturnValue({
      account: {
        spendableBalance: null,
        withdrawableBalance: null,
      },
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '100' }),
    );

    expect(result.current.withdrawableBalance).toBe('0');
  });

  it('should detect insufficient balance', () => {
    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '1500' }),
    );

    expect(result.current.hasInsufficientBalance).toBe(true);
  });

  it('should truncate available balance to 2 decimal places for validation', () => {
    (usePerpsLiveAccount as jest.Mock).mockReturnValue({
      account: {
        spendableBalance: '$16.069',
        withdrawableBalance: '$16.069',
      },
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '16.06' }),
    );

    expect(result.current.withdrawableBalance).toBe('16.06');
    expect(result.current.hasInsufficientBalance).toBe(false);
  });

  it('should show insufficient balance when typing more than truncated balance', () => {
    (usePerpsLiveAccount as jest.Mock).mockReturnValue({
      account: {
        spendableBalance: '$16.069',
        withdrawableBalance: '$16.069',
      },
      isInitialLoading: false,
    });

    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '16.07' }),
    );

    expect(result.current.hasInsufficientBalance).toBe(true);
  });

  it('should detect amount below minimum', () => {
    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '1.5' }),
    );

    expect(result.current.isBelowMinimum).toBe(true);
  });

  it('should validate valid amount', () => {
    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '100' }),
    );

    expect(result.current.hasInsufficientBalance).toBe(false);
    expect(result.current.isBelowMinimum).toBe(false);
    expect(result.current.hasAmount).toBe(true);
  });

  it('should use default minimum when route constraints missing', () => {
    (
      Engine.context.PerpsController.getWithdrawalRoutes as jest.Mock
    ).mockReturnValue([]);

    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '1' }),
    );

    // Default minimum is 1.01
    expect(result.current.isBelowMinimum).toBe(true);
    expect(result.current.getMinimumAmount()).toBe(
      Number.parseFloat(WITHDRAWAL_CONSTANTS.DefaultMinAmount),
    );
  });

  describe('getButtonLabel', () => {
    it('should return insufficient funds message', () => {
      const { result } = renderHook(() =>
        useWithdrawValidation({ withdrawAmount: '1500' }),
      );

      expect(result.current.getButtonLabel()).toBe('Insufficient funds');
    });

    it('should return minimum amount error', () => {
      const { result } = renderHook(() =>
        useWithdrawValidation({ withdrawAmount: '1' }),
      );

      expect(result.current.getButtonLabel()).toBe('Minimum amount: 2');
    });

    it('should return enter amount message', () => {
      const { result } = renderHook(() =>
        useWithdrawValidation({ withdrawAmount: '' }),
      );

      expect(result.current.getButtonLabel()).toBe('Enter amount');
    });

    it('should return withdraw message for valid amount', () => {
      const { result } = renderHook(() =>
        useWithdrawValidation({ withdrawAmount: '100' }),
      );

      expect(result.current.getButtonLabel()).toBe('Withdraw USDC');
    });
  });

  it('should handle testnet network', () => {
    const testnetRoute = {
      assetId: HYPERLIQUID_ASSET_CONFIGS.usdc.testnet,
      chainId: 'eip155:421614',
      constraints: {
        minAmount: '2.00',
        fees: {
          fixed: 1,
          token: 'USDC',
        },
      },
    };
    (
      Engine.context.PerpsController.getWithdrawalRoutes as jest.Mock
    ).mockReturnValue([testnetRoute]);

    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '100' }),
    );

    expect(result.current.withdrawalRoute).toEqual(testnetRoute);
  });

  it('selects the Lighter route for a Lighter withdrawal', () => {
    const lighterRoute = {
      assetId:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/default',
      chainId: 'eip155:1',
      providerId: 'lighter',
      constraints: { minAmount: '5', fees: { fixed: 0, token: 'USDC' } },
    };
    (
      Engine.context.PerpsController.getWithdrawalRoutes as jest.Mock
    ).mockReturnValue([
      { ...mockRoute, providerId: 'hyperliquid' },
      lighterRoute,
    ]);

    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '100', providerId: 'lighter' }),
    );

    expect(result.current.withdrawalRoute).toEqual(lighterRoute);
  });
});
