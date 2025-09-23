import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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
let mockSvgXml: jest.Mock;

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

jest.mock('react-native-svg', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
  const ReactModule = require('react');
  const { View: ViewComponent } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
  mockSvgXml = jest.fn(({ testID }) =>
    ReactModule.createElement(ViewComponent, { testID: testID || 'svg-xml' }),
  );
  return {
    SvgXml: mockSvgXml,
  };
});

// Mock fetch globally
global.fetch = jest.fn();

describe('PerpsTokenLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders loading state initially', () => {
    // Mock a pending fetch to keep it in loading state
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(() => {
          // Never resolves to keep in loading state
        }),
    );

    const { getByTestId } = render(
      <PerpsTokenLogo symbol="BTC" testID="token-logo" />,
    );
    expect(getByTestId('token-logo')).toBeTruthy();
  });

  it('applies custom size and style props', () => {
    // Mock a pending fetch to keep it in loading state
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(() => {
          // Never resolves to keep in loading state
        }),
    );

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
    // Mock a pending fetch to keep it in loading state
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(() => {
          // Never resolves to keep in loading state
        }),
    );

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

  it('fetches and renders SVG content successfully', async () => {
    const mockSvgContent = '<svg><circle cx="50" cy="50" r="40"/></svg>';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce(mockSvgContent),
    });

    render(<PerpsTokenLogo symbol="BTC" testID="with-svg" />);

    // Should render SvgXml with the fetched content
    await waitFor(() => {
      expect(mockSvgXml).toHaveBeenCalledWith(
        expect.objectContaining({
          xml: expect.stringContaining('<svg>'),
          width: 32,
          height: 32,
        }),
        expect.anything(),
      );
    });
  });

  it('shows Avatar fallback when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    );

    render(<PerpsTokenLogo symbol="FAIL" testID="fetch-error" />);

    // Should render Avatar fallback
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

  it('shows Avatar fallback when SVG content is invalid', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce('not valid svg content'),
    });

    render(<PerpsTokenLogo symbol="INVALID" testID="invalid-svg" />);

    // Should render Avatar fallback
    await waitFor(() => {
      expect(mockAvatar).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'INVALID',
          variant: 'Token',
        }),
        expect.anything(),
      );
    });
  });

  it('handles non-200 HTTP responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<PerpsTokenLogo symbol="NOTFOUND" testID="not-found" />);

    await waitFor(() => {
      expect(mockAvatar).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'NOTFOUND',
        }),
        expect.anything(),
      );
    });
  });

  it('handles SvgXml onError callback', async () => {
    const mockSvgContent = '<svg><rect width="100" height="100"/></svg>';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce(mockSvgContent),
    });

    const { rerender } = render(
      <PerpsTokenLogo symbol="ERROR" testID="svg-error" />,
    );

    await waitFor(() => {
      expect(mockSvgXml).toHaveBeenCalled();
    });

    // Get the onError callback and call it
    const lastCall = mockSvgXml.mock.calls[mockSvgXml.mock.calls.length - 1];
    lastCall?.[0]?.onError?.();

    // Force re-render to trigger Avatar fallback
    rerender(<PerpsTokenLogo symbol="ERROR" testID="svg-error" />);

    await waitFor(() => {
      expect(mockAvatar).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ERROR',
        }),
        expect.anything(),
      );
    });
  });

  it('uses cached SVG on subsequent renders', async () => {
    const mockSvgContent = '<svg><rect width="100" height="100"/></svg>';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: jest.fn().mockResolvedValueOnce(mockSvgContent),
    });

    // First render - should fetch
    const { rerender } = render(
      <PerpsTokenLogo symbol="CACHED" testID="cached-1" />,
    );

    await waitFor(() => {
      expect(mockSvgXml).toHaveBeenCalled();
    });

    // Clear mocks but not the internal cache
    mockSvgXml.mockClear();
    (global.fetch as jest.Mock).mockClear();

    // Second render - should use cache
    rerender(<PerpsTokenLogo symbol="CACHED" testID="cached-2" />);

    await waitFor(() => {
      expect(mockSvgXml).toHaveBeenCalled();
    });

    // Fetch should not be called again since it uses cache
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles abort when component unmounts', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(() => {
          // Never resolves to simulate long fetch
        }),
    );

    const { unmount } = render(
      <PerpsTokenLogo symbol="ABORT" testID="abort-test" />,
    );

    // Unmount immediately
    unmount();

    // Verify no errors occurred - the mocks should not be called for rendering final state
    // since the component unmounted before the fetch completed

    // The component should show loading state and then unmount
    // Neither Avatar nor SvgXml should be rendered after unmount
    expect(mockAvatar).not.toHaveBeenCalled();
    expect(mockSvgXml).not.toHaveBeenCalled();
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
});
