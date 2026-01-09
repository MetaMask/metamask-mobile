import { CryptoCurrency, Order, Provider } from '@consensys/on-ramp-sdk';
import { fireEvent, act } from '@testing-library/react-native';
import {
  DeepPartial,
  renderScreen,
} from '../../../../../../util/test/renderWithProvider';
import { RampSDK, SDK } from '../../sdk';
import Checkout from '.';
import Routes from '../../../../../../constants/navigation/Routes';
import { aggregatorOrderToFiatOrder } from '../../orderProcessor/aggregator';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

const mockHandleSuccessfulOrder = jest.fn();
jest.mock(
  '../../hooks/useHandleSuccessfulOrder',
  () => () => mockHandleSuccessfulOrder,
);

const mockSetOptions = jest.fn();
const mockPop = jest.fn();
const mockNavigation = {
  goBack: jest.fn(),
  setOptions: mockSetOptions,
  getParent: () => ({ pop: mockPop }),
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

const mockedSelectedAsset = {
  id: '1',
  idv2: '2',
  legacyId: 'legacy-1',
  network: {
    active: true,
    chainId: '137',
    chainName: 'Polygon',
    shortName: 'Polygon',
  },
  symbol: 'USDC',
  logo: 'logo',
  decimals: 6,
  address: '0x123',
  name: 'USD Coin',
  limits: ['1', '1000'],
  sellEnabled: true,
  assetId: 'asset-1',
} as CryptoCurrency;

const mockUseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedAddress: '0x123',
  selectedAsset: mockedSelectedAsset,
  sdkError: undefined,
  callbackBaseUrl: 'https://callback.test',
  isBuy: true,
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
  SDK: {
    orders: jest.fn().mockResolvedValue({
      getOrderFromCallback: jest.fn(),
    }),
  },
}));

const mockUseParams = jest.fn(() => ({
  url: 'https://test.url',
  customOrderId: 'test-order-id',
  provider: { id: 'test-provider', name: 'Test Provider' } as Provider,
}));

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

function render() {
  return renderScreen(Checkout, {
    name: Routes.RAMP.CHECKOUT,
  });
}

