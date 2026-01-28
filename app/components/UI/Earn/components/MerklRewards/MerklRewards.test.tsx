import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MerklRewards from './MerklRewards';
import { TokenI } from '../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  isEligibleForMerklRewards,
  useMerklRewards,
} from './hooks/useMerklRewards';
import { useSelector } from 'react-redux';
import { BigNumber } from 'ethers';
import { fetchEvmAtomicBalance } from '../../../Bridge/hooks/useLatestBalance';

jest.mock('./hooks/useMerklRewards');

const mockSetParams = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    setParams: mockSetParams,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

// Mock fetchEvmAtomicBalance from useLatestBalance
jest.mock('../../../Bridge/hooks/useLatestBalance', () => ({
  fetchEvmAtomicBalance: jest.fn(),
}));

// Mock getProviderByChainId - return a mock provider object that satisfies type checking
const mockProvider = {} as ReturnType<
  typeof import('../../../../../util/notifications/methods/common').getProviderByChainId
>;
jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(() => mockProvider),
}));

// Import after mock to get the mocked version
import { getProviderByChainId } from '../../../../../util/notifications/methods/common';
const mockGetProviderByChainId = getProviderByChainId as jest.Mock;

jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));
jest.mock('./PendingMerklRewards', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      claimableReward,
      isProcessingClaim,
    }: {
      claimableReward: string | null;
      isProcessingClaim: boolean;
    }) =>
      ReactActual.createElement(View, {
        testID: 'pending-merkl-rewards',
        'data-claimable': claimableReward,
        'data-processing': isProcessingClaim,
      }),
  };
});

// Store reference to onClaimSuccess for testing
let capturedOnClaimSuccess: (() => void) | null = null;

jest.mock('./ClaimMerklRewards', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      asset,
      onClaimSuccess,
    }: {
      asset: TokenI;
      onClaimSuccess: () => void;
    }) => {
      // Capture the callback for testing
      capturedOnClaimSuccess = onClaimSuccess;
      return ReactActual.createElement(
        TouchableOpacity,
        {
          testID: 'claim-merkl-rewards',
          'data-asset': asset.symbol,
          onPress: onClaimSuccess,
        },
        ReactActual.createElement(Text, null, 'Claim'),
      );
    },
  };
});

const mockIsEligibleForMerklRewards =
  isEligibleForMerklRewards as jest.MockedFunction<
    typeof isEligibleForMerklRewards
  >;
const mockUseMerklRewards = useMerklRewards as jest.MockedFunction<
  typeof useMerklRewards
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockedFetchEvmAtomicBalance =
  fetchEvmAtomicBalance as jest.MockedFunction<typeof fetchEvmAtomicBalance>;

const mockSelectedAddress = '0x1234567890123456789012345678901234567890';

