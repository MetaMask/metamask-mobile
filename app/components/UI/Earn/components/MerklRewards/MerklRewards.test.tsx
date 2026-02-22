import React from 'react';
import { render } from '@testing-library/react-native';
import MerklRewards from './MerklRewards';
import { TokenI } from '../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  isEligibleForMerklRewards,
  useMerklRewards,
} from './hooks/useMerklRewards';
import { usePendingMerklClaim } from './hooks/usePendingMerklClaim';

jest.mock('./hooks/useMerklRewards');
jest.mock('./hooks/usePendingMerklClaim');

jest.mock('./PendingMerklRewards', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ claimableReward }: { claimableReward: string | null }) =>
      ReactActual.createElement(View, {
        testID: 'pending-merkl-rewards',
        'data-claimable': claimableReward,
      }),
  };
});

jest.mock('./ClaimMerklRewards', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ asset }: { asset: TokenI }) =>
      ReactActual.createElement(View, {
        testID: 'claim-merkl-rewards',
        'data-asset': asset.symbol,
      }),
  };
});

const mockIsEligibleForMerklRewards =
  isEligibleForMerklRewards as jest.MockedFunction<
    typeof isEligibleForMerklRewards
  >;
const mockUseMerklRewards = useMerklRewards as jest.MockedFunction<
  typeof useMerklRewards
>;
const mockUsePendingMerklClaim = usePendingMerklClaim as jest.MockedFunction<
  typeof usePendingMerklClaim
>;

// Helper to create mock return value with all required properties
const createMockUseMerklRewardsReturn = (
  claimableReward: string | null,
): ReturnType<typeof useMerklRewards> => ({
  claimableReward,
  refetch: jest.fn(),
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
    mockUsePendingMerklClaim.mockReturnValue({ hasPendingClaim: false });
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

  it('calls refetch when onClaimConfirmed callback is triggered', () => {
    const mockRefetch = jest.fn();
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.5',
      refetch: mockRefetch,
    });

    // Capture the onClaimConfirmed callback passed to usePendingMerklClaim
    let capturedOnClaimConfirmed: (() => void) | undefined;
    mockUsePendingMerklClaim.mockImplementation((options) => {
      capturedOnClaimConfirmed = options?.onClaimConfirmed;
      return { hasPendingClaim: false };
    });

    render(<MerklRewards asset={mockAsset} />);

    // Verify usePendingMerklClaim was called with onClaimConfirmed callback
    expect(capturedOnClaimConfirmed).toBeDefined();

    // Simulate claim being confirmed
    capturedOnClaimConfirmed?.();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
