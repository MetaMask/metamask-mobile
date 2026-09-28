import React, {
  createElement as mockCreateElement,
  Fragment as mockFragment,
  type ReactNode as MockReactNode,
} from 'react';
import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { render } from '@testing-library/react-native';
import {
  BadgeNetwork,
  BadgeWrapper,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import type { EarnAsset } from '../../types/earnAssets';
import EarnAssetIcon from './EarnAssetIcon';

jest.mock('@metamask/design-system-react-native', () => {
  const mockBadgeWrapper = jest.fn(
    ({ badge, children }: { badge: MockReactNode; children: MockReactNode }) =>
      mockCreateElement(mockFragment, null, badge, children),
  );

  return {
    BadgeNetwork: jest.fn(() => null),
    BadgeWrapper: mockBadgeWrapper,
    BadgeWrapperPosition: { BottomRight: 'bottom-right' },
  };
});

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(),
}));

jest.mock('../../../Assets/components/AssetLogo/AssetLogo', () =>
  jest.fn(() => null),
);

const mockGetNetworkImageSource = jest.mocked(getNetworkImageSource);
const mockBadgeNetwork = jest.mocked(BadgeNetwork);
const mockBadgeWrapper = jest.mocked(BadgeWrapper);
const mockAssetLogo = jest.mocked(AssetLogo);

const createEarnAsset = (): EarnAsset => ({
  assetId:
    'eip155:137/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAsset['assetId'],
  metadata: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x89',
    decimals: 6,
    image: 'https://example.com/usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    ticker: 'USDC',
    logo: 'https://example.com/usdc.png',
    isETH: false,
    isNative: false,
  },
  wallet: {
    status: 'tracked',
    asset: {
      accountType: EthAccountType.Eoa,
      accountId: 'account-id',
      assetId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x89',
      decimals: 6,
      image: 'https://example.com/usdc.png',
      name: 'USD Coin',
      symbol: 'USDC',
      balance: '12',
      rawBalance: '0xb7',
      fiat: { balance: 12, currency: 'USD', conversionRate: 1 },
      isNative: false,
    } as Asset,
  },
  experiences: [],
});

describe('EarnAssetIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNetworkImageSource.mockReturnValue({
      uri: 'https://example.com/polygon.png',
    });
  });

  it('passes metadata chain ID to network image and badge', () => {
    const asset = createEarnAsset();

    render(<EarnAssetIcon asset={asset} />);

    expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
      chainId: asset.metadata.chainId,
    });
    expect(mockBadgeNetwork).toHaveBeenCalledWith(
      expect.objectContaining({
        name: asset.metadata.chainId,
        src: { uri: 'https://example.com/polygon.png' },
        twClassName: 'rounded-1',
      }),
      undefined,
    );
  });

  it('passes metadata to AssetLogo without wallet balance fields', () => {
    const asset = createEarnAsset();

    render(<EarnAssetIcon asset={asset} />);

    expect(mockAssetLogo.mock.calls[0]?.[0]).toEqual({
      asset: asset.metadata,
    });
    expect(mockAssetLogo.mock.calls[0]?.[0].asset).not.toHaveProperty(
      'balance',
    );
    expect(mockAssetLogo.mock.calls[0]?.[0].asset).not.toHaveProperty(
      'rawBalance',
    );
    expect(mockBadgeWrapper).toHaveBeenCalled();
  });
});
