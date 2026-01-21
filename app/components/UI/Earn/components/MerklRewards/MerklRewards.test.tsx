import React from 'react';
import { render } from '@testing-library/react-native';
import MerklRewards from './MerklRewards';
import { TokenI } from '../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  isEligibleForMerklRewards,
  useMerklRewards,
} from './hooks/useMerklRewards';

jest.mock('./hooks/useMerklRewards');
jest.mock('./PendingMerklRewards', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      asset,
      claimableReward,
    }: {
      asset: TokenI;
      claimableReward: string | null;
    }) =>
      ReactActual.createElement(View, {
        testID: 'pending-merkl-rewards',
        'data-asset': asset.symbol,
        'data-claimable': claimableReward,
      }),
  };
});

jest.mock('./ClaimMerklRewards', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      asset,
      onRefetch,
    }: {
      asset: TokenI;
      onRefetch?: () => Promise<void>;
    }) =>
      ReactActual.createElement(View, {
        testID: 'claim-merkl-rewards',
        'data-asset': asset.symbol,
        'data-has-refetch': !!onRefetch,
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
  });

  it('returns null when asset is not eligible', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(false);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: null,
      refetch: jest.fn(),
    });

    const { queryByTestId } = render(
      <MerklRewards asset={mockAsset} exchangeRate={1.5} />,
    );

    expect(queryByTestId('pending-merkl-rewards')).toBeNull();
  });

  it('renders PendingMerklRewards when asset is eligible', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: null,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <MerklRewards asset={mockAsset} exchangeRate={1.5} />,
    );

    expect(getByTestId('pending-merkl-rewards')).toBeTruthy();
  });

  it('renders ClaimMerklRewards when claimableReward is present', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    const mockRefetch = jest.fn();
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.5',
      refetch: mockRefetch,
    });

    const { getByTestId } = render(
      <MerklRewards asset={mockAsset} exchangeRate={1.5} />,
    );

    expect(getByTestId('pending-merkl-rewards')).toBeTruthy();
    expect(getByTestId('claim-merkl-rewards')).toBeTruthy();
  });

  it('does not render ClaimMerklRewards when claimableReward is null', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: null,
      refetch: jest.fn(),
    });

    const { queryByTestId } = render(
      <MerklRewards asset={mockAsset} exchangeRate={1.5} />,
    );

    expect(queryByTestId('claim-merkl-rewards')).toBeNull();
  });

  it('passes correct props to useMerklRewards hook', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: null,
      refetch: jest.fn(),
    });

    render(<MerklRewards asset={mockAsset} exchangeRate={2.5} />);

    expect(mockUseMerklRewards).toHaveBeenCalledWith({
      asset: mockAsset,
    });
  });

  it('passes claimableReward to PendingMerklRewards', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '2.5',
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <MerklRewards asset={mockAsset} exchangeRate={1.5} />,
    );

    const pendingRewards = getByTestId('pending-merkl-rewards');
    expect(pendingRewards.props['data-claimable']).toBe('2.5');
  });

  it('passes asset to ClaimMerklRewards', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    const mockRefetch = jest.fn();
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.5',
      refetch: mockRefetch,
    });

    const { getByTestId } = render(
      <MerklRewards asset={mockAsset} exchangeRate={1.5} />,
    );

    const claimRewards = getByTestId('claim-merkl-rewards');
    expect(claimRewards.props['data-asset']).toBe(mockAsset.symbol);
  });

  it('passes refetch to ClaimMerklRewards as onRefetch', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    const mockRefetch = jest.fn();
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.5',
      refetch: mockRefetch,
    });

    const { getByTestId } = render(
      <MerklRewards asset={mockAsset} exchangeRate={1.5} />,
    );

    // Verify ClaimMerklRewards receives onRefetch prop
    const claimRewards = getByTestId('claim-merkl-rewards');
    expect(claimRewards.props['data-has-refetch']).toBe(true);
  });
});
