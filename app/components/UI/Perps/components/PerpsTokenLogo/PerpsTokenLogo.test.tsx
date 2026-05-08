import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Image } from 'expo-image';
import PerpsTokenLogo from './PerpsTokenLogo';

// PerpsTokenLogo now uses AvatarBase from MMDS with expo-image for image rendering

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

    // Component renders with the correct testID (sizing is handled internally by AvatarBase)
    expect(getByTestId('custom-logo')).toBeTruthy();
  });

  it('renders with default size when not specified', () => {
    const { getByTestId } = render(
      <PerpsTokenLogo symbol="ETH" testID="default-size" />,
    );

    // Component renders with the correct testID
    expect(getByTestId('default-size')).toBeTruthy();
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
    // Image fills the AvatarBase container (100%/100%)
    expect(image.props.style).toEqual(
      expect.objectContaining({
        width: '100%',
        height: '100%',
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
      fireEvent(image, 'error');
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
      fireEvent(image, 'error');
    });

    // Get image with fallback URL
    const fallbackImage = UNSAFE_getByType(Image);

    // Second error - both URLs failed, show text fallback
    await act(async () => {
      fireEvent(fallbackImage, 'error');
    });

    // Verify text fallback is shown
    const container = getByTestId('image-error');
    expect(container).toBeTruthy();
    // Image component no longer rendered, text fallback shown instead
    expect(UNSAFE_queryByType(Image)).toBeNull();
  });

  it('correctly renders with different size props', () => {
    const { rerender, getByTestId } = render(
      <PerpsTokenLogo symbol="" size={32} testID="size-32" />,
    );

    expect(getByTestId('size-32')).toBeTruthy();

    rerender(<PerpsTokenLogo symbol="" size={40} testID="size-40" />);
    expect(getByTestId('size-40')).toBeTruthy();

    rerender(<PerpsTokenLogo symbol="" size={24} testID="size-24" />);
    expect(getByTestId('size-24')).toBeTruthy();
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
      fireEvent(image, 'error');
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
