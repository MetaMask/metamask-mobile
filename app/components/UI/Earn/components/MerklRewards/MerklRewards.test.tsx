import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MerklRewards from './MerklRewards';
import { TokenI } from '../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  isEligibleForMerklRewards,
  useMerklRewards,
} from './hooks/useMerklRewards';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';

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

jest.mock('../../../../../util/number', () => ({
  renderFromTokenMinimalUnit: jest.fn(() => '100'),
}));

const mockUpdateBalances = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TokenBalancesController: {
      state: {
        tokenBalances: {},
      },
      updateBalances: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

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
      asset,
      claimableReward,
      isProcessingClaim,
    }: {
      asset: TokenI;
      claimableReward: string | null;
      isProcessingClaim: boolean;
    }) =>
      ReactActual.createElement(View, {
        testID: 'pending-merkl-rewards',
        'data-asset': asset.symbol,
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
const mockRenderFromTokenMinimalUnit =
  renderFromTokenMinimalUnit as jest.MockedFunction<
    typeof renderFromTokenMinimalUnit
  >;

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

// Helper to set up Engine mock with token balances
const setupEngineMock = (balanceHex?: string) => {
  const addressLower = mockSelectedAddress.toLowerCase();
  const tokenAddressLower = mockAsset.address?.toLowerCase() ?? '';
  const chainId = mockAsset.chainId as string;

  const tokenBalances = balanceHex
    ? {
        [addressLower]: {
          [chainId]: {
            [tokenAddressLower]: balanceHex,
          },
        },
      }
    : {};

  // Use Object.defineProperty to override the read-only context
  Object.defineProperty(Engine, 'context', {
    value: {
      TokenBalancesController: {
        state: { tokenBalances },
        updateBalances: mockUpdateBalances,
      },
    },
    writable: true,
    configurable: true,
  });
};

describe('MerklRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    capturedOnClaimSuccess = null;
    mockUseSelector.mockReturnValue(mockSelectedAddress);
    setupEngineMock();
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

      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('updates navigation params when balance changes', async () => {
      jest.useRealTimers();

      const initialBalance = '0x100';
      const newBalance = '0x200';
      let callCount = 0;

      // Setup Engine to return different balances
      const addressLower = mockSelectedAddress.toLowerCase();
      const tokenAddressLower = mockAsset.address?.toLowerCase() ?? '';
      const chainId = mockAsset.chainId as string;

      const tokenBalances: Record<
        string,
        Record<string, Record<string, string>>
      > = {
        [addressLower]: {
          [chainId]: {
            [tokenAddressLower]: initialBalance,
          },
        },
      };

      Object.defineProperty(Engine, 'context', {
        value: {
          TokenBalancesController: {
            state: { tokenBalances },
            updateBalances: jest.fn().mockImplementation(() => {
              callCount++;
              // After first call, update the balance
              if (callCount >= 1) {
                tokenBalances[addressLower][chainId][tokenAddressLower] =
                  newBalance;
              }
              return Promise.resolve();
            }),
          },
        },
        writable: true,
        configurable: true,
      });

      mockRenderFromTokenMinimalUnit.mockReturnValue('512');

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

      // Wait for the balance update retry to complete
      await waitFor(
        () => {
          expect(mockSetParams).toHaveBeenCalledWith({
            balance: '512',
          });
        },
        { timeout: 5000 },
      );
    });

    it('returns undefined from getCurrentBalanceHex when tokenBalances is empty', () => {
      setupEngineMock(); // Empty balances
      mockUseSelector.mockReturnValue(mockSelectedAddress);

      mockIsEligibleForMerklRewards.mockReturnValue(true);
      mockUseMerklRewards.mockReturnValue(
        createMockUseMerklRewardsReturn('1.5'),
      );

      render(<MerklRewards asset={mockAsset} />);

      // Trigger claim success - should not crash
      capturedOnClaimSuccess?.();

      // Should not call setParams since balance is undefined
      expect(mockSetParams).not.toHaveBeenCalled();
    });
  });
});
