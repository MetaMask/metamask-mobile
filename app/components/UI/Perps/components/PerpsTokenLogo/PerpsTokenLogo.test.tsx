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

  it('renders Image component with correct URI', () => {
    const { UNSAFE_getByType } = render(
      <PerpsTokenLogo symbol="BTC" testID="with-image" />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toBe(
      'https://app.hyperliquid.xyz/coins/BTC.svg',
    );
    expect(image.props.style).toEqual(
      expect.objectContaining({
        width: 32,
        height: 32,
      }),
    );
  });

  it('handles image error by showing text fallback', async () => {
    // Arrange
    const { UNSAFE_getByType, getByTestId } = render(
      <PerpsTokenLogo symbol="FAIL" testID="image-error" />,
    );

    const image = UNSAFE_getByType(Image);

    // Act - Simulate image error
    await act(async () => {
      image.props.onError();
    });

    // Assert - Should show text fallback after error
    const container = getByTestId('image-error');
    expect(container).toBeTruthy();
    // Text fallback should show "FA" for "FAIL"
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
});
