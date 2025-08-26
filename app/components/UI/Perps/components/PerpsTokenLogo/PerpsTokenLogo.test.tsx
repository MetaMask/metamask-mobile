import React from 'react';
import { render } from '@testing-library/react-native';
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

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => `Avatar-${name}`,
  AvatarSize: {
    Md: 'Md',
    Lg: 'Lg',
  },
  AvatarVariant: {
    Token: 'Token',
  },
}));

jest.mock('react-native-svg', () => ({
  SvgXml: ({ xml, onError }: { xml: string; onError?: () => void }) => {
    // Simulate error for specific test case
    if (xml === 'error-svg') {
      onError?.();
    }
    return `SvgXml-${xml ? xml.substring(0, 30) : ''}`;
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('PerpsTokenLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
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
    const { findByText } = render(
      <PerpsTokenLogo symbol="" testID="no-symbol" />,
    );

    // Should render Avatar fallback
    const avatar = await findByText(/Avatar-/);
    expect(avatar).toBeTruthy();
  });

  it('fetches and renders SVG content successfully', async () => {
    const mockSvgContent = '<svg><circle cx="50" cy="50" r="40"/></svg>';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce(mockSvgContent),
    });

    const { findByText } = render(
      <PerpsTokenLogo symbol="BTC" testID="with-svg" />,
    );

    // Should render SvgXml with the fetched content
    const svgElement = await findByText(/SvgXml-<svg>/);
    expect(svgElement).toBeTruthy();
  });

  it('shows Avatar fallback when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    );

    const { findByText } = render(
      <PerpsTokenLogo symbol="FAIL" testID="fetch-error" />,
    );

    // Should render Avatar fallback
    const avatar = await findByText('Avatar-FAIL');
    expect(avatar).toBeTruthy();
  });

  it('shows Avatar fallback when SVG content is invalid', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce('not valid svg content'),
    });

    const { findByText } = render(
      <PerpsTokenLogo symbol="INVALID" testID="invalid-svg" />,
    );

    // Should render Avatar fallback
    const avatar = await findByText('Avatar-INVALID');
    expect(avatar).toBeTruthy();
  });

  it('handles SvgXml onError callback', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce('error-svg'),
    });

    const { findByText } = render(
      <PerpsTokenLogo symbol="ERROR" testID="svg-error" />,
    );

    // Should trigger onError and render Avatar fallback
    const avatar = await findByText('Avatar-ERROR');
    expect(avatar).toBeTruthy();
  });

  it('uses cached SVG on subsequent renders', async () => {
    const mockSvgContent = '<svg><rect width="100" height="100"/></svg>';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce(mockSvgContent),
    });

    // First render - should fetch
    const { rerender, findByText } = render(
      <PerpsTokenLogo symbol="CACHED" testID="cached-1" />,
    );
    await findByText(/SvgXml-<svg>/);

    // Second render - should use cache
    rerender(<PerpsTokenLogo symbol="CACHED" testID="cached-2" />);

    // Fetch should only be called once
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
