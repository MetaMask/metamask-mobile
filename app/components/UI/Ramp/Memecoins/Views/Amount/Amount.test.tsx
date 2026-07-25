import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Amount from './Amount';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOnMessage = jest.fn();
const mockInjectJavaScript = jest.fn();
const mockTokenLocator = 'solana:7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      tokenLocator: mockTokenLocator,
      chain: 'solana',
      name: 'XMEME',
      symbol: 'XMEME',
      imageUrl:
        'https://arweave.net/VQrPjACwnQRmxdKBTqNwPiyo65x7LAT773t8Kd7YBzw',
    },
  }),
}));

jest.mock('../../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: () => 'EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448',
}));

jest.mock('../../hooks/useMemecoinMarketData', () => ({
  useMemecoinMarketData: () => ({
    marketDataByLocator: {
      [mockTokenLocator]: {
        price: 0.00598,
        priceChange1d: -0.01,
        marketCap: 458_600_000,
        name: 'XMEME',
        symbol: 'XMEME',
        imageUrl:
          'https://arweave.net/VQrPjACwnQRmxdKBTqNwPiyo65x7LAT773t8Kd7YBzw',
      },
    },
    isMarketDataLoading: false,
  }),
}));

jest.mock('../../crossmint/api', () => ({
  createCrossmintOrder: jest.fn().mockResolvedValue({
    order: { orderId: 'order-1' },
    clientSecret: 'secret-1',
  }),
  getCrossmintOrder: jest.fn().mockResolvedValue({
    orderId: 'order-1',
    payment: { status: 'awaiting-payment' },
  }),
}));

jest.mock('../../crossmint/buildCheckoutUrl', () => ({
  buildCrossmintCheckoutUrl: jest.fn(
    () =>
      'https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=1',
  ),
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
      ref: React.Ref<{ injectJavaScript: (script: string) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        injectJavaScript: mockInjectJavaScript,
      }));
      mockOnMessage.mockImplementation((data: string) => {
        props.onMessage?.({ nativeEvent: { data } });
      });
      return <View testID={props.testID ?? 'webview'} />;
    },
  );
  MockWebView.displayName = 'MockWebView';
  return { WebView: MockWebView };
});

jest.mock('../../../../../Base/Keypad', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="mock-keypad">
        <Text>Keypad</Text>
      </View>
    ),
  };
});

jest.mock('../../../../Trending/components/TrendingTokenRowItem/utils', () => ({
  getNetworkBadgeSource: () => ({ uri: 'solana-badge' }),
}));

function emitCheckoutMessage(payload: unknown) {
  act(() => {
    mockOnMessage(JSON.stringify(payload));
  });
}

async function flushPrepare() {
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('Memecoins Amount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders FOMO quote layout with presets and buy CTA', () => {
    const { getByTestId, getByText } = render(<Amount />);

    expect(getByTestId('memecoins-apple-pay-button')).toBeOnTheScreen();
    expect(getByTestId('memecoins-amount-value')).toBeOnTheScreen();
    expect(getByTestId('memecoins-amount-preset-100')).toBeOnTheScreen();
    expect(getByText('$0 fee')).toBeOnTheScreen();
  });

  it('shows the Crossmint Apple Pay WebView once the order is prepared', async () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = render(
      <Amount />,
    );

    expect(getByText('Preparing Apple Pay…')).toBeOnTheScreen();
    expect(queryByTestId('memecoins-checkout-webview')).toBeNull();

    await flushPrepare();

    await waitFor(() => {
      expect(getByTestId('memecoins-checkout-webview')).toBeOnTheScreen();
    });
    expect(queryByText('Confirm purchase')).toBeNull();
  });

  it('does not show a MetaMask confirm modal around Apple Pay', async () => {
    const { getByTestId, queryByText } = render(<Amount />);

    await flushPrepare();
    await waitFor(() => {
      expect(getByTestId('memecoins-checkout-webview')).toBeOnTheScreen();
    });

    expect(queryByText('Confirm purchase')).toBeNull();
    expect(queryByText('Tap Apple Pay below')).toBeNull();
    expect(mockInjectJavaScript).not.toHaveBeenCalled();
  });

  it('shows processing after payment starts', async () => {
    const { getByTestId } = render(<Amount />);

    await flushPrepare();
    await waitFor(() => {
      expect(getByTestId('memecoins-checkout-webview')).toBeOnTheScreen();
    });

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
  });

  it('shows success after payment completes', async () => {
    const { getByTestId } = render(<Amount />);

    await flushPrepare();
    await waitFor(() => {
      expect(getByTestId('memecoins-checkout-webview')).toBeOnTheScreen();
    });

    emitCheckoutMessage({
      event: 'order:updated',
      data: {
        order: {
          orderId: 'order-1',
          payment: { status: 'in-progress' },
        },
      },
    });

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
  });

  it('shows failure page when payment fails', async () => {
    const { getByTestId, getByText } = render(<Amount />);

    await flushPrepare();
    await waitFor(() => {
      expect(getByTestId('memecoins-checkout-webview')).toBeOnTheScreen();
    });

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
    expect(getByTestId('memecoins-amount-value')).toBeOnTheScreen();
  });
});
