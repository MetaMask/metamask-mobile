import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { merge } from 'lodash';
import { Order, OrderStatusEnum, Provider } from '@consensys/on-ramp-sdk';
import BuyAction from '@consensys/on-ramp-sdk/dist/regions/BuyAction';
import { BuyWidgetInformation } from '@consensys/on-ramp-sdk/dist/API';
import { type RampSDK, SDK } from '../sdk';
import useInAppBrowser from './useInAppBrowser';
import {
  addFiatCustomIdData,
  removeFiatCustomIdData,
} from '../../../../../reducers/fiatOrders';
import { createCustomOrderIdData } from '../orderProcessor/customOrderId';
import { setLockTime } from '../../../../../actions/settings';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import Logger from '../../../../../util/Logger';
import initialRootState from '../../../../../util/test/initial-root-state';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

jest.mock('react-native-inappbrowser-reborn');
jest.mocked(InAppBrowser.isAvailable).mockResolvedValue(true);

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

const mockHandleSuccessfulOrder = jest.fn();
jest.mock('./useHandleSuccessfulOrder', () => () => mockHandleSuccessfulOrder);

const mockUseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedAddress: 'mocked-selected-address',
  selectedPaymentMethodId: 'mocked-payment-method-id',
  selectedAsset: {
    symbol: 'mocked-asset-symbol',
  },
  selectedChainId: '56',
  isBuy: true,
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

const testCallbackBaseDeeplink = 'test://test-callback-base-deeplink/';

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
  SDK: {
    orders: jest.fn().mockResolvedValue({
      getOrderFromCallback: jest.fn(),
      getSellOrderFromCallback: jest.fn(),
    }),
  },
  callbackBaseDeeplink: testCallbackBaseDeeplink,
}));

const defaultState = merge({}, initialRootState, {
  settings: {
    lockTime: 35000,
  },
});

const buyAction = {
  createWidget: jest.fn().mockResolvedValue({ url: 'test-url' }),
} as unknown as BuyAction;

const testProvider = {
  id: 'test-provider-id',
  name: 'test-provider-name',
} as unknown as Provider;

const mockedResultUrl = 'https://test.url';
jest.mocked(InAppBrowser.openAuth).mockResolvedValue({
  type: 'success',
  url: mockedResultUrl,
});

