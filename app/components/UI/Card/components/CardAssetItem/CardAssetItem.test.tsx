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

import {
  isTestNet,
  getTestNetImageByChainId,
} from '../../../../../util/networks';

const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;
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
    mockIsTestNet.mockReturnValue(false);
  });

  it('renders with required props and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <CardAssetItem asset={mockAsset} />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders non-native token and matches snapshot', () => {
    const nonNativeAsset: TokenI = {
      ...mockAsset,
      name: 'USD Coin',
      symbol: 'USDC',
      isNative: false,
      address: '0xa0b86a33e6c8e2c3c5b5f7ae5f7c5b5f7ae5f7c5b5f',
    };

    const { toJSON } = renderWithProvider(() => (
      <CardAssetItem asset={nonNativeAsset} />
    ));

    expect(toJSON()).toMatchSnapshot();
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

  it('handles test network correctly', () => {
    mockIsTestNet.mockReturnValue(true);
    mockGetTestNetImageByChainId.mockReturnValue({
      uri: 'https://example.com/testnet.png',
    });

    const { toJSON } = renderWithProvider(() => (
      <CardAssetItem asset={mockAsset} />
    ));

    expect(toJSON()).toMatchSnapshot();
  });
});
