/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DaimoPayModal from './DaimoPayModal';
import { DaimoPayModalSelectors } from './DaimoPayModal.testIds';
import DaimoPayService from '../../services/DaimoPayService';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockGetParent = jest.fn(() => ({
  dispatch: mockDispatch,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    getParent: mockGetParent,
  }),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    payId: 'test-pay-id',
    fromUpgrade: false,
    orderId: 'test-order-id',
  }),
}));

jest.mock('../../services/DaimoPayService', () => ({
  __esModule: true,
  default: {
    buildWebViewUrl: jest.fn(() => 'https://pay.daimo.com/test'),
    pollPaymentStatus: jest.fn(),
    isValidMessageOrigin: jest.fn(() => true),
    shouldLoadInWebView: jest.fn((url: string) => url.includes('daimo.com')),
  },
}));

jest.mock('../../../../../core/BackgroundBridge/BackgroundBridge', () =>
  jest.fn(() => ({
    sendNotificationEip1193: jest.fn(),
    onDisconnect: jest.fn(),
    onMessage: jest.fn(),
    url: 'https://pay.daimo.com',
  })),
);

jest.mock('../../../../../core/EntryScriptWeb3', () => ({
  get: jest.fn().mockResolvedValue('// mock entry script'),
}));

jest.mock('../../../../../core/RPCMethods/RPCMethodMiddleware', () => ({
  getRpcMethodMiddleware: jest.fn(() => ({})),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PermissionController: {
      state: {},
    },
  },
}));

jest.mock('../../../../../core/Permissions', () => ({
  getPermittedEvmAddressesByHostname: jest.fn(() => []),
}));

jest.mock('../../sdk', () => ({
  useCardSDK: () => ({
    sdk: null,
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

jest.mock('../../util/getDaimoEnvironment', () => ({
  getDaimoEnvironment: jest.fn(() => 'demo'),
}));

const mockStore = configureStore({
  reducer: {
    engine: () => ({
      backgroundState: {
        PermissionController: {},
      },
    }),
    card: () => ({
      isDaimoDemo: false,
    }),
  },
});

const renderWithProvider = (component: React.ReactElement) =>
  render(<Provider store={mockStore}>{component}</Provider>);

describe('DaimoPayModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders WebView when no error', async () => {
    const { getByTestId } = renderWithProvider(<DaimoPayModal />);

    await waitFor(() => {
      expect(getByTestId(DaimoPayModalSelectors.CONTAINER)).toBeTruthy();
      expect(getByTestId(DaimoPayModalSelectors.WEBVIEW)).toBeTruthy();
    });
  });

  it('builds correct webview URL from payId', () => {
    renderWithProvider(<DaimoPayModal />);

    expect(DaimoPayService.buildWebViewUrl).toHaveBeenCalledWith('test-pay-id');
  });

  describe('error handling', () => {
    it('displays error view when error state is set', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onError();
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.ERROR_TEXT)).toBeTruthy();
        expect(getByTestId(DaimoPayModalSelectors.CLOSE_BUTTON)).toBeTruthy();
        expect(getByTestId(DaimoPayModalSelectors.RETRY_BUTTON)).toBeTruthy();
      });
    });

    it('allows retry after error', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onError();
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.RETRY_BUTTON)).toBeTruthy();
      });

      fireEvent.press(getByTestId(DaimoPayModalSelectors.RETRY_BUTTON));

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.WEBVIEW)).toBeTruthy();
      });
    });

    it('closes modal when close button pressed in error state', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onError();
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.CLOSE_BUTTON)).toBeTruthy();
      });

      fireEvent.press(getByTestId(DaimoPayModalSelectors.CLOSE_BUTTON));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('handles daimo-pay modalClosed event', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'daimo-pay',
              type: 'modalClosed',
            }),
          },
        });
      });

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('handles daimo-pay modalOpened event', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'daimo-pay',
              type: 'modalOpened',
            }),
          },
        });
      });

      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('handles daimo-pay paymentStarted event', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'daimo-pay',
              type: 'paymentStarted',
            }),
          },
        });
      });

      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('ignores messages exceeding MAX_MESSAGE_LENGTH', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);
      const longMessage = 'a'.repeat(100001);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: longMessage,
          },
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('ignores invalid JSON messages', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: 'invalid json',
          },
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('URL loading', () => {
    it('allows Daimo URLs to load in webview', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      const result = webView.props.onShouldStartLoadWithRequest({
        url: 'https://pay.daimo.com/checkout',
      });

      expect(result).toBe(true);
    });

    it('opens external URLs via Linking', async () => {
      const { Linking } = require('react-native');
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      const result = webView.props.onShouldStartLoadWithRequest({
        url: 'https://external-site.com/page',
      });

      expect(result).toBe(false);
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://external-site.com/page',
      );
    });
  });
});