describe('useInAppBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
  });

  it('returns render in app browser function', async () => {
    const { result } = renderHookWithProvider(() => useInAppBrowser(), {
      state: defaultState,
    });
    expect(result.current).toBeInstanceOf(Function);
  });

  describe('renderInAppBrowser', () => {
    afterEach(() => {
      jest.unmock('react-native/Libraries/Utilities/Platform');
      jest.restoreAllMocks();
    });

    it('calls buyAction.createWidget with correct deeplinkRedirectUrl', async () => {
      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      const testAmount = 100;
      const testFiatSymbol = 'TEST';
      await result.current(buyAction, testProvider, testAmount, testFiatSymbol);
      expect(buyAction.createWidget).toHaveBeenCalledWith(
        `${testCallbackBaseDeeplink}on-ramp${testProvider.id}`,
      );
    });

    it('creates and dispatches addFiatCustomIdData if customOrderId is returned for buy', async () => {
      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      jest.mocked(buyAction.createWidget).mockResolvedValueOnce({
        url: 'test-url',
        orderId: 'test-order-id',
      } as BuyWidgetInformation);

      await result.current(buyAction, testProvider);

      expect(mockDispatch).toHaveBeenCalledWith(
        addFiatCustomIdData(
          createCustomOrderIdData(
            'test-order-id',
            '56',
            'mocked-selected-address',
            'BUY',
          ),
        ),
      );
    });

    it('uses selectedAsset network chainId for custom order when available', async () => {
      mockUseRampSDKValues.selectedAsset = {
        network: { chainId: '137' },
        symbol: 'USDC',
      };

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      jest.mocked(buyAction.createWidget).mockResolvedValueOnce({
        url: 'test-url',
        orderId: 'test-order-id',
      } as BuyWidgetInformation);

      await result.current(buyAction, testProvider);

      expect(mockDispatch).toHaveBeenCalledWith(
        addFiatCustomIdData(
          createCustomOrderIdData(
            'test-order-id',
            '137',
            'mocked-selected-address',
            'BUY',
          ),
        ),
      );
    });

    it('falls back to selectedChainId when selectedAsset network is not available', async () => {
      mockUseRampSDKValues.selectedAsset = {
        symbol: 'USDC',
      };

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      jest.mocked(buyAction.createWidget).mockResolvedValueOnce({
        url: 'test-url',
        orderId: 'test-order-id',
      } as BuyWidgetInformation);

      await result.current(buyAction, testProvider);

      expect(mockDispatch).toHaveBeenCalledWith(
        addFiatCustomIdData(
          createCustomOrderIdData(
            'test-order-id',
            '56',
            'mocked-selected-address',
            'BUY',
          ),
        ),
      );
    });

    it('creates and dispatches addFiatCustomIdData if customOrderId is returned for sell', async () => {
      mockUseRampSDKValues.isBuy = false;

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      jest.mocked(buyAction.createWidget).mockResolvedValueOnce({
        url: 'test-url',
        orderId: 'test-order-id-sell',
      } as BuyWidgetInformation);

      await result.current(buyAction, testProvider);

      expect(mockDispatch).toHaveBeenCalledWith(
        addFiatCustomIdData(
          createCustomOrderIdData(
            'test-order-id-sell',
            '56',
            'mocked-selected-address',
            'SELL',
          ),
        ),
      );
    });

    it('dispatches removeFiatCustomIdData if order is not Unknown', async () => {
      jest
        .mocked((await SDK.orders()).getOrderFromCallback)
        .mockResolvedValueOnce({
          id: 'test-order-id',
          status: OrderStatusEnum.Pending,
        } as Order);

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      jest.mocked(buyAction.createWidget).mockResolvedValueOnce({
        url: 'test-url',
        orderId: 'test-order-id',
      } as BuyWidgetInformation);

      const customIdData = createCustomOrderIdData(
        'test-order-id',
        '56',
        'mocked-selected-address',
        'BUY',
      );

      await result.current(buyAction, testProvider);
      expect(mockDispatch).toHaveBeenCalledWith(
        removeFiatCustomIdData(customIdData),
      );
    });

    it('calls Linking.openURL if device is android', async () => {
      // mock Platform.OS to be android
      jest.mock('react-native/Libraries/Utilities/Platform', () => ({
        ...jest.requireActual('react-native/Libraries/Utilities/Platform'),
        OS: 'android',
      }));

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(Linking.openURL).toHaveBeenCalledWith('test-url');
    });

    it('calls Linking.openURL if InAppBrowser.isAvailable is false', async () => {
      jest.mocked(InAppBrowser.isAvailable).mockResolvedValueOnce(false);
      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(InAppBrowser.isAvailable).toHaveBeenCalled();
      expect(Linking.openURL).toHaveBeenCalledWith('test-url');
    });

    it('sets lockTime to -1 and restores it', async () => {
      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(Linking.openURL).not.toHaveBeenCalled();

      expect(mockDispatch).toHaveBeenCalledWith(setLockTime(-1));
      expect(mockDispatch).toHaveBeenCalledWith(
        setLockTime(defaultState.settings.lockTime),
      );
    });

    it('returns and tracks cancelled event if the result is not success for buy', async () => {
      jest.mocked(InAppBrowser.openAuth).mockResolvedValueOnce({
        type: 'cancel',
      });

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      const testAmount = 100;
      const testFiatSymbol = 'TEST';
      await result.current(buyAction, testProvider, testAmount, testFiatSymbol);
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();

      expect(mockTrackEvent).toHaveBeenCalledWith('ONRAMP_PURCHASE_CANCELLED', {
        amount: testAmount,
        chain_id_destination: '56',
        currency_destination: 'mocked-asset-symbol',
        currency_source: testFiatSymbol,
        payment_method_id: 'mocked-payment-method-id',
        provider_onramp: testProvider.name,
        order_type: 'BUY',
      });
    });

    it('returns and tracks cancelled event if the result is not success for sell', async () => {
      mockUseRampSDKValues.isBuy = false;
      jest.mocked(InAppBrowser.openAuth).mockResolvedValueOnce({
        type: 'cancel',
      });

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      const testAmount = 100;
      const testFiatSymbol = 'TEST';
      await result.current(buyAction, testProvider, testAmount, testFiatSymbol);
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();

      expect(mockTrackEvent).toHaveBeenCalledWith('ONRAMP_PURCHASE_CANCELLED', {
        amount: testAmount,
        chain_id_destination: '56',
        currency_destination: testFiatSymbol,
        currency_source: 'mocked-asset-symbol',
        payment_method_id: 'mocked-payment-method-id',
        provider_onramp: testProvider.name,
        order_type: 'SELL',
      });
    });

    it('returns and tracks cancelled event if the result is success but url is falsy', async () => {
      jest.mocked(InAppBrowser.openAuth).mockResolvedValueOnce({
        type: 'success',
        url: '',
      });

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      const testAmount = 100;
      const testFiatSymbol = 'TEST';
      await result.current(buyAction, testProvider, testAmount, testFiatSymbol);
      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();

      expect(mockTrackEvent).toHaveBeenCalledWith('ONRAMP_PURCHASE_CANCELLED', {
        amount: testAmount,
        chain_id_destination: '56',
        currency_destination: 'mocked-asset-symbol',
        currency_source: testFiatSymbol,
        payment_method_id: 'mocked-payment-method-id',
        provider_onramp: testProvider.name,
        order_type: 'BUY',
      });
    });

    it('calls getOrderFromCallback to get order for buy', async () => {
      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(SDK.orders).toHaveBeenCalledTimes(1);
      expect((await SDK.orders()).getOrderFromCallback).toHaveBeenCalledWith(
        testProvider.id,
        mockedResultUrl,
        'mocked-selected-address',
      );
      expect(
        (await SDK.orders()).getSellOrderFromCallback,
      ).not.toHaveBeenCalled();
    });

    it('calls getSellOrderFromCallback to get order for sell', async () => {
      mockUseRampSDKValues.isBuy = false;
      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(SDK.orders).toHaveBeenCalledTimes(1);
      expect(
        (await SDK.orders()).getSellOrderFromCallback,
      ).toHaveBeenCalledWith(
        testProvider.id,
        mockedResultUrl,
        'mocked-selected-address',
      );
      expect((await SDK.orders()).getOrderFromCallback).not.toHaveBeenCalled();
    });

    it('returns early if order is falsy', async () => {
      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();
    });

    it('returns early if order status is Unknown', async () => {
      jest
        .mocked((await SDK.orders()).getOrderFromCallback)
        .mockResolvedValueOnce({
          id: 'test-order-id',
          status: OrderStatusEnum.Unknown,
        } as Order);

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();
    });

    it('returns early if order status is Precreated', async () => {
      jest
        .mocked((await SDK.orders()).getOrderFromCallback)
        .mockResolvedValueOnce({
          id: 'test-order-id',
          status: OrderStatusEnum.Precreated,
        } as Order);

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();
    });

    it('returns early if order status is Expired', async () => {
      jest
        .mocked((await SDK.orders()).getOrderFromCallback)
        .mockResolvedValueOnce({
          id: 'test-order-id',
          status: OrderStatusEnum.IdExpired,
        } as Order);

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();
    });

    it('calls handleSuccessfulOrder with an order', async () => {
      jest
        .mocked((await SDK.orders()).getOrderFromCallback)
        .mockResolvedValueOnce({
          id: 'test-order-id',
          status: OrderStatusEnum.Pending,
        } as Order);

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);
      expect(mockHandleSuccessfulOrder).toHaveBeenCalled();
    });

    it('creates transformed order with network from aggregatorOrderToFiatOrder, not selectedChainId', async () => {
      const mockOrder = {
        id: 'test-order-id',
        status: OrderStatusEnum.Pending,
        cryptoCurrency: {
          network: { chainId: '137' },
        },
        network: '137',
      } as Order;

      jest
        .mocked((await SDK.orders()).getOrderFromCallback)
        .mockResolvedValueOnce(mockOrder);

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);

      expect(mockHandleSuccessfulOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          account: 'mocked-selected-address',
          network: '137',
        }),
      );
    });

    it('logs error if an error is thrown', async () => {
      jest
        .mocked((await SDK.orders()).getOrderFromCallback)
        .mockRejectedValueOnce(new Error('test-error'));

      const mockLoggerError = jest.spyOn(Logger, 'error');

      const { result } = renderHookWithProvider(() => useInAppBrowser(), {
        state: defaultState,
      });

      await result.current(buyAction, testProvider);

      expect(mockLoggerError).toHaveBeenCalled();
    });
  });
});
