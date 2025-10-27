// Mock dependencies first
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(),
}));

jest.mock('@metamask/react-native-webview', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    WebView: ({
      testID,
      containerStyle,
      source,
      ...props
    }: {
      testID?: string;
      containerStyle?: unknown;
      source?: { uri: string };
      [key: string]: unknown;
    }) =>
      React.createElement(View, {
        testID,
        style: containerStyle,
        'data-source': source?.uri,
        ...props,
      }),
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import KYCWebview from './KYCWebview';

describe('KYCWebview', () => {
  let mockUseParams: jest.Mock;
  let mockUseTailwind: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useTailwind
    mockUseTailwind = jest.fn().mockReturnValue({
      style: jest.fn((styles: string) => ({ testStyle: styles })),
    });
    (useTailwind as jest.Mock).mockImplementation(mockUseTailwind);

    // Default mock for useParams
    mockUseParams = jest.fn().mockReturnValue({
      url: 'https://example.com/kyc',
    });
    (useParams as jest.Mock).mockImplementation(mockUseParams);
  });

  describe('render', () => {
    it('renders WebView with correct testID', () => {
      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView).toBeTruthy();
    });

    it('renders WebView with correct URL from params', () => {
      const testUrl = 'https://test-kyc-url.com/verification';
      mockUseParams.mockReturnValue({
        url: testUrl,
      });

      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView.props['data-source']).toBe(testUrl);
    });

    it('applies correct container style from Tailwind', () => {
      const mockStyle = { flex: 1, backgroundColor: 'white' };
      mockUseTailwind.mockReturnValue({
        style: jest.fn(() => mockStyle),
      });

      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView.props.style).toEqual(mockStyle);
    });
  });

  describe('when URL parameter is provided', () => {
    it('passes the URL to WebView source', () => {
      const kycUrl = 'https://kyc-provider.com/session/12345';
      mockUseParams.mockReturnValue({
        url: kycUrl,
      });

      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView.props['data-source']).toBe(kycUrl);
    });

    it('handles HTTPS URLs correctly', () => {
      const httpsUrl = 'https://secure-kyc.example.com/verify';
      mockUseParams.mockReturnValue({
        url: httpsUrl,
      });

      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView.props['data-source']).toBe(httpsUrl);
    });

    it('handles URLs with query parameters', () => {
      const urlWithParams =
        'https://kyc.example.com/verify?session=abc123&redirect=true';
      mockUseParams.mockReturnValue({
        url: urlWithParams,
      });

      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView.props['data-source']).toBe(urlWithParams);
    });
  });

  describe('when URL parameter is missing', () => {
    it('handles undefined URL gracefully', () => {
      mockUseParams.mockReturnValue({
        url: undefined,
      });

      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView.props['data-source']).toBeUndefined();
    });

    it('handles empty URL string', () => {
      mockUseParams.mockReturnValue({
        url: '',
      });

      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView.props['data-source']).toBe('');
    });

    it('handles null URL', () => {
      mockUseParams.mockReturnValue({
        url: null,
      });

      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView.props['data-source']).toBeNull();
    });
  });

  describe('when useParams returns no data', () => {
    it('handles empty params object', () => {
      mockUseParams.mockReturnValue({});

      const { getByTestId } = render(<KYCWebview />);

      const webView = getByTestId('kyc-webview');
      expect(webView.props['data-source']).toBeUndefined();
    });

    it('handles null params', () => {
      mockUseParams.mockReturnValue(null);

      // This will throw because the component tries to destructure url from null
      expect(() => render(<KYCWebview />)).toThrow();
    });
  });

  describe('Tailwind integration', () => {
    it('calls useTailwind hook', () => {
      render(<KYCWebview />);

      expect(mockUseTailwind).toHaveBeenCalledTimes(1);
    });

    it('applies flex-1 style to WebView container', () => {
      const mockTailwindInstance = {
        style: jest.fn((className: string) => {
          if (className === 'flex-1') {
            return { flex: 1 };
          }
          return {};
        }),
      };
      mockUseTailwind.mockReturnValue(mockTailwindInstance);

      render(<KYCWebview />);

      expect(mockTailwindInstance.style).toHaveBeenCalledWith('flex-1');
    });
  });

  describe('component structure', () => {
    it('renders only WebView component', () => {
      const { getByTestId, queryByTestId } = render(<KYCWebview />);

      // Should have the WebView
      expect(getByTestId('kyc-webview')).toBeTruthy();

      // Should not have any other test IDs (no additional UI elements)
      expect(queryByTestId('loading-indicator')).toBeNull();
      expect(queryByTestId('error-message')).toBeNull();
      expect(queryByTestId('header')).toBeNull();
    });
  });
});
