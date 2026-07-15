/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DaimoPayModal from './DaimoPayModal';
import { DaimoPayModalSelectors } from './DaimoPayModal.testIds';
import DaimoPayService from '../../services/DaimoPayService';
import Routes from '../../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockGetParent = jest.fn<{ dispatch: jest.Mock } | null, []>(() => ({
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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.daimo_pay_modal.load_error':
        'Failed to load payment page. Please try again.',
      'card.daimo_pay_modal.timeout_error':
        'Payment verification timed out. Please check your transaction status.',
      'card.daimo_pay_modal.payment_bounced_error':
        'Payment failed. Please try again with a different payment method.',
      'card.daimo_pay_modal.close': 'Close',
      'card.daimo_pay_modal.try_again': 'Try again',
    };
    return map[key] || key;
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

jest.mock('../../../../../core/EntryScriptWeb3', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(''),
  },
}));

jest.mock('../../../../../util/browserScripts', () => ({
  SPA_urlChangeListener: '',
}));

jest.mock('../../../../../core/BackgroundBridge/BackgroundBridge', () =>
  jest.fn(() => ({
    sendNotificationEip1193: jest.fn(),
    onDisconnect: jest.fn(),
    onMessage: jest.fn(),
    url: 'https://pay.daimo.com',
  })),
);

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

  describe('payment completion', () => {
    it('handles paymentCompleted event in demo mode and navigates to success', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'daimo-pay',
              type: 'paymentCompleted',
              payload: {
                txHash: '0x123abc',
                chainId: 1,
              },
            }),
          },
        });
      });

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockGetParent).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('handles paymentBounced event and shows error', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'daimo-pay',
              type: 'paymentBounced',
              payload: {
                errorMessage: 'Payment failed',
              },
            }),
          },
        });
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.ERROR_TEXT)).toBeTruthy();
      });

      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('handles paymentBounced event with error field', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'daimo-pay',
              type: 'paymentBounced',
              payload: {
                error: 'Transaction reverted',
              },
            }),
          },
        });
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.ERROR_TEXT)).toBeTruthy();
      });
    });

    it('handles paymentBounced event with reason field', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'daimo-pay',
              type: 'paymentBounced',
              payload: {
                reason: 'Insufficient funds',
              },
            }),
          },
        });
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.ERROR_TEXT)).toBeTruthy();
      });
    });
  });

  describe('webview lifecycle', () => {
    it('initializes background bridge on load end', async () => {
      const BackgroundBridge = require('../../../../../core/BackgroundBridge/BackgroundBridge');

      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onLoadEnd();
      });

      await waitFor(() => {
        expect(BackgroundBridge).toHaveBeenCalled();
      });
    });

    it('handles http error', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onHttpError();
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.ERROR_TEXT)).toBeTruthy();
      });
    });
  });

  describe('message filtering', () => {
    it('ignores messages from invalid origins', async () => {
      (DaimoPayService.isValidMessageOrigin as jest.Mock).mockReturnValueOnce(
        false,
      );

      const BackgroundBridge = require('../../../../../core/BackgroundBridge/BackgroundBridge');
      const mockOnMessage = jest.fn();
      BackgroundBridge.mockImplementationOnce(() => ({
        sendNotificationEip1193: jest.fn(),
        onDisconnect: jest.fn(),
        onMessage: mockOnMessage,
        url: 'https://pay.daimo.com',
      }));

      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              name: 'metamask-provider',
              origin: 'https://malicious-site.com',
            }),
          },
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('ignores non-object messages', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify(null),
          },
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('ignores string-only messages', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify('just a string'),
          },
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('navigation fallback', () => {
    it('navigates directly when parentNavigator is null', async () => {
      mockGetParent.mockReturnValueOnce(null);

      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'daimo-pay',
              type: 'paymentCompleted',
              payload: {
                txHash: '0x123abc',
                chainId: 1,
              },
            }),
          },
        });
      });

      expect(mockGetParent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ORDER_COMPLETED,
        expect.objectContaining({
          paymentMethod: 'crypto',
          transactionHash: '0x123abc',
          fromUpgrade: false,
        }),
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('backgroundBridge messages', () => {
    it('processes bridge messages with name property', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onLoadEnd();
      });

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              name: 'metamask-provider',
              data: { method: 'eth_accounts' },
            }),
          },
        });
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('paymentBounced without error details', () => {
    it('uses default error message when no error details provided', async () => {
      const { getByTestId } = renderWithProvider(<DaimoPayModal />);

      const webView = getByTestId(DaimoPayModalSelectors.WEBVIEW);

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              source: 'daimo-pay',
              type: 'paymentBounced',
              payload: {},
            }),
          },
        });
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.ERROR_TEXT)).toBeTruthy();
      });
    });
  });
});
