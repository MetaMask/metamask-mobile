import React from 'react';
import { Linking } from 'react-native';
import { act } from '@testing-library/react-native';
import WebviewModal from './WebviewModal';
import { useParams } from '../../../../../../../util/navigation/navUtils';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import Logger from '../../../../../../../util/Logger';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'WebviewModal',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

const mockWebViewProps = {
  onNavigationStateChange: jest.fn(),
  onHttpError: jest.fn(),
  onShouldStartLoadWithRequest: jest.fn(),
};

jest.mock('@metamask/react-native-webview', () => ({
  WebView: jest.fn(
    ({
      onNavigationStateChange,
      onHttpError,
      onShouldStartLoadWithRequest,
    }) => {
      mockWebViewProps.onNavigationStateChange = onNavigationStateChange;
      mockWebViewProps.onHttpError = onHttpError;
      mockWebViewProps.onShouldStartLoadWithRequest =
        onShouldStartLoadWithRequest;
      return null;
    },
  ),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
}));

describe('WebviewModal Component', () => {
  const mockHandleNavigationStateChange = jest.fn();
  const mockSourceUrl = 'https://example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      sourceUrl: mockSourceUrl,
      handleNavigationStateChange: mockHandleNavigationStateChange,
    });
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(WebviewModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should display error view when webview HTTP error occurs', () => {
    const { toJSON } = renderWithProvider(WebviewModal);

    act(() => {
      mockWebViewProps.onHttpError({
        nativeEvent: {
          url: mockSourceUrl,
          statusCode: 404,
        },
      });
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('should call handleNavigationStateChange with correct parameters when WebView navigation state changes', () => {
    renderWithProvider(WebviewModal);

    const mockNavigationState = {
      url: 'https://example.com/new-page',
      title: 'New Page',
      loading: false,
      canGoBack: true,
      canGoForward: false,
    };

    act(() => {
      mockWebViewProps.onNavigationStateChange(mockNavigationState);
    });

    expect(mockHandleNavigationStateChange).toHaveBeenCalledWith(
      mockNavigationState,
    );
  });

  it('should deduplicate navigation state changes for the same URL', () => {
    renderWithProvider(WebviewModal);

    const mockNavigationState = {
      url: 'https://example.com/same-page',
      title: 'Same Page',
      loading: false,
      canGoBack: true,
      canGoForward: false,
    };

    act(() => {
      mockWebViewProps.onNavigationStateChange(mockNavigationState);
    });

    act(() => {
      mockWebViewProps.onNavigationStateChange(mockNavigationState);
    });

    expect(mockHandleNavigationStateChange).toHaveBeenCalledTimes(1);
    expect(mockHandleNavigationStateChange).toHaveBeenCalledWith(
      mockNavigationState,
    );

    // Call with a different URL
    const differentNavigationState = {
      ...mockNavigationState,
      url: 'https://example.com/different-page',
    };

    act(() => {
      mockWebViewProps.onNavigationStateChange(differentNavigationState);
    });

    expect(mockHandleNavigationStateChange).toHaveBeenCalledTimes(2);
    expect(mockHandleNavigationStateChange).toHaveBeenLastCalledWith(
      differentNavigationState,
    );
  });

  describe('onShouldStartLoadWithRequest', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);
    });

    it('opens UPI payment URL via Linking and blocks webview navigation', async () => {
      renderWithProvider(WebviewModal);

      const result = mockWebViewProps.onShouldStartLoadWithRequest({
        url: 'upi://pay?pa=company@ypbiz&cu=INR&am=1100.00',
      });

      expect(result).toBe(false);

      await act(async () => {
        await new Promise(process.nextTick);
      });

      expect(Linking.canOpenURL).toHaveBeenCalledWith(
        'upi://pay?pa=company@ypbiz&cu=INR&am=1100.00',
      );
      expect(Linking.openURL).toHaveBeenCalledWith(
        'upi://pay?pa=company@ypbiz&cu=INR&am=1100.00',
      );
    });

    it('opens Paytm payment URL via Linking and blocks webview navigation', async () => {
      renderWithProvider(WebviewModal);

      const result = mockWebViewProps.onShouldStartLoadWithRequest({
        url: 'paytmmp://pay?pa=company@ypbiz&cu=INR&am=1100.00',
      });

      expect(result).toBe(false);

      await act(async () => {
        await new Promise(process.nextTick);
      });

      expect(Linking.canOpenURL).toHaveBeenCalledWith(
        'paytmmp://pay?pa=company@ypbiz&cu=INR&am=1100.00',
      );
      expect(Linking.openURL).toHaveBeenCalledWith(
        'paytmmp://pay?pa=company@ypbiz&cu=INR&am=1100.00',
      );
    });

    it('opens PhonePe payment URL via Linking and blocks webview navigation', async () => {
      renderWithProvider(WebviewModal);

      const result = mockWebViewProps.onShouldStartLoadWithRequest({
        url: 'phonepe://pay?pa=company@ypbiz&cu=INR&am=1100.00',
      });

      expect(result).toBe(false);

      await act(async () => {
        await new Promise(process.nextTick);
      });

      expect(Linking.canOpenURL).toHaveBeenCalledWith(
        'phonepe://pay?pa=company@ypbiz&cu=INR&am=1100.00',
      );
      expect(Linking.openURL).toHaveBeenCalledWith(
        'phonepe://pay?pa=company@ypbiz&cu=INR&am=1100.00',
      );
    });

    it('opens Google Pay payment URL via Linking and blocks webview navigation', async () => {
      renderWithProvider(WebviewModal);

      const result = mockWebViewProps.onShouldStartLoadWithRequest({
        url: 'gpay://upi/pay?pa=company@ypbiz&cu=INR&am=1100.00',
      });

      expect(result).toBe(false);

      await act(async () => {
        await new Promise(process.nextTick);
      });

      expect(Linking.canOpenURL).toHaveBeenCalledWith(
        'gpay://upi/pay?pa=company@ypbiz&cu=INR&am=1100.00',
      );
      expect(Linking.openURL).toHaveBeenCalledWith(
        'gpay://upi/pay?pa=company@ypbiz&cu=INR&am=1100.00',
      );
    });

    it('allows HTTPS URLs to load in webview', () => {
      renderWithProvider(WebviewModal);

      const result = mockWebViewProps.onShouldStartLoadWithRequest({
        url: 'https://example.com/payment',
      });

      expect(Linking.canOpenURL).not.toHaveBeenCalled();
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('allows HTTP URLs to load in webview', () => {
      renderWithProvider(WebviewModal);

      const result = mockWebViewProps.onShouldStartLoadWithRequest({
        url: 'http://example.com/payment',
      });

      expect(Linking.canOpenURL).not.toHaveBeenCalled();
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('logs error when Linking.canOpenURL fails', async () => {
      const mockError = new Error('Failed to check URL');
      (Linking.canOpenURL as jest.Mock).mockRejectedValueOnce(mockError);
      const mockLoggerError = jest.spyOn(Logger, 'error');

      renderWithProvider(WebviewModal);

      const result = mockWebViewProps.onShouldStartLoadWithRequest({
        url: 'upi://pay?pa=company@ypbiz',
      });

      expect(result).toBe(false);

      await act(async () => {
        await new Promise(process.nextTick);
      });

      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'Failed to open payment URL: upi://pay?pa=company@ypbiz',
      );
    });

    it('logs error when Linking.openURL fails', async () => {
      const mockError = new Error('Failed to open URL');
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(mockError);
      const mockLoggerError = jest.spyOn(Logger, 'error');

      renderWithProvider(WebviewModal);

      const result = mockWebViewProps.onShouldStartLoadWithRequest({
        url: 'upi://pay?pa=company@ypbiz',
      });

      expect(result).toBe(false);

      await act(async () => {
        await new Promise(process.nextTick);
      });

      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'Failed to open payment URL: upi://pay?pa=company@ypbiz',
      );
    });
  });
});
