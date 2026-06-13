import React from 'react';
import { render } from '@testing-library/react-native';
import { AvatarTokenSize } from '@metamask/design-system-react-native';
import { EarnNetworkAvatar } from './index';
import { TokenI } from '../../../Tokens/types';

jest.mock('@metamask/design-system-react-native', () => ({
  AvatarToken: jest.fn(() => null),
  AvatarTokenSize: {
    Xs: 'xs',
    Sm: 'sm',
    Md: 'md',
    Lg: 'lg',
    Xl: 'xl',
  },
}));

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

const { AvatarToken } = jest.requireMock('@metamask/design-system-react-native');

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
    address: '0x123',
    aggregators: [],
    decimals: 6,
    image: 'https://example.com/usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: '0',
    logo: undefined,
    isETH: false,
    isNative: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('renders MMDS AvatarToken for non-native tokens', () => {
    render(<EarnNetworkAvatar token={mockNonNativeToken} />);

    expect(AvatarToken).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'USDC',
        src: { uri: 'https://example.com/usdc.png' },
        size: AvatarTokenSize.Md,
        twClassName: 'h-8 w-8 shrink-0',
        testID: 'earn-token-avatar-USDC',
      }),
      undefined,
    );
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
