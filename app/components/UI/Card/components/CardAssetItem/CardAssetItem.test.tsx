import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CardAssetItem from './CardAssetItem';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { TokenI } from '../../../Tokens/types';
import { AllowanceState, CardTokenAllowance } from '../../types';
import { ethers } from 'ethers';

// Mock dependencies
jest.mock('../../hooks/useAssetBalance');
jest.mock('../../../../../util/networks');
jest.mock('../../../../../util/networks/customNetworks');
jest.mock(
  '../../../Tokens/TokenList/TokenListItem/CustomNetworkNativeImgMapping',
);
jest.mock('../../../../Base/RemoteImage', () => 'RemoteImage');

import { useAssetBalance } from '../../hooks/useAssetBalance';
import {
  isTestNet,
  getDefaultNetworkByChainId,
  getTestNetImageByChainId,
} from '../../../../../util/networks';

const mockUseAssetBalance = useAssetBalance as jest.MockedFunction<
  typeof useAssetBalance
>;
const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;
const mockGetDefaultNetworkByChainId =
  getDefaultNetworkByChainId as jest.MockedFunction<
    typeof getDefaultNetworkByChainId
  >;
const mockGetTestNetImageByChainId =
  getTestNetImageByChainId as jest.MockedFunction<
    typeof getTestNetImageByChainId
  >;

function renderWithProvider(
  component: React.ComponentType | (() => React.ReactElement | null),
) {
  return renderScreen(
    component,
    {
      name: 'CardAssetItem',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('CardAssetItem Component', () => {
  const mockOnPress = jest.fn();

  const mockAsset: TokenI = {
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    image: 'https://example.com/eth.png',
    isNative: true,
    ticker: 'ETH',
    aggregators: [],
    balance: '1000000000000000000',
    logo: undefined,
    isETH: true,
  };

  const mockAssetKey: CardTokenAllowance = {
    chainId: '0x1',
    address: '0x0000000000000000000000000000000000000000',
    isStaked: false,
    allowanceState: AllowanceState.NotEnabled,
    allowance: ethers.BigNumber.from('1000000000000000000'),
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
  };

  const mockAssetBalance = {
    asset: mockAsset,
    mainBalance: '1.5 ETH',
    secondaryBalance: '$3,000.00',
    balanceFiat: '$3,000.00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAssetBalance.mockReturnValue(mockAssetBalance);
    mockIsTestNet.mockReturnValue(false);
    mockGetDefaultNetworkByChainId.mockReturnValue(undefined);
  });

  it('renders with required props and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <CardAssetItem assetKey={mockAssetKey} privacyMode={false} />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with all props and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <CardAssetItem
        assetKey={mockAssetKey}
        privacyMode={false}
        onPress={mockOnPress}
      />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with privacy mode enabled and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <CardAssetItem
        assetKey={mockAssetKey}
        privacyMode
        onPress={mockOnPress}
      />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders non-native token and matches snapshot', () => {
    const nonNativeAsset = {
      ...mockAsset,
      name: 'USD Coin',
      symbol: 'USDC',
      isNative: false,
      address: '0xa0b86a33e6c8e2c3c5b5f7ae5f7c5b5f7ae5f7c5b5f',
    };
    mockUseAssetBalance.mockReturnValue({
      ...mockAssetBalance,
      asset: nonNativeAsset,
    });

    const { toJSON } = renderWithProvider(() => (
      <CardAssetItem
        assetKey={{
          ...mockAssetKey,
          address: '0xa0b86a33e6c8e2c3c5b5f7ae5f7c5b5f7ae5f7c5b5f',
        }}
        privacyMode={false}
      />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onPress when pressed', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardAssetItem
        assetKey={mockAssetKey}
        privacyMode={false}
        onPress={mockOnPress}
      />
    ));

    const assetElement = getByTestId('asset-ETH');
    fireEvent.press(assetElement);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockAsset);
  });

  it('returns null when chainId is missing', () => {
    const assetKeyWithoutChainId = {
      ...mockAssetKey,
      chainId: undefined as string | undefined,
    };

    const { toJSON } = render(
      <CardAssetItem assetKey={assetKeyWithoutChainId} privacyMode={false} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('returns null when asset is undefined', () => {
    mockUseAssetBalance.mockReturnValue({
      ...mockAssetBalance,
      asset: undefined,
    });

    const { toJSON } = render(
      <CardAssetItem assetKey={mockAssetKey} privacyMode={false} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('handles test network correctly', () => {
    mockIsTestNet.mockReturnValue(true);
    mockGetTestNetImageByChainId.mockReturnValue({
      uri: 'https://example.com/testnet.png',
    });

    const { toJSON } = renderWithProvider(() => (
      <CardAssetItem assetKey={mockAssetKey} privacyMode={false} />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays asset name when available', () => {
    const { getByText } = renderWithProvider(() => (
      <CardAssetItem assetKey={mockAssetKey} privacyMode={false} />
    ));

    expect(getByText('Ethereum')).toBeTruthy();
  });

  it('displays asset symbol when name is not available', () => {
    const assetWithoutName = {
      ...mockAsset,
      name: '',
    };
    mockUseAssetBalance.mockReturnValue({
      ...mockAssetBalance,
      asset: assetWithoutName,
    });

    const { getByText } = renderWithProvider(() => (
      <CardAssetItem assetKey={mockAssetKey} privacyMode={false} />
    ));

    expect(getByText('ETH')).toBeTruthy();
  });
});
