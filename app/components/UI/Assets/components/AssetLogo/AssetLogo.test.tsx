import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AssetLogo from './AssetLogo';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { getAssetImageUrl } from '../../../Bridge/hooks/useAssetMetadata/utils';

jest.mock('../../../Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn(),
}));

describe('AssetLogo', () => {
  const mockedGetAssetImageUrl = jest.mocked(getAssetImageUrl);

  const mockState = {
    engine: {
      backgroundState: {
        PreferencesController: {
          isIpfsGatewayEnabled: false,
        },
        MultichainNetworkController: {
          selectedMultichainNetworkChainId: undefined,
        },
      },
    },
  };

  beforeEach(() => {
    mockedGetAssetImageUrl.mockReset();
  });

  it('renders asset logo for non-native assets', () => {
    const asset = {
      decimals: 18,
      address: '0x456',
      chainId: '0x1',
      symbol: 'TEST',
      name: 'Test Token',
      balance: '1.23',
      balanceFiat: '$123.00',
      isNative: false,
      isETH: false,
      image: 'https://example.com/image.png',
      logo: 'https://example.com/logo.png',
      aggregators: [],
    };

    const { UNSAFE_getByType } = renderWithProvider(
      <AssetLogo asset={asset} />,
      {
        state: mockState,
      },
    );

    const assetAvatar = UNSAFE_getByType(AvatarToken);
    expect(assetAvatar.props).toStrictEqual({
      name: 'TEST',
      imageSource: {
        uri: 'https://example.com/image.png',
      },
      size: AvatarSize.Lg,
    });
  });

  it('renders asset logo for native asset', () => {
    const asset = {
      decimals: 18,
      address: '0x000',
      chainId: '0x1',
      symbol: 'ETH',
      ticker: 'ETH',
      name: 'Ethereum',
      balance: '1.23',
      balanceFiat: '$123.00',
      isNative: true,
      isETH: false,
      image: 'https://example.com/image.png',
      logo: '',
      aggregators: [],
    };

    const { UNSAFE_getByType } = renderWithProvider(
      <AssetLogo asset={asset} />,
      {
        state: mockState,
      },
    );

    const assetAvatar = UNSAFE_getByType(NetworkAssetLogo);
    expect(assetAvatar.props).toStrictEqual(
      expect.objectContaining({
        chainId: '0x1',
        ticker: 'ETH',
        big: false,
        biggest: false,
        testID: 'Ethereum',
      }),
    );
  });

  it('uses fallback image URL when image is an empty string', () => {
    const fallbackImageUrl = 'https://example.com/fallback.png';
    mockedGetAssetImageUrl.mockReturnValue(fallbackImageUrl);

    const asset = {
      decimals: 18,
      address: '0x456',
      chainId: '0x1',
      symbol: 'TEST',
      name: 'Test Token',
      balance: '1.23',
      balanceFiat: '$123.00',
      isNative: false,
      isETH: false,
      image: '',
      logo: 'https://example.com/logo.png',
      aggregators: [],
    };

    const { UNSAFE_getByType } = renderWithProvider(
      <AssetLogo asset={asset} />,
      {
        state: mockState,
      },
    );

    expect(mockedGetAssetImageUrl).toHaveBeenCalledWith('0x456', '0x1');

    const assetAvatar = UNSAFE_getByType(AvatarToken);
    expect(assetAvatar.props).toStrictEqual({
      name: 'TEST',
      imageSource: {
        uri: fallbackImageUrl,
      },
      size: AvatarSize.Lg,
    });
  });

  it('does not call fallback image utility for unsupported chainId', () => {
    const asset = {
      decimals: 18,
      address: '0x456',
      chainId: '1',
      symbol: 'TEST',
      name: 'Test Token',
      balance: '1.23',
      balanceFiat: '$123.00',
      isNative: false,
      isETH: false,
      image: '',
      logo: 'https://example.com/logo.png',
      aggregators: [],
    };

    const { UNSAFE_getByType } = renderWithProvider(
      <AssetLogo asset={asset} />,
      {
        state: mockState,
      },
    );

    expect(mockedGetAssetImageUrl).not.toHaveBeenCalled();

    const assetAvatar = UNSAFE_getByType(AvatarToken);
    expect(assetAvatar.props).toStrictEqual({
      name: 'TEST',
      imageSource: undefined,
      size: AvatarSize.Lg,
    });
  });
});
