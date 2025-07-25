import { renderHook } from '@testing-library/react-hooks';
import { useWithdrawValidation } from './useWithdrawValidation';
import Engine from '../../../../core/Engine';
import { WITHDRAWAL_CONSTANTS } from '../constants/perpsConfig';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getWithdrawalRoutes: jest.fn(),
    },
  },
}));

// Mock other hooks
jest.mock('./index', () => ({
  usePerpsAccount: jest.fn(),
  usePerpsNetwork: jest.fn(),
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

import { usePerpsAccount, usePerpsNetwork } from './index';

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
    (usePerpsAccount as jest.Mock).mockReturnValue({
      availableBalance: '$1000.00',
    });
    (usePerpsNetwork as jest.Mock).mockReturnValue('mainnet');
    (
      Engine.context.PerpsController.getWithdrawalRoutes as jest.Mock
    ).mockReturnValue([mockRoute]);
  });

  it('should parse available balance correctly', () => {
    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '100' }),
    );

    expect(result.current.availableBalance).toBe('1000');
  });

  it('should handle empty balance', () => {
    (usePerpsAccount as jest.Mock).mockReturnValue({
      availableBalance: null,
    });

    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '100' }),
    );

    expect(result.current.availableBalance).toBe('0');
  });

  it('should detect insufficient balance', () => {
    const { result } = renderHook(() =>
      useWithdrawValidation({ withdrawAmount: '1500' }),
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
      parseFloat(WITHDRAWAL_CONSTANTS.DEFAULT_MIN_AMOUNT),
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
    (usePerpsNetwork as jest.Mock).mockReturnValue('testnet');
    const testnetRoute = {
      assetId:
        'eip155:421614/erc20:0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d/default',
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
});
