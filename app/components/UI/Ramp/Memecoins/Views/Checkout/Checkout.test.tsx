import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import Checkout from './Checkout';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOnMessage = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      checkoutUrl:
        'https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=1',
      orderId: 'order-1',
      tokenName: 'Pudgy Penguins',
      tokenSymbol: 'PENGU',
      amountUsd: '100',
      imageUrl: 'https://example.com/pengu.png',
    },
  }),
}));

jest.mock('@metamask/react-native-webview', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockWebView = ReactActual.forwardRef(
    (
      props: {
        testID?: string;
        onMessage?: (event: { nativeEvent: { data: string } }) => void;
      },
      _ref: unknown,
    ) => {
      mockOnMessage.mockImplementation((data: string) => {
        props.onMessage?.({ nativeEvent: { data } });
      });
      return <View testID={props.testID ?? 'webview'} />;
    },
  );
  MockWebView.displayName = 'MockWebView';
  return { WebView: MockWebView };
});

function emitCheckoutMessage(payload: unknown) {
  act(() => {
    mockOnMessage(JSON.stringify(payload));
  });
}

describe('Memecoins Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders Apple Pay sheet with checkout webview', () => {
    const { getByTestId, getByText } = render(<Checkout />);

    expect(getByTestId('memecoins-checkout-screen')).toBeOnTheScreen();
    expect(getByTestId('memecoins-checkout-webview')).toBeOnTheScreen();
    expect(getByText('Preparing Apple Pay…')).toBeOnTheScreen();
  });

  it('shows processing then success after payment completes', () => {
    const { getByTestId, queryByTestId } = render(<Checkout />);

    emitCheckoutMessage({
      event: 'order:updated',
      data: {
        order: {
          orderId: 'order-1',
          payment: { status: 'in-progress' },
        },
      },
    });

    expect(getByTestId('memecoins-checkout-processing')).toBeOnTheScreen();

    emitCheckoutMessage({
      event: 'order:updated',
      data: {
        order: {
          orderId: 'order-1',
          payment: { status: 'completed' },
        },
      },
    });

    expect(getByTestId('memecoins-checkout-success')).toBeOnTheScreen();
    expect(queryByTestId('memecoins-checkout-processing')).toBeNull();
  });

  it('shows failure page when payment fails', () => {
    const { getByTestId, getByText } = render(<Checkout />);

    emitCheckoutMessage({
      event: 'order:updated',
      data: {
        order: {
          orderId: 'order-1',
          payment: {
            failureReason: { message: 'Card declined' },
          },
        },
      },
    });

    expect(getByTestId('memecoins-checkout-error')).toBeOnTheScreen();
    expect(getByText('Card declined')).toBeOnTheScreen();

    fireEvent.press(getByText('Try again'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
