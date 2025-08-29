import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Image } from 'react-native';
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

// Store mocked components in variables to avoid require() in tests
let mockAvatar: jest.Mock;

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
  const ReactModule = require('react');
  const { View: ViewComponent } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
  mockAvatar = jest.fn(({ name, testID }) =>
    ReactModule.createElement(ViewComponent, {
      testID: testID || `avatar-${name}`,
    }),
  );
  return {
    __esModule: true,
    default: mockAvatar,
    AvatarSize: {
      Md: 'Md',
      Lg: 'Lg',
    },
    AvatarVariant: {
      Token: 'Token',
    },
  };
});

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

  it('shows Avatar fallback when no symbol is provided', async () => {
    render(<PerpsTokenLogo symbol="" testID="no-symbol" />);

    // Should render Avatar fallback immediately since empty symbol triggers hasError
    await waitFor(() => {
      expect(mockAvatar).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '',
          variant: 'Token',
        }),
        expect.anything(),
      );
    });
  });

  it('renders Image component with correct URI', () => {
    const { UNSAFE_getByType } = render(
      <PerpsTokenLogo symbol="BTC" testID="with-image" />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toBe(
      'https://app.hyperliquid.xyz/coins/BTC.png',
    );
    expect(image.props.style).toEqual(
      expect.objectContaining({
        width: 32,
        height: 32,
      }),
    );
  });

  it('handles image error by showing Avatar fallback', async () => {
    const { UNSAFE_getByType, rerender } = render(
      <PerpsTokenLogo symbol="FAIL" testID="image-error" />,
    );

    const image = UNSAFE_getByType(Image);

    // Simulate image error
    image.props.onError();

    // Force re-render to see the fallback
    rerender(<PerpsTokenLogo symbol="FAIL" testID="image-error" />);

    await waitFor(() => {
      expect(mockAvatar).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'FAIL',
          variant: 'Token',
        }),
        expect.anything(),
      );
    });
  });

  it('correctly determines avatar size based on numeric size prop', () => {
    // Test size 32 -> AvatarSize.Md
    const { rerender } = render(
      <PerpsTokenLogo symbol="" size={32} testID="size-32" />,
    );

    expect(mockAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 'Md',
      }),
      expect.anything(),
    );

    // Test size 40 -> AvatarSize.Lg
    mockAvatar.mockClear();
    rerender(<PerpsTokenLogo symbol="" size={40} testID="size-40" />);

    expect(mockAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 'Lg',
      }),
      expect.anything(),
    );

    // Test other size -> AvatarSize.Md (default)
    mockAvatar.mockClear();
    rerender(<PerpsTokenLogo symbol="" size={24} testID="size-24" />);

    expect(mockAvatar).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 'Md',
      }),
      expect.anything(),
    );
  });

  it('uses PNG format for image URLs', () => {
    const { UNSAFE_getByType } = render(
      <PerpsTokenLogo symbol="ETH" testID="png-format" />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toContain('.png');
    expect(image.props.source.uri).not.toContain('.svg');
  });

  it('converts symbol to uppercase in URL', () => {
    const { UNSAFE_getByType } = render(
      <PerpsTokenLogo symbol="btc" testID="uppercase-symbol" />,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toContain('BTC.png');
  });
});
