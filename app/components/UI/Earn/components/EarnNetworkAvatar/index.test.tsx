import React from 'react';
import { render } from '@testing-library/react-native';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { getFallbackAssetImageUrls } from '../../../Assets/components/AssetLogo/AssetLogo.utils';
import { EarnNetworkAvatar } from './index';
import { TokenI } from '../../../Tokens/types';

// Mock the hooks and components
jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      networkAvatar: {
        height: 32,
        width: 32,
        flexShrink: 0,
      },
    },
  }),
}));

jest.mock('../../../NetworkAssetLogo', () => 'NetworkAssetLogo');

describe('EarnNetworkAvatar', () => {
  const mockNativeToken: TokenI = {
    address: '0x',
    aggregators: [],
    decimals: 18,
    image: '',
    name: 'Ethereum',
    symbol: 'ETH',
    balance: '0',
    logo: undefined,
    isETH: true,
    isNative: true,
    chainId: '1',
    ticker: 'ETH',
  };

  const mockNonNativeToken: TokenI = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    aggregators: [],
    decimals: 6,
    image: 'https://example.com/usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: '0',
    logo: undefined,
    isETH: false,
    isNative: false,
    chainId: '0x1',
  };

  it('renders NetworkAssetLogo for native tokens', () => {
    const { getByTestId } = render(
      <EarnNetworkAvatar token={mockNativeToken} />,
    );

    const networkAssetLogo = getByTestId('earn-token-list-item-ETH-1');
    expect(networkAssetLogo.props).toEqual({
      chainId: '1',
      ticker: 'ETH',
      big: false,
      biggest: true,
      testID: 'earn-token-list-item-ETH-1',
      style: {
        height: 32,
        width: 32,
        flexShrink: 0,
      },
    });
  });

  it('renders the token image for non-native tokens', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <EarnNetworkAvatar token={mockNonNativeToken} />,
    );

    expect(UNSAFE_getByType(AvatarToken).props).toEqual(
      expect.objectContaining({
        name: 'USDC',
        src: { uri: 'https://example.com/usdc.png' },
        size: AvatarTokenSize.Md,
        testID: 'earn-token-avatar-USDC',
      }),
    );
  });

  it('falls back to the CDN icon when the token carries no image', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <EarnNetworkAvatar token={{ ...mockNonNativeToken, image: '' }} />,
    );

    expect(UNSAFE_getByType(AvatarToken).props.src).toEqual({
      uri: getFallbackAssetImageUrls(
        mockNonNativeToken.chainId,
        mockNonNativeToken.address,
      )?.[0],
    });
  });

  it('handles undefined chainId and ticker for native tokens', () => {
    const tokenWithUndefinedProps: TokenI = {
      ...mockNativeToken,
      chainId: undefined,
      ticker: undefined,
    };

    const { getByTestId } = render(
      <EarnNetworkAvatar token={tokenWithUndefinedProps} />,
    );

    const networkAssetLogo = getByTestId('earn-token-list-item-ETH-undefined');
    expect(networkAssetLogo.props).toEqual({
      chainId: '',
      ticker: '',
      big: false,
      biggest: true,
      testID: 'earn-token-list-item-ETH-undefined',
      style: {
        height: 32,
        width: 32,
        flexShrink: 0,
      },
    });
  });
});
