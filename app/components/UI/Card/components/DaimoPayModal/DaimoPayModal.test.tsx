import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import DaimoPayModal from './DaimoPayModal';
import { DaimoPayModalSelectors } from '../../../../../../e2e/selectors/Card/DaimoPayModal.selectors';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    payId: 'test-pay-id-123',
  }),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    CARD_VIEWED: 'Card Viewed',
    CARD_BUTTON_CLICKED: 'Card Button Clicked',
  },
}));

jest.mock('../../services/DaimoPayService', () => ({
  __esModule: true,
  default: {
    buildWebViewUrl: jest.fn(
      (payId: string) =>
        `https://miniapp.daimo.com/metamask/embed?payId=${payId}&paymentOptions=Metamask`,
    ),
    parseWebViewEvent: jest.fn((data: string) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed?.source === 'daimo-pay') {
          return parsed;
        }
        return null;
      } catch {
        return null;
      }
    }),
    shouldLoadInWebView: jest.fn((url: string) =>
      url.includes('miniapp.daimo.com'),
    ),
    isProduction: jest.fn(() => false),
    pollPaymentStatus: jest.fn(),
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
    };
    return map[key] || key;
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
    color: jest.fn(() => '#000'),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');

  return {
    Text: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(RNText, props, children),
    TextVariant: {
      BodyMd: 'BodyMd',
    },
    FontWeight: {
      Regular: 'Regular',
    },
  };
});

// Mock WebView
let mockOnMessage: ((event: { nativeEvent: { data: string } }) => void) | null =
  null;
let mockOnError: (() => void) | null = null;
let mockOnShouldStartLoadWithRequest:
  | ((request: { url: string }) => boolean)
  | null = null;

jest.mock('@metamask/react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    WebView: React.forwardRef(
      (
        props: {
          onMessage?: (event: { nativeEvent: { data: string } }) => void;
          onError?: () => void;
          onShouldStartLoadWithRequest?: (request: { url: string }) => boolean;
          testID?: string;
          source?: { uri: string };
        },
        _ref: React.Ref<unknown>,
      ) => {
        mockOnMessage = props.onMessage || null;
        mockOnError = props.onError || null;
        mockOnShouldStartLoadWithRequest =
          props.onShouldStartLoadWithRequest || null;

        return React.createElement(View, {
          testID: props.testID,
          'data-source': props.source?.uri,
        });
      },
    ),
  };
});

describe('DaimoPayModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnMessage = null;
    mockOnError = null;
    mockOnShouldStartLoadWithRequest = null;
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  describe('Render', () => {
    it('renders container and WebView', () => {
      const { getByTestId } = render(<DaimoPayModal />);

      expect(getByTestId(DaimoPayModalSelectors.CONTAINER)).toBeTruthy();
      expect(getByTestId(DaimoPayModalSelectors.WEBVIEW)).toBeTruthy();
    });

    it('displays error message when WebView fails to load', async () => {
      const { getByTestId } = render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnError) {
          mockOnError();
        }
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.ERROR_TEXT)).toBeTruthy();
      });
    });
  });

  describe('Interactions', () => {
    it('opens external URLs via Linking', () => {
      render(<DaimoPayModal />);

      if (mockOnShouldStartLoadWithRequest) {
        const result = mockOnShouldStartLoadWithRequest({
          url: 'https://metamask.io/download',
        });

        expect(result).toBe(false);
        expect(Linking.openURL).toHaveBeenCalledWith(
          'https://metamask.io/download',
        );
      }
    });

    it('allows Daimo URLs to load in WebView', () => {
      render(<DaimoPayModal />);

      if (mockOnShouldStartLoadWithRequest) {
        const result = mockOnShouldStartLoadWithRequest({
          url: 'https://miniapp.daimo.com/metamask/embed?payId=123',
        });

        expect(result).toBe(true);
        expect(Linking.openURL).not.toHaveBeenCalled();
      }
    });
  });

  describe('WebView Events', () => {
    it('handles modalClosed event by navigating back', async () => {
      render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            nativeEvent: {
              data: JSON.stringify({
                source: 'daimo-pay',
                version: 1,
                type: 'modalClosed',
                payload: {},
              }),
            },
          });
        }
      });

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('handles paymentCompleted event in demo mode', async () => {
      render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            nativeEvent: {
              data: JSON.stringify({
                source: 'daimo-pay',
                version: 1,
                type: 'paymentCompleted',
                payload: {
                  txHash: '0x123',
                  chainId: 59144,
                },
              }),
            },
          });
        }
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ORDER_COMPLETED,
        expect.objectContaining({
          paymentMethod: 'crypto',
          transactionHash: '0x123',
        }),
      );
    });

    it('displays error when paymentBounced event received', async () => {
      const { getByTestId } = render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            nativeEvent: {
              data: JSON.stringify({
                source: 'daimo-pay',
                version: 1,
                type: 'paymentBounced',
                payload: {},
              }),
            },
          });
        }
      });

      await waitFor(() => {
        expect(getByTestId(DaimoPayModalSelectors.ERROR_TEXT)).toBeTruthy();
      });
    });

    it('ignores non-Daimo events', async () => {
      render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            nativeEvent: {
              data: JSON.stringify({
                source: 'other-source',
                type: 'someEvent',
              }),
            },
          });
        }
      });

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Analytics', () => {
    it('tracks modalClosed event', async () => {
      render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            nativeEvent: {
              data: JSON.stringify({
                source: 'daimo-pay',
                version: 1,
                type: 'modalClosed',
                payload: {},
              }),
            },
          });
        }
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action: CardActions.DAIMO_PAY_CLOSED,
        screen: CardScreens.DAIMO_PAY,
      });
    });

    it('tracks modalOpened event', async () => {
      render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            nativeEvent: {
              data: JSON.stringify({
                source: 'daimo-pay',
                version: 1,
                type: 'modalOpened',
                payload: {},
              }),
            },
          });
        }
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.DAIMO_PAY,
      });
    });

    it('tracks paymentStarted event', async () => {
      render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            nativeEvent: {
              data: JSON.stringify({
                source: 'daimo-pay',
                version: 1,
                type: 'paymentStarted',
                payload: {},
              }),
            },
          });
        }
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action: CardActions.DAIMO_PAYMENT_STARTED,
        screen: CardScreens.DAIMO_PAY,
      });
    });

    it('tracks paymentCompleted event', async () => {
      render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            nativeEvent: {
              data: JSON.stringify({
                source: 'daimo-pay',
                version: 1,
                type: 'paymentCompleted',
                payload: {
                  txHash: '0x123',
                  chainId: 59144,
                },
              }),
            },
          });
        }
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action: CardActions.DAIMO_PAYMENT_COMPLETED,
        screen: CardScreens.DAIMO_PAY,
        transaction_hash: '0x123',
        chain_id: 59144,
      });
    });

    it('tracks paymentBounced event', async () => {
      render(<DaimoPayModal />);

      await act(async () => {
        if (mockOnMessage) {
          mockOnMessage({
            nativeEvent: {
              data: JSON.stringify({
                source: 'daimo-pay',
                version: 1,
                type: 'paymentBounced',
                payload: {},
              }),
            },
          });
        }
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action: CardActions.DAIMO_PAYMENT_BOUNCED,
        screen: CardScreens.DAIMO_PAY,
        error: undefined,
      });
    });
  });
});
