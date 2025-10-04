import { renderHook, act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictOnboarding } from './usePredictOnboarding';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { getAllowanceCalls } from '../providers/polymarket/utils';
import { addTransactionBatch } from '../../../../util/transaction-controller';

// Mock dependencies
jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
}));
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
}));
jest.mock('../providers/polymarket/utils', () => ({
  getAllowanceCalls: jest.fn(),
}));
jest.mock('../../../../util/transaction-controller', () => ({
  addTransactionBatch: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('reselect', () => ({
  createSelector: jest.fn(),
}));

import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';

describe('usePredictOnboarding', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockCreateSelector = createSelector as jest.MockedFunction<
    typeof createSelector
  >;
  const mockSelectSelectedInternalAccountAddress =
    selectSelectedInternalAccountAddress as jest.MockedFunction<
      typeof selectSelectedInternalAccountAddress
    >;
  const mockGetAllowanceCalls = getAllowanceCalls as jest.Mock;
  const mockAddTransactionBatch = addTransactionBatch as jest.Mock;
  const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
    .findNetworkClientIdByChainId as jest.Mock;

  const mockAccountAddress = '0x1234567890123456789012345678901234567890';
  const mockOnboardingState = {
    [mockAccountAddress]: true,
    '0x9876543210987654321098765432109876543210': false,
  };

  const mockAllowanceCalls = [
    {
      to: '0xcollateral-token',
      data: '0xapproval-data-1',
      value: '0x0',
      from: mockAccountAddress,
      chainId: 137,
    },
    {
      to: '0xexchange-contract',
      data: '0xapproval-data-2',
      value: '0x0',
      from: mockAccountAddress,
      chainId: 137,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockSelectSelectedInternalAccountAddress.mockReturnValue(
      mockAccountAddress,
    );
    mockFindNetworkClientIdByChainId.mockReturnValue('polygon-mainnet');
    mockGetAllowanceCalls.mockReturnValue(mockAllowanceCalls);
    mockAddTransactionBatch.mockResolvedValue(undefined);

    // Mock the onboarding state selector
    const mockOnboardingStateSelector = jest
      .fn()
      .mockReturnValue(mockOnboardingState);
    mockCreateSelector.mockReturnValue(mockOnboardingStateSelector);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) {
        return mockAccountAddress;
      }
      if (selector === mockOnboardingStateSelector) {
        return mockOnboardingState;
      }
      return undefined;
    });
  });

  describe('isOnboarded', () => {
    it('returns true when account is onboarded', () => {
      const { result } = renderHook(() => usePredictOnboarding());

      expect(result.current.isOnboarded).toBe(true);
    });

    it('returns false when account is not onboarded', () => {
      // Create a fresh hook render with different onboarding state
      const mockState = { [mockAccountAddress]: false };
      const mockOnboardingStateSelector = jest.fn().mockReturnValue(mockState);
      mockCreateSelector.mockReturnValue(mockOnboardingStateSelector);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedInternalAccountAddress) {
          return mockAccountAddress;
        }
        if (selector === mockOnboardingStateSelector) {
          return mockState;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePredictOnboarding());

      expect(result.current.isOnboarded).toBe(false);
    });

    it('returns false when no account address is selected', () => {
      // Create a fresh hook render with no account selected
      const mockOnboardingStateSelector = jest
        .fn()
        .mockReturnValue(mockOnboardingState);
      mockCreateSelector.mockReturnValue(mockOnboardingStateSelector);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedInternalAccountAddress) {
          return null;
        }
        if (selector === mockOnboardingStateSelector) {
          return mockOnboardingState;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePredictOnboarding());

      expect(result.current.isOnboarded).toBe(false);
    });
  });

  describe('enablePredict', () => {
    it('successfully enables predict with valid account', async () => {
      const { result } = renderHook(() => usePredictOnboarding());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.enablePredict();
      });

      expect(mockGetAllowanceCalls).toHaveBeenCalledWith({
        address: mockAccountAddress,
      });

      expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledWith(
        '0x89', // POLYGON_MAINNET_CHAIN_ID in hex
      );

      expect(mockAddTransactionBatch).toHaveBeenCalledWith({
        from: mockAccountAddress,
        networkClientId: 'polygon-mainnet',
        transactions: [
          {
            params: {
              to: mockAllowanceCalls[0].to,
              data: mockAllowanceCalls[0].data,
              value: mockAllowanceCalls[0].value,
            },
          },
          {
            params: {
              to: mockAllowanceCalls[1].to,
              data: mockAllowanceCalls[1].data,
              value: mockAllowanceCalls[1].value,
            },
          },
        ],
        disable7702: true,
        disableHook: true,
        disableSequential: false,
        requireApproval: true,
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('does nothing when no account address is selected', async () => {
      // Create a fresh hook render with no account selected
      const mockOnboardingStateSelector = jest
        .fn()
        .mockReturnValue(mockOnboardingState);
      mockCreateSelector.mockReturnValue(mockOnboardingStateSelector);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedInternalAccountAddress) {
          return null;
        }
        if (selector === mockOnboardingStateSelector) {
          return mockOnboardingState;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePredictOnboarding());

      await act(async () => {
        await result.current.enablePredict();
      });

      expect(mockGetAllowanceCalls).not.toHaveBeenCalled();
      expect(mockAddTransactionBatch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('handles transaction batch errors', async () => {
      const mockError = new Error('Transaction failed');
      mockAddTransactionBatch.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictOnboarding());

      await expect(
        act(async () => result.current.enablePredict()),
      ).rejects.toThrow('Transaction failed');

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictOnboarding());

      const initialEnablePredict = result.current.enablePredict;
      const initialIsOnboarded = result.current.isOnboarded;
      const initialIsLoading = result.current.isLoading;

      rerender({});

      expect(result.current.enablePredict).toBe(initialEnablePredict);
      expect(result.current.isOnboarded).toBe(initialIsOnboarded);
      expect(result.current.isLoading).toBe(initialIsLoading);
    });
  });
});