describe('Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
  });

  it('displays WebView when url is present and no errors', () => {
    const { toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays sell WebView when url is present and no errors', () => {
    mockUseRampSDKValues.isBuy = false;
    const { toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays sdkError when present', () => {
    mockUseRampSDKValues.sdkError = new Error('SDK Error');
    const { toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays and tracks error if no url or errors', () => {
    mockUseRampSDKValues.selectedAsset = undefined;
    mockUseParams.mockReturnValueOnce({
      url: '',
      customOrderId: 'test-order-id',
      provider: { id: 'test-provider', name: 'Test Provider' } as Provider,
    });
    const { toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'ONRAMP_ERROR',
      expect.any(Object),
    );
  });

  it('closes and tracks buy cancel event on bottom sheet close', () => {
    const { getByTestId } = render();
    const closeButton = getByTestId('checkout-close-button');
    act(() => {
      closeButton.props.onPress();
    });
    expect(mockTrackEvent).toHaveBeenCalledWith('ONRAMP_CANCELED', {
      chain_id_destination: '137',
      location: 'Provider Webview',
      provider_onramp: 'Test Provider',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('closes and tracks sell cancel event on bottom sheet close', () => {
    mockUseRampSDKValues.isBuy = false;
    const { getByTestId } = render();
    const closeButton = getByTestId('checkout-close-button');
    act(() => {
      closeButton.props.onPress();
    });
    expect(mockTrackEvent).toHaveBeenCalledWith('OFFRAMP_CANCELED', {
      chain_id_source: '137',
      location: 'Provider Webview',
      provider_offramp: 'Test Provider',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('closes and tracks buy cancel event on error bottom sheet close', () => {
    mockUseRampSDKValues.selectedAsset = undefined;
    mockUseParams.mockReturnValueOnce({
      url: '',
      customOrderId: 'test-order-id',
      provider: {
        id: 'test-provider',
        name: 'Test Provider',
      } as Provider,
    });
    const { getByTestId } = render();
    const closeButton = getByTestId('checkout-close-button');
    act(() => {
      closeButton.props.onPress();
    });
    expect(mockTrackEvent).toHaveBeenCalledWith('ONRAMP_CANCELED', {
      chain_id_destination: '',
      location: 'Provider Webview',
      provider_onramp: 'Test Provider',
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('sets and displays error on http error in WebView', async () => {
    const { getByTestId, toJSON, getByText } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onHttpError({
        nativeEvent: {
          statusCode: 500,
          description: 'Server Error',
          url: 'https://test.url',
        },
      });
    });
    expect(toJSON()).toMatchSnapshot();

    const tryAgainButton = getByText('Try again');
    expect(tryAgainButton).toBeDefined();
    act(() => {
      fireEvent.press(tryAgainButton);
    });
  });

  it('sets and displays error on http error in WebView for callback url', async () => {
    const { getByTestId, toJSON } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onHttpError({
        nativeEvent: {
          statusCode: 500,
          description: 'Server Error',
          url: 'https://callback.test',
        },
      });
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('ignores irrelevant error on http error in WebView for callback url', async () => {
    const { getByTestId, toJSON } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onHttpError({
        nativeEvent: {
          statusCode: 500,
          description: 'Server Error',
          url: 'https://irrelevant.url',
        },
      });
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('ignores irrelevant url navigation state changes', async () => {
    const { getByTestId } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onNavigationStateChange({
        url: 'https://irrelevant.url',
        loading: false,
      });
    });
    expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();
  });

  it('ignores url navigation state changes when is loading', async () => {
    const { getByTestId } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onNavigationStateChange({
        url: 'https://callback.test?success=true',
        loading: true,
      });
    });
    expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();
  });

  it('closes webview when url has no query params', async () => {
    const { getByTestId } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onNavigationStateChange({
        url: 'https://callback.test',
        loading: false,
      });
    });

    expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();
    expect(mockPop).toHaveBeenCalled();
  });

  it('sets error when handling url navigation state change and selectedAddress is undefined', async () => {
    mockUseRampSDKValues.selectedAddress = undefined;
    const { getByTestId, toJSON, getByText } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onNavigationStateChange({
        url: 'https://callback.test?success=true',
        loading: false,
      });
    });

    expect(toJSON()).toMatchSnapshot();
    expect(
      getByText('No wallet address was provided to continue'),
    ).toBeDefined();
  });

  it('handles successful buy order on url navigation state change', async () => {
    const mockOrder = {
      id: 'order-1',
      status: 'COMPLETED',
    };
    const mockGetOrderFromCallback = jest.fn().mockResolvedValue(mockOrder);
    (SDK.orders as jest.Mock).mockResolvedValueOnce({
      getOrderFromCallback: mockGetOrderFromCallback,
    });
    const { getByTestId } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onNavigationStateChange({
        url: 'https://callback.test?success=true',
        loading: false,
      });
    });

    expect(mockGetOrderFromCallback).toHaveBeenCalledWith(
      'test-provider',
      'https://callback.test?success=true',
      '0x123',
    );
    expect(mockHandleSuccessfulOrder).toHaveBeenCalledWith({
      ...aggregatorOrderToFiatOrder(mockOrder as Order),
      account: '0x123',
    });
  });

  it('handles successful sell order on url navigation state change', async () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseParams.mockReturnValueOnce({
      url: 'https://test.url',
      customOrderId: '',
      provider: { id: 'test-provider', name: 'Test Provider' } as Provider,
    });

    const mockSellOrder = {
      id: 'order-1',
      status: 'COMPLETED',
    };
    const mockGetSellOrderFromCallback = jest
      .fn()
      .mockResolvedValue(mockSellOrder);
    (SDK.orders as jest.Mock).mockResolvedValueOnce({
      getSellOrderFromCallback: mockGetSellOrderFromCallback,
    });
    const { getByTestId } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onNavigationStateChange({
        url: 'https://callback.test?success=true',
        loading: false,
      });
    });

    expect(mockGetSellOrderFromCallback).toHaveBeenCalledWith(
      'test-provider',
      'https://callback.test?success=true',
      '0x123',
    );
    expect(mockHandleSuccessfulOrder).toHaveBeenCalledWith({
      ...aggregatorOrderToFiatOrder(mockSellOrder as Order),
      account: '0x123',
    });
  });

  it('handles get order error gracefully', async () => {
    const mockGetOrderFromCallback = jest
      .fn()
      .mockRejectedValue(new Error('Get order error'));
    (SDK.orders as jest.Mock).mockResolvedValueOnce({
      getOrderFromCallback: mockGetOrderFromCallback,
    });
    const { getByTestId, toJSON } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onNavigationStateChange({
        url: 'https://callback.test?success=true',
        loading: false,
      });
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles undefined order gracefully', async () => {
    const mockGetOrderFromCallback = jest.fn().mockResolvedValue(undefined);
    (SDK.orders as jest.Mock).mockResolvedValueOnce({
      getOrderFromCallback: mockGetOrderFromCallback,
    });
    const { getByTestId, toJSON } = render();
    const webView = getByTestId('checkout-webview');
    await act(async () => {
      await webView.props.onNavigationStateChange({
        url: 'https://callback.test?success=true',
        loading: false,
      });
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
