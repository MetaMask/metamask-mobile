import React from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AssetLogo from './AssetLogo';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { TokenI } from '../../../Tokens/types';
import { getFallbackAssetImageUrls } from './AssetLogo.utils';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const ETHEREUM_HEX_CHAIN_ID = '0x1';
const NATIVE_ASSET_ADDRESS = '0x0000000000000000000000000000000000000000';

const defaultToken: TokenI = {
  decimals: 18,
  address: USDC_ADDRESS,
  chainId: ETHEREUM_HEX_CHAIN_ID,
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

const arrangeToken = (overrides: Partial<TokenI> = {}): TokenI => ({
  ...defaultToken,
  ...overrides,
});

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
    const asset = arrangeToken();

    const { UNSAFE_getByType } = renderWithProvider(
      <AssetLogo asset={asset} />,
      {
        state: mockState,
      },
    );

    const assetAvatar = UNSAFE_getByType(AvatarToken);
    expect(assetAvatar.props).toStrictEqual(
      expect.objectContaining({
        name: 'TEST',
        src: {
          uri: 'https://example.com/image.png',
        },
        size: AvatarTokenSize.Lg,
      }),
    );
  });

  it('renders asset logo for native asset', () => {
    const asset = arrangeToken({
      address: NATIVE_ASSET_ADDRESS,
      symbol: 'ETH',
      ticker: 'ETH',
      name: 'Ethereum',
      isNative: true,
      logo: '',
    });

    const { UNSAFE_getByType } = renderWithProvider(
      <AssetLogo asset={asset} />,
      {
        state: mockState,
      },
    );
    const assetAvatar = UNSAFE_getByType(NetworkAssetLogo);
    expect(assetAvatar.props).toStrictEqual(
      expect.objectContaining({
        chainId: ETHEREUM_HEX_CHAIN_ID,
        ticker: 'ETH',
        big: false,
        biggest: false,
        testID: 'Ethereum',
      }),
    );
  });

  it('uses fallback image URL when image is an empty string', () => {
    const fallbackImageUrl = getFallbackAssetImageUrls(
      ETHEREUM_HEX_CHAIN_ID,
      USDC_ADDRESS,
    )?.[0];
    const asset = arrangeToken({
      symbol: 'USDC',
      name: 'USD Coin',
      image: '',
    });

    const { UNSAFE_getByType } = renderWithProvider(
      <AssetLogo asset={asset} />,
      {
        state: mockState,
      },
    );

    const assetAvatar = UNSAFE_getByType(AvatarToken);
    expect(assetAvatar.props).toStrictEqual(
      expect.objectContaining({
        name: 'USDC',
        src: {
          uri: fallbackImageUrl,
        },
        size: AvatarTokenSize.Lg,
      }),
    );
  });

  it('renders empty image source when fallback utility returns undefined for unsupported chainId', () => {
    const asset = arrangeToken({
      chainId: '1',
      image: '',
    });

    const { UNSAFE_getByType } = renderWithProvider(
      <AssetLogo asset={asset} />,
      {
        state: mockState,
      },
    );

    const assetAvatar = UNSAFE_getByType(AvatarToken);
    expect(assetAvatar.props).toStrictEqual(
      expect.objectContaining({
        name: 'TEST',
        src: undefined,
        size: AvatarTokenSize.Lg,
      }),
    );
  });
});
