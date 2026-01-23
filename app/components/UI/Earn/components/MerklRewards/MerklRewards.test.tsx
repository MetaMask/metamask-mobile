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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    setParams: jest.fn(),
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({})),
}));

jest.mock('../../../../../selectors/tokenBalancesController', () => ({
  selectTokensBalances: jest.fn(),
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

jest.mock('../../../../../util/number', () => ({
  renderFromTokenMinimalUnit: jest.fn(() => '100'),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
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
    });

    const { queryByTestId } = render(<MerklRewards asset={mockAsset} />);

    expect(queryByTestId('pending-merkl-rewards')).toBeNull();
  });

  it('renders PendingMerklRewards when asset is eligible', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: null,
    });

    const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

    expect(getByTestId('pending-merkl-rewards')).toBeTruthy();
  });

  it('renders ClaimMerklRewards when claimableReward is present', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.5',
    });

    const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

    expect(getByTestId('pending-merkl-rewards')).toBeTruthy();
    expect(getByTestId('claim-merkl-rewards')).toBeTruthy();
  });

  it('does not render ClaimMerklRewards when claimableReward is null', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: null,
    });

    const { queryByTestId } = render(<MerklRewards asset={mockAsset} />);

    expect(queryByTestId('claim-merkl-rewards')).toBeNull();
  });

  it('passes correct props to useMerklRewards hook', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: null,
    });

    render(<MerklRewards asset={mockAsset} />);

    expect(mockUseMerklRewards).toHaveBeenCalledWith({
      asset: mockAsset,
    });
  });

  it('passes claimableReward to PendingMerklRewards', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '2.5',
    });

    const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

    const pendingRewards = getByTestId('pending-merkl-rewards');
    expect(pendingRewards.props['data-claimable']).toBe('2.5');
  });

  it('passes asset to ClaimMerklRewards', () => {
    mockIsEligibleForMerklRewards.mockReturnValue(true);
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.5',
    });

    const { getByTestId } = render(<MerklRewards asset={mockAsset} />);

    const claimRewards = getByTestId('claim-merkl-rewards');
    expect(claimRewards.props['data-asset']).toBe(mockAsset.symbol);
  });
});
