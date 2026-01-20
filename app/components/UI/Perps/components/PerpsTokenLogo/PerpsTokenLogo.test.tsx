import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Image } from 'expo-image';
import PerpsTokenLogo from './PerpsTokenLogo';

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

// Note: Avatar component is no longer used in PerpsTokenLogo
// The component now uses a simple text-based fallback instead

describe('PerpsTokenLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const { getByTestId } = render(
      <PerpsTokenLogo symbol="BTC" testID="token-logo" />,
    );
    expect(getByTestId('token-logo')).toBeTruthy();
  });

  it('applies custom size and style props', () => {
    const customStyle = { opacity: 0.5 };
    const { getByTestId } = render(
      <PerpsTokenLogo
        symbol="BTC"
        size={40}
        style={customStyle}
        testID="custom-logo"
      />,
    );

    const container = getByTestId('custom-logo');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 40,
          height: 40,
          borderRadius: 20,
        }),
        customStyle,
      ]),
    );
  });

  it('renders with default size when not specified', () => {
    const { getByTestId } = render(
      <PerpsTokenLogo symbol="ETH" testID="default-size" />,
    );

    const container = getByTestId('default-size');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 32,
          height: 32,
          borderRadius: 16,
        }),
      ]),
    );
  });

  it('shows text fallback when no symbol is provided', () => {
    const { getByTestId } = render(
      <PerpsTokenLogo symbol="" testID="no-symbol" />,
    );

    // Should render text fallback immediately since empty symbol triggers fallback
    const container = getByTestId('no-symbol');
    expect(container).toBeTruthy();
    // Empty symbol results in empty fallback text
  });

  it('renders Image component with primary MetaMask URL initially', () => {
    const { UNSAFE_getByType } = render(
      <PerpsTokenLogo symbol="BTC" testID="with-image" />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toBe(
      'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/icons/eip155:999/BTC.svg',
    );
    expect(image.props.style).toEqual(
      expect.objectContaining({
        width: 32,
        height: 32,
      }),
    );
  });

  it('switches to fallback HyperLiquid URL when primary fails', async () => {
    const { UNSAFE_getByType } = render(
      <PerpsTokenLogo symbol="BTC" testID="fallback-test" />,
    );

    const image = UNSAFE_getByType(Image);

    // Verify initial URL is primary (MetaMask)
    expect(image.props.source.uri).toContain('contract-metadata');

    // Simulate primary URL error
    await act(async () => {
      image.props.onError();
    });

    // Get updated image after error
    const updatedImage = UNSAFE_getByType(Image);

    // Verify fallback URL is now used (HyperLiquid)
    expect(updatedImage.props.source.uri).toBe(
      'https://app.hyperliquid.xyz/coins/BTC.svg',
    );
  });

  it('shows text fallback when both primary and fallback URLs fail', async () => {
    const { UNSAFE_getByType, UNSAFE_queryByType, getByTestId } = render(
      <PerpsTokenLogo symbol="FAIL" testID="image-error" />,
    );

    const image = UNSAFE_getByType(Image);

    // First error - switches to fallback URL
    await act(async () => {
      image.props.onError();
    });

    // Get image with fallback URL
    const fallbackImage = UNSAFE_getByType(Image);

    // Second error - both URLs failed, show text fallback
    await act(async () => {
      fallbackImage.props.onError();
    });

    // Verify text fallback is shown
    const container = getByTestId('image-error');
    expect(container).toBeTruthy();
    // Image component no longer rendered, text fallback shown instead
    expect(UNSAFE_queryByType(Image)).toBeNull();
  });

  it('correctly applies size prop to container', () => {
    // Test size 32
    const { rerender, getByTestId } = render(
      <PerpsTokenLogo symbol="" size={32} testID="size-32" />,
    );

    const container32 = getByTestId('size-32');
    expect(container32.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 32,
          height: 32,
          borderRadius: 16,
        }),
      ]),
    );

    // Test size 40
    rerender(<PerpsTokenLogo symbol="" size={40} testID="size-40" />);

    const container40 = getByTestId('size-40');
    expect(container40.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 40,
          height: 40,
          borderRadius: 20,
        }),
      ]),
    );

    // Test size 24
    rerender(<PerpsTokenLogo symbol="" size={24} testID="size-24" />);

    const container24 = getByTestId('size-24');
    expect(container24.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 24,
          height: 24,
          borderRadius: 12,
        }),
      ]),
    );
  });

  it('uses SVG format for image URLs', () => {
    const { UNSAFE_getByType } = render(
      <PerpsTokenLogo symbol="ETH" testID="svg-format" />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toContain('.svg');
    expect(image.props.source.uri).not.toContain('.png');
  });

  it('converts symbol to uppercase in URL', () => {
    const { UNSAFE_getByType } = render(
      <PerpsTokenLogo symbol="btc" testID="uppercase-symbol" />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toContain('BTC.svg');
  });

  it('resets to primary URL when symbol changes', async () => {
    const { UNSAFE_getByType, rerender } = render(
      <PerpsTokenLogo symbol="BTC" testID="symbol-change" />,
    );

    const image = UNSAFE_getByType(Image);

    // Trigger error to switch to fallback
    await act(async () => {
      image.props.onError();
    });

    // Verify fallback is being used
    expect(UNSAFE_getByType(Image).props.source.uri).toContain(
      'app.hyperliquid.xyz',
    );

    // Change symbol
    rerender(<PerpsTokenLogo symbol="ETH" testID="symbol-change" />);

    // Verify primary URL is used for new symbol
    const newImage = UNSAFE_getByType(Image);
    expect(newImage.props.source.uri).toContain('contract-metadata');
    expect(newImage.props.source.uri).toContain('ETH.svg');
  });
});
