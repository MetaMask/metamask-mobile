import React from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AssetLogo from './AssetLogo';
import NetworkAssetLogo from '../../../NetworkAssetLogo';

describe('AssetLogo', () => {
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
      src: {
        uri: 'https://example.com/image.png',
      },
      size: AvatarTokenSize.Lg,
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
});
