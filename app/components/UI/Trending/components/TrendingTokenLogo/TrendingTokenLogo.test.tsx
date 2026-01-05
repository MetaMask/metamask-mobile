import React from 'react';
import { render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import TrendingTokenLogo from './TrendingTokenLogo';

jest.mock('../../../../hooks/useTokenLogo', () => ({
  useTokenLogo: jest.fn(() => ({
    isLoading: false,
    hasError: false,
    containerStyle: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    loadingContainerStyle: {
      position: 'absolute',
      width: 44,
      height: 44,
    },
    imageStyle: {
      width: 44,
      height: 44,
    },
    fallbackTextStyle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#000000',
    },
    handleLoadStart: jest.fn(),
    handleLoadEnd: jest.fn(),
    handleError: jest.fn(),
  })),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

describe('TrendingTokenLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully with required props', () => {
    const { getByTestId } = render(
      <TrendingTokenLogo
        assetId="eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        symbol="USDC"
        testID="token-logo"
      />,
    );

    expect(getByTestId('token-logo')).toBeTruthy();
  });

  it('renders Image component with correct URI from assetId', () => {
    const assetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const { UNSAFE_getByType } = render(
      <TrendingTokenLogo assetId={assetId} symbol="USDC" testID="with-image" />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toBe(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    );
  });

  it('applies custom size and style props', () => {
    const customStyle = { opacity: 0.5 };
    const { getByTestId } = render(
      <TrendingTokenLogo
        assetId="eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        symbol="USDC"
        size={40}
        style={customStyle}
        testID="custom-logo"
      />,
    );

    const container = getByTestId('custom-logo');
    expect(container.props.style).toEqual(
      expect.arrayContaining([customStyle]),
    );
  });

  it('renders with default size when not specified', () => {
    const { getByTestId } = render(
      <TrendingTokenLogo
        assetId="eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        symbol="USDC"
        testID="default-size"
      />,
    );

    const container = getByTestId('default-size');
    expect(container).toBeTruthy();
  });
});
