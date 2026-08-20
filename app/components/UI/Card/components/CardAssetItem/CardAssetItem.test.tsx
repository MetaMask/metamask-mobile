import React from 'react';
import { render } from '@testing-library/react-native';
import CardAssetItem from './CardAssetItem';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { TokenI } from '../../../Tokens/types';

// Mock dependencies
jest.mock('../../../../../util/networks');
jest.mock('../../../../../util/networks/customNetworks');
jest.mock('../../../../Base/RemoteImage', () => 'RemoteImage');

import { getNetworkImageSource } from '../../../../../util/networks';

const mockGetNetworkImageSource = getNetworkImageSource as jest.MockedFunction<
  typeof getNetworkImageSource
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
    balanceFiat: '$3,000.00',
    logo: undefined,
    isETH: true,
    chainId: '0x1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with required props', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardAssetItem asset={mockAsset} />
    ));

    expect(getByTestId('Ethereum')).toBeOnTheScreen();
  });

  it('renders non-native token', () => {
    const nonNativeAsset: TokenI = {
      ...mockAsset,
      name: 'USD Coin',
      symbol: 'USDC',
      isNative: false,
      address: '0xa0b86a33e6c8e2c3c5b5f7ae5f7c5b5f7ae5f7c5b5f',
    };

    const { getByTestId } = renderWithProvider(() => (
      <CardAssetItem asset={nonNativeAsset} />
    ));

    expect(getByTestId('token-avatar-image')).toBeOnTheScreen();
  });

  it('returns null when chainId is missing', () => {
    const assetWithoutChainId: TokenI = {
      ...mockAsset,
      chainId: undefined as string | undefined,
    };

    const { toJSON } = render(<CardAssetItem asset={assetWithoutChainId} />);

    expect(toJSON()).toBeNull();
  });

  it('returns null when asset is undefined', () => {
    const { toJSON } = render(<CardAssetItem asset={undefined} />);

    expect(toJSON()).toBeNull();
  });

  it('renders the money account icon when isMoneyAccountEntry prop is true', () => {
    const { getByTestId } = render(
      <CardAssetItem asset={mockAsset} isMoneyAccountEntry />,
    );

    expect(getByTestId('card-asset-item-money-account')).toBeOnTheScreen();
  });

  it('renders the money account icon when asset.isMoneyAccountEntry is true', () => {
    const { getByTestId } = render(
      <CardAssetItem asset={{ ...mockAsset, isMoneyAccountEntry: true }} />,
    );

    expect(getByTestId('card-asset-item-money-account')).toBeOnTheScreen();
  });

  it('renders the money account icon from the prop even when the asset omits the flag', () => {
    const { getByTestId } = render(
      <CardAssetItem asset={undefined} isMoneyAccountEntry />,
    );

    expect(getByTestId('card-asset-item-money-account')).toBeOnTheScreen();
  });

  it('resolves the network image from the asset chainId', () => {
    mockGetNetworkImageSource.mockReturnValue({
      uri: 'https://example.com/network.png',
    });

    renderWithProvider(() => <CardAssetItem asset={mockAsset} />);

    expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
      chainId: mockAsset.chainId,
    });
  });
});
