import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Image } from 'expo-image';
import TrendingTokenLogo from './TrendingTokenLogo';

const mockHandleError = jest.fn();

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
    handleError: mockHandleError,
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

const ASSET_ID = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const PRIMARY_URI =
  'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png';
const FALLBACK_URI =
  'https://coin-images.coingecko.com/coins/images/1/large/token.png';

describe('TrendingTokenLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully with required props', () => {
    const { getByTestId } = render(
      <TrendingTokenLogo
        assetId={ASSET_ID}
        symbol="USDC"
        testID="token-logo"
      />,
    );

    expect(getByTestId('token-logo')).toBeTruthy();
  });

  it('renders Image component with computed primary URI from assetId', () => {
    const { UNSAFE_getByType } = render(
      <TrendingTokenLogo
        assetId={ASSET_ID}
        symbol="USDC"
        testID="with-image"
      />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toBe(PRIMARY_URI);
  });

  it('switches to fallbackImageUri when the primary URI errors', () => {
    const { UNSAFE_getByType } = render(
      <TrendingTokenLogo
        assetId={ASSET_ID}
        symbol="USDC"
        fallbackImageUri={FALLBACK_URI}
        testID="fallback-test"
      />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toBe(PRIMARY_URI);

    fireEvent(image, 'error');

    const updatedImage = UNSAFE_getByType(Image);
    expect(updatedImage.props.source.uri).toBe(FALLBACK_URI);
  });

  it('shows text fallback when both primary and fallback URIs error', () => {
    const { UNSAFE_getByType, getByText } = render(
      <TrendingTokenLogo
        assetId={ASSET_ID}
        symbol="USDC"
        fallbackImageUri={FALLBACK_URI}
        testID="both-error-test"
      />,
    );

    // First error: switch to fallback URI
    fireEvent(UNSAFE_getByType(Image), 'error');
    // Second error: exhaust all URIs
    fireEvent(UNSAFE_getByType(Image), 'error');

    expect(mockHandleError).toHaveBeenCalledTimes(1);
    expect(getByText('US')).toBeTruthy();
  });

  it('shows text fallback immediately when primary errors and no fallbackImageUri provided', () => {
    const { UNSAFE_getByType, getByText } = render(
      <TrendingTokenLogo
        assetId={ASSET_ID}
        symbol="USDC"
        testID="no-fallback-test"
      />,
    );

    fireEvent(UNSAFE_getByType(Image), 'error');

    expect(mockHandleError).toHaveBeenCalledTimes(1);
    expect(getByText('US')).toBeTruthy();
  });

  it('applies custom size and style props', () => {
    const customStyle = { opacity: 0.5 };
    const { getByTestId } = render(
      <TrendingTokenLogo
        assetId={ASSET_ID}
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
        assetId={ASSET_ID}
        symbol="USDC"
        testID="default-size"
      />,
    );

    expect(getByTestId('default-size')).toBeTruthy();
  });
});