// Helper to create mock return value with all required properties
const createMockUseMerklRewardsReturn = (
  claimableReward: string | null,
  overrides?: Partial<ReturnType<typeof useMerklRewards>>,
): ReturnType<typeof useMerklRewards> => ({
  claimableReward,
  isProcessingClaim: false,
  refetch: jest.fn(),
  clearReward: jest.fn(),
  refetchWithRetry: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockAsset: TokenI = {
  name: 'Angle Merkl',
  symbol: 'aglaMerkl',
  address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898' as const,
  chainId: CHAIN_IDS.MAINNET,
  decimals: 18,
  aggregators: [],
  image: '',
  balance: '1000',
  balanceFiat: '$100',
  logo: '',
  isETH: false,
  isNative: false,
};

describe('MerklRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    capturedOnClaimSuccess = null;
    mockUseSelector.mockReturnValue(mockSelectedAddress);
    mockedFetchEvmAtomicBalance.mockResolvedValue(undefined);
    mockGetProviderByChainId.mockReturnValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null when asset is not eligible', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(false);
    mockUseMerklRewards.mockReturnValue(createMockUseMerklRewardsReturn(null));

    const { queryByTestId } = render(<MerklRewards asset={mockAsset} />);

    expect(queryByTestId('pending-merkl-rewards')).toBeNull();
  });

  it('renders PendingMerklRewards when asset is eligible', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue(createMockUseMerklRewardsReturn(null));

    const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

    expect(getByTestId('pending-merkl-rewards')).toBeTruthy();
  });

  it('renders ClaimMerklRewards when claimableReward is present', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue(createMockUseMerklRewardsReturn('1.5'));

    const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

    expect(getByTestId('pending-merkl-rewards')).toBeTruthy();
    expect(getByTestId('claim-merkl-rewards')).toBeTruthy();
  });

  it('does not render ClaimMerklRewards when claimableReward is null', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue(createMockUseMerklRewardsReturn(null));

    const { queryByTestId } = render(<MerklRewards asset={mockAsset} />);

    expect(queryByTestId('claim-merkl-rewards')).toBeNull();
  });

  it('passes correct props to useMerklRewards hook', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue(createMockUseMerklRewardsReturn(null));

    render(<MerklRewards asset={mockAsset} />);

    expect(mockUseMerklRewards).toHaveBeenCalledWith({
      asset: mockAsset,
    });
  });

  it('passes claimableReward to PendingMerklRewards', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue(createMockUseMerklRewardsReturn('2.5'));

    const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

    const pendingRewards = getByTestId('pending-merkl-rewards');
    expect(pendingRewards.props['data-claimable']).toBe('2.5');
  });

  it('passes asset to ClaimMerklRewards', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue(createMockUseMerklRewardsReturn('1.5'));

    const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

    const claimRewards = getByTestId('claim-merkl-rewards');
    expect(claimRewards.props['data-asset']).toBe(mockAsset.symbol);
  });

  it('passes isProcessingClaim to PendingMerklRewards', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue(
      createMockUseMerklRewardsReturn('1.5', { isProcessingClaim: true }),
    );

    const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

    const pendingRewards = getByTestId('pending-merkl-rewards');
    expect(pendingRewards.props['data-processing']).toBe(true);
  });

  describe('handleClaimSuccess', () => {
    it('calls clearReward and refetchWithRetry when claim succeeds', async () => {
      const mockClearReward = jest.fn();
      const mockRefetchWithRetry = jest.fn().mockResolvedValue(undefined);

      mockIsEligibleForMerklRewards.mockReturnValue(true);
      mockUseMerklRewards.mockReturnValue(
        createMockUseMerklRewardsReturn('1.5', {
          clearReward: mockClearReward,
          refetchWithRetry: mockRefetchWithRetry,
        }),
      );

      const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

      // Trigger the claim success callback
      const claimButton = getByTestId('claim-merkl-rewards');
      fireEvent.press(claimButton);

      expect(mockClearReward).toHaveBeenCalled();
      expect(mockRefetchWithRetry).toHaveBeenCalledWith({
        maxRetries: 5,
        delayMs: 3000,
      });
    });
  });

  describe('balance update logic', () => {
    it('does not update balance when selectedAddress is missing', async () => {
      mockUseSelector.mockReturnValue(null);
      const mockClearReward = jest.fn();
      const mockRefetchWithRetry = jest.fn().mockResolvedValue(undefined);

      mockIsEligibleForMerklRewards.mockReturnValue(true);
      mockUseMerklRewards.mockReturnValue(
        createMockUseMerklRewardsReturn('1.5', {
          clearReward: mockClearReward,
          refetchWithRetry: mockRefetchWithRetry,
        }),
      );

      render(<MerklRewards asset={mockAsset} />);

      // Trigger claim success
      capturedOnClaimSuccess?.();

      // Advance timers
      await jest.advanceTimersByTimeAsync(2000);

      expect(mockedFetchEvmAtomicBalance).not.toHaveBeenCalled();
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('does not update balance when asset.address is missing', async () => {
      const assetWithoutAddress = { ...mockAsset, address: undefined };
      const mockClearReward = jest.fn();
      const mockRefetchWithRetry = jest.fn().mockResolvedValue(undefined);

      mockIsEligibleForMerklRewards.mockReturnValue(true);
      mockUseMerklRewards.mockReturnValue(
        createMockUseMerklRewardsReturn('1.5', {
          clearReward: mockClearReward,
          refetchWithRetry: mockRefetchWithRetry,
        }),
      );

      render(<MerklRewards asset={assetWithoutAddress as unknown as TokenI} />);

      // Trigger claim success
      capturedOnClaimSuccess?.();

      // Advance timers
      await jest.advanceTimersByTimeAsync(2000);

      expect(mockedFetchEvmAtomicBalance).not.toHaveBeenCalled();
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('updates navigation params when balance changes', async () => {
      // Mock fetchEvmAtomicBalance to return a new balance (different from asset.balance)
      // asset.balance is '1000', so new balance should be different
      const newBalanceAtomic = BigNumber.from('2000000000000000000000'); // 2000 tokens
      mockedFetchEvmAtomicBalance.mockResolvedValue(newBalanceAtomic);

      const mockClearReward = jest.fn();
      const mockRefetchWithRetry = jest.fn().mockResolvedValue(undefined);

      mockIsEligibleForMerklRewards.mockReturnValue(true);
      mockUseMerklRewards.mockReturnValue(
        createMockUseMerklRewardsReturn('1.5', {
          clearReward: mockClearReward,
          refetchWithRetry: mockRefetchWithRetry,
        }),
      );

      render(<MerklRewards asset={mockAsset} />);

      // Trigger claim success
      capturedOnClaimSuccess?.();

      // Advance timers past the first delay to trigger the balance fetch
      await jest.advanceTimersByTimeAsync(2500);

      expect(mockSetParams).toHaveBeenCalledWith({
        balance: '2000.0',
      });
    });

    it('does not update navigation params when balance has not changed', async () => {
      // Mock fetchEvmAtomicBalance to return the same balance as asset.balance
      // asset.balance is '1000', so return equivalent atomic value
      const sameBalanceAtomic = BigNumber.from('1000000000000000000000'); // 1000 tokens
      mockedFetchEvmAtomicBalance.mockResolvedValue(sameBalanceAtomic);

      const mockClearReward = jest.fn();
      const mockRefetchWithRetry = jest.fn().mockResolvedValue(undefined);

      mockIsEligibleForMerklRewards.mockReturnValue(true);
      mockUseMerklRewards.mockReturnValue(
        createMockUseMerklRewardsReturn('1.5', {
          clearReward: mockClearReward,
          refetchWithRetry: mockRefetchWithRetry,
        }),
      );

      render(<MerklRewards asset={mockAsset} />);

      // Trigger claim success
      capturedOnClaimSuccess?.();

      // Advance through all retries (5 retries * 2000ms delay)
      for (let i = 0; i < 5; i++) {
        await jest.advanceTimersByTimeAsync(2000);
      }

      // Should not update params since balance didn't change
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('does not update balance when fetchEvmAtomicBalance returns undefined', async () => {
      mockedFetchEvmAtomicBalance.mockResolvedValue(undefined);
      mockUseSelector.mockReturnValue(mockSelectedAddress);

      mockIsEligibleForMerklRewards.mockReturnValue(true);
      mockUseMerklRewards.mockReturnValue(
        createMockUseMerklRewardsReturn('1.5'),
      );

      render(<MerklRewards asset={mockAsset} />);

      // Trigger claim success
      capturedOnClaimSuccess?.();

      // Advance through all retries
      await jest.advanceTimersByTimeAsync(2000 * 5);

      // Should not call setParams since balance is undefined
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('does not throw when getProviderByChainId returns undefined', async () => {
      mockGetProviderByChainId.mockReturnValue(undefined);
      mockUseSelector.mockReturnValue(mockSelectedAddress);

      mockIsEligibleForMerklRewards.mockReturnValue(true);
      mockUseMerklRewards.mockReturnValue(
        createMockUseMerklRewardsReturn('1.5'),
      );

      render(<MerklRewards asset={mockAsset} />);

      // Trigger claim success - should not throw
      capturedOnClaimSuccess?.();

      // Advance timers
      await jest.advanceTimersByTimeAsync(2000);

      // Should not attempt to fetch balance when provider is unavailable
      expect(mockedFetchEvmAtomicBalance).not.toHaveBeenCalled();
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('does not throw when fetchEvmAtomicBalance rejects', async () => {
      mockGetProviderByChainId.mockReturnValue({});
      mockedFetchEvmAtomicBalance.mockRejectedValue(new Error('Network error'));

      mockIsEligibleForMerklRewards.mockReturnValue(true);
      mockUseMerklRewards.mockReturnValue(
        createMockUseMerklRewardsReturn('1.5'),
      );

      render(<MerklRewards asset={mockAsset} />);

      // Trigger claim success - should not throw unhandled promise rejection
      capturedOnClaimSuccess?.();

      // Advance timers past the first delay to trigger the balance fetch
      await jest.advanceTimersByTimeAsync(2500);

      // Verify it tried to fetch but handled the error gracefully
      expect(mockedFetchEvmAtomicBalance).toHaveBeenCalled();
      expect(mockSetParams).not.toHaveBeenCalled();
    });
  });
});
