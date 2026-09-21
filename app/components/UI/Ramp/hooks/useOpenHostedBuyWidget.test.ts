import { renderHook, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { useOpenHostedBuyWidget } from './useOpenHostedBuyWidget';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('./useRampsController', () => ({
  useRampsController: jest.fn(),
}));

jest.mock('../../../../util/device', () => {
  const mockIsAndroid = jest.fn(() => false);
  return {
    __esModule: true,
    default: {
      isAndroid: mockIsAndroid,
      isIos: jest.fn(() => true),
    },
    isAndroid: mockIsAndroid,
    isIos: jest.fn(() => true),
  };
});

jest.mock('react-native-inappbrowser-reborn', () => ({
  __esModule: true,
  default: {
    openAuth: jest.fn(),
    closeAuth: jest.fn(),
    isAvailable: jest.fn(),
  },
  openAuth: jest.fn(),
  closeAuth: jest.fn(),
  isAvailable: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

jest.mock('../../../../util/navigation/navUtils', () => ({
  resetWithRoutes: (
    navigation: { reset: (state: unknown) => void },
    state: unknown,
  ) => navigation.reset(state),
}));

const mockUseRampsController = jest.requireMock('./useRampsController')
  .useRampsController as jest.Mock;
const mockDeviceIsAndroid = jest.requireMock('../../../../util/device')
  .isAndroid as jest.Mock;
const mockLinkingOpenURL = jest.requireMock(
  'react-native/Libraries/Linking/Linking',
).default.openURL as jest.Mock;
const mockInAppBrowser = jest.requireMock('react-native-inappbrowser-reborn')
  .default as {
  openAuth: jest.Mock;
  closeAuth: jest.Mock;
  isAvailable: jest.Mock;
};

const mockNavigationReset = jest.fn();
const mockAddPrecreatedOrder = jest.fn();

const BASE_PARAMS = {
  url: 'https://pay.example.com/checkout',
  redirectUrl: 'metamask://on-ramp/providers/moonpay',
  providerCode: 'moonpay',
  orderId: 'ord-123',
  walletAddress: '0x1234567890123456789012345678901234567890',
  chainId: 'eip155:1',
};

describe('useOpenHostedBuyWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceIsAndroid.mockReturnValue(false);
    mockLinkingOpenURL.mockResolvedValue(undefined);
    mockUseRampsController.mockReturnValue({
      addPrecreatedOrder: mockAddPrecreatedOrder,
    });
    (useNavigation as jest.Mock).mockReturnValue({
      reset: mockNavigationReset,
      navigate: jest.fn(),
      setParams: jest.fn(),
      goBack: jest.fn(),
    });
  });

  it('opens the URL via Linking and resets to BuildQuote on Android', async () => {
    mockDeviceIsAndroid.mockReturnValue(true);

    const { result } = renderHook(() => useOpenHostedBuyWidget());

    await act(async () => {
      await result.current.openHostedBuyWidget(BASE_PARAMS);
    });

    expect(mockLinkingOpenURL).toHaveBeenCalledWith(BASE_PARAMS.url);
    expect(mockInAppBrowser.openAuth).not.toHaveBeenCalled();
    expect(mockNavigationReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.RAMP.BUILD_QUOTE, params: {} }],
    });
  });

  it('resets to order details after a successful in-app browser auth on iOS', async () => {
    mockDeviceIsAndroid.mockReturnValue(false);
    mockInAppBrowser.isAvailable.mockResolvedValue(true);
    mockInAppBrowser.openAuth.mockResolvedValue({
      type: 'success',
      url: 'metamask://on-ramp/providers/moonpay?orderId=ord-123',
    });

    const { result } = renderHook(() => useOpenHostedBuyWidget());

    await act(async () => {
      await result.current.openHostedBuyWidget(BASE_PARAMS);
    });

    expect(mockInAppBrowser.openAuth).toHaveBeenCalledWith(
      BASE_PARAMS.url,
      BASE_PARAMS.redirectUrl,
    );
    expect(mockInAppBrowser.closeAuth).toHaveBeenCalled();
    expect(mockNavigationReset).toHaveBeenCalledWith({
      index: 0,
      routes: [
        {
          name: Routes.RAMP.RAMPS_ORDER_DETAILS,
          params: {
            callbackUrl: 'metamask://on-ramp/providers/moonpay?orderId=ord-123',
            providerCode: 'moonpay',
            walletAddress: BASE_PARAMS.walletAddress,
            showCloseButton: true,
          },
        },
      ],
    });
  });

  it('resets to BuildQuote when the in-app browser auth is cancelled', async () => {
    mockDeviceIsAndroid.mockReturnValue(false);
    mockInAppBrowser.isAvailable.mockResolvedValue(true);
    mockInAppBrowser.openAuth.mockResolvedValue({ type: 'cancel' });

    const { result } = renderHook(() => useOpenHostedBuyWidget());

    await act(async () => {
      await result.current.openHostedBuyWidget(BASE_PARAMS);
    });

    expect(mockInAppBrowser.closeAuth).toHaveBeenCalled();
    expect(mockNavigationReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.RAMP.BUILD_QUOTE, params: {} }],
    });
  });

  it('registers a precreated order when orderId, walletAddress and chainId are all present', async () => {
    mockDeviceIsAndroid.mockReturnValue(true);

    const { result } = renderHook(() => useOpenHostedBuyWidget());

    await act(async () => {
      await result.current.openHostedBuyWidget(BASE_PARAMS);
    });

    expect(mockAddPrecreatedOrder).toHaveBeenCalledWith({
      orderId: 'ord-123',
      providerCode: 'moonpay',
      walletAddress: BASE_PARAMS.walletAddress,
      chainId: '1',
    });
  });

  it('does not register a precreated order when orderId is missing', async () => {
    mockDeviceIsAndroid.mockReturnValue(true);

    const { result } = renderHook(() => useOpenHostedBuyWidget());

    await act(async () => {
      await result.current.openHostedBuyWidget({
        ...BASE_PARAMS,
        orderId: undefined,
      });
    });

    expect(mockAddPrecreatedOrder).not.toHaveBeenCalled();
  });

  it('does not register a precreated order when walletAddress is missing', async () => {
    mockDeviceIsAndroid.mockReturnValue(true);

    const { result } = renderHook(() => useOpenHostedBuyWidget());

    await act(async () => {
      await result.current.openHostedBuyWidget({
        ...BASE_PARAMS,
        walletAddress: undefined,
      });
    });

    expect(mockAddPrecreatedOrder).not.toHaveBeenCalled();
  });

  it('does not register a precreated order when chainId is missing', async () => {
    mockDeviceIsAndroid.mockReturnValue(true);

    const { result } = renderHook(() => useOpenHostedBuyWidget());

    await act(async () => {
      await result.current.openHostedBuyWidget({
        ...BASE_PARAMS,
        chainId: undefined,
      });
    });

    expect(mockAddPrecreatedOrder).not.toHaveBeenCalled();
  });
});
