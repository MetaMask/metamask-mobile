import { Order } from '@consensys/on-ramp-sdk';
import fiatOrderReducer, {
  addActivationKey,
  addAuthenticationUrl,
  addFiatCustomIdData,
  addFiatOrder,
  getProviderName,
  initialState,
  removeActivationKey,
  removeAuthenticationUrl,
  removeFiatCustomIdData,
  removeFiatOrder,
  resetFiatOrders,
  setFiatOrdersGetStartedAGG,
  setFiatOrdersPaymentMethodAGG,
  setFiatOrdersRegionAGG,
  updateActivationKey,
  updateFiatCustomIdData,
  updateFiatOrder,
} from '.';
import { FIAT_ORDER_PROVIDERS } from '../../constants/on-ramp';
import { CustomIdData, Action, FiatOrder, Region } from './types';

const mockOrder1 = {
  id: 'test-id-1',
  provider: 'AGGREGATOR' as FiatOrder['provider'],
  createdAt: 1673886669608,
  amount: 123,
  fee: 9,
  cryptoAmount: 0.012361263,
  cryptoFee: 9,
  currency: 'USD',
  currencySymbol: '$',
  cryptocurrency: 'BTC',
  state: 'COMPLETED' as FiatOrder['state'],
  account: '0x1234',
  network: '1',
  txHash: '0x987654321',
  excludeFromPurchases: false,
  orderType: 'BUY',
  data: {
    id: 'test-id',
    isOnlyLink: false,
    provider: {
      id: 'test-provider',
      name: 'Test Provider',
    },
    createdAt: 1673886669608,
    fiatAmount: 123,
    totalFeesFiat: 9,
    cryptoAmount: 0.012361263,
    cryptoCurrency: {
      symbol: 'BTC',
    },
    fiatCurrency: {
      symbol: 'USD',
      denomSymbol: '$',
    },
    network: '1',
    status: 'COMPLETED',
    orderType: 'BUY',
    walletAddress: '0x1234',
    txHash: '0x987654321',
    excludeFromPurchases: false,
  } as Order,
};

const mockOrder2 = {
  ...mockOrder1,
  id: 'test-id-2',
};

const dummyCustomOrderIdData1: CustomIdData = {
  id: '123',
  chainId: '1',
  account: '0x123',
  createdAt: 123,
  lastTimeFetched: 123,
  errorCount: 0,
};

const dummyCustomOrderIdData2: CustomIdData = {
  id: '456',
  chainId: '1',
  account: '0x123',
  createdAt: 123,
  lastTimeFetched: 123,
  errorCount: 0,
};
const dummyCustomOrderIdData3: CustomIdData = {
  id: '789',
  chainId: '1',
  account: '0x123',
  createdAt: 123,
  lastTimeFetched: 123,
  errorCount: 0,
};

describe('fiatOrderReducer', () => {
  it('should return the initial state', () => {
    expect(fiatOrderReducer(undefined, {} as Action)).toEqual(initialState);
  });

  it('should return the current state if action missing', () => {
    expect(
      fiatOrderReducer(initialState, undefined as unknown as Action),
    ).toEqual(initialState);
  });

  it('should add a fiat order', () => {
    const stateWithOrder1 = fiatOrderReducer(
      initialState,
      addFiatOrder(mockOrder1),
    );

    const stateWithOrder1Again = fiatOrderReducer(
      stateWithOrder1,
      addFiatOrder(mockOrder1),
    );

    expect(stateWithOrder1.orders).toEqual([mockOrder1]);
    expect(stateWithOrder1Again.orders).toEqual([mockOrder1]);
  });

  it('should update a fiat order', () => {
    const updatedOrder = {
      ...mockOrder1,
      createdAt: 456,
    };

    const updatedNonExistentOrder = {
      ...mockOrder2,
      createdAt: 456,
    };

    const stateWithOrder1Updated = fiatOrderReducer(
      {
        ...initialState,
        orders: [mockOrder1],
      },
      updateFiatOrder(updatedOrder),
    );

    const stateWithNonExistentOrder = fiatOrderReducer(
      initialState,
      updateFiatOrder(updatedNonExistentOrder),
    );

    expect(stateWithOrder1Updated.orders).toEqual([updatedOrder]);
    expect(stateWithNonExistentOrder.orders).toEqual([]);
  });

  it('should remove a fiat order', () => {
    const stateWithOrder1Removed = fiatOrderReducer(
      {
        ...initialState,
        orders: [mockOrder1],
      },
      removeFiatOrder(mockOrder1),
    );

    const stateWithNonExistentOrderRemoved = fiatOrderReducer(
      {
        ...initialState,
        orders: [mockOrder1],
      },
      removeFiatOrder(mockOrder2),
    );

    expect(stateWithOrder1Removed.orders).toEqual([]);
    expect(stateWithNonExistentOrderRemoved.orders).toEqual([mockOrder1]);
  });

  it('should reset the state', () => {
    const resetState = fiatOrderReducer(
      {
        ...initialState,
        getStartedAgg: true,
        orders: [mockOrder1],
      },
      resetFiatOrders(),
    );
    expect(resetState).toEqual(initialState);
  });

  it('should set get started', () => {
    const stateWithStartedTrue = fiatOrderReducer(
      initialState,
      setFiatOrdersGetStartedAGG(true),
    );
    const stateWithStartedFalse = fiatOrderReducer(
      stateWithStartedTrue,
      setFiatOrdersGetStartedAGG(false),
    );
    expect(stateWithStartedTrue.getStartedAgg).toEqual(true);
    expect(stateWithStartedFalse.getStartedAgg).toEqual(false);
  });

  it('should set the selected region', () => {
    const testRegion = {
      id: 'test-region',
      name: 'Test Region',
    } as Region;
    const stateWithSelectedRegion = fiatOrderReducer(
      initialState,
      setFiatOrdersRegionAGG(testRegion),
    );
    const stateWithoutSelectedRegion = fiatOrderReducer(
      stateWithSelectedRegion,
      setFiatOrdersRegionAGG(null),
    );

    expect(stateWithSelectedRegion.selectedRegionAgg).toEqual(testRegion);
    expect(stateWithoutSelectedRegion.selectedRegionAgg).toEqual(null);
  });

  it('should set the selected payment method', () => {
    const stateWithSelectedPaymentMethod = fiatOrderReducer(
      initialState,
      setFiatOrdersPaymentMethodAGG('test-payment-method'),
    );
    const stateWithoutSelectedPaymentMethod = fiatOrderReducer(
      stateWithSelectedPaymentMethod,
      setFiatOrdersPaymentMethodAGG(null),
    );
    expect(stateWithSelectedPaymentMethod.selectedPaymentMethodAgg).toEqual(
      'test-payment-method',
    );
    expect(stateWithoutSelectedPaymentMethod.selectedPaymentMethodAgg).toEqual(
      null,
    );
  });

  it('should add a custom order id object', () => {
    const stateWithCustomOrderId1 = fiatOrderReducer(
      initialState,
      addFiatCustomIdData(dummyCustomOrderIdData1),
    );

    const stateWithCustomOrderId1Again = fiatOrderReducer(
      stateWithCustomOrderId1 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData1),
    );

    const stateWithCustomOrderId1and2 = fiatOrderReducer(
      stateWithCustomOrderId1Again as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData2),
    );

    expect(stateWithCustomOrderId1.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
    ]);
    expect(stateWithCustomOrderId1Again.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
    ]);
    expect(stateWithCustomOrderId1and2.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      dummyCustomOrderIdData2,
    ]);
  });

  it('should update a custom order id object', () => {
    const updatedCustomOrderIdData: CustomIdData = {
      ...dummyCustomOrderIdData2,
      createdAt: 456,
    };

    const stateWithCustomOrderId1 = fiatOrderReducer(
      initialState,
      addFiatCustomIdData(dummyCustomOrderIdData1),
    );

    const stateWithCustomOrderId1and2 = fiatOrderReducer(
      stateWithCustomOrderId1 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData2),
    );

    const stateWithCustomOrderId1and2and3 = fiatOrderReducer(
      stateWithCustomOrderId1and2 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData3),
    );

    const stateWithCustomOrderId2updated = fiatOrderReducer(
      stateWithCustomOrderId1and2and3 as typeof initialState,
      updateFiatCustomIdData(updatedCustomOrderIdData),
    );
    const stateWithUnexistingUpdate = fiatOrderReducer(
      stateWithCustomOrderId2updated as typeof initialState,
      updateFiatCustomIdData({
        ...updateFiatCustomIdData,
        id: 'does not exist',
      } as CustomIdData),
    );

    expect(stateWithCustomOrderId2updated.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      updatedCustomOrderIdData,
      dummyCustomOrderIdData3,
    ]);
    expect(stateWithUnexistingUpdate.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      updatedCustomOrderIdData,
      dummyCustomOrderIdData3,
    ]);
  });

  it('should remove a custom order id object', () => {
    const stateWithCustomOrderId1 = fiatOrderReducer(
      initialState,
      addFiatCustomIdData(dummyCustomOrderIdData1),
    );

    const stateWithCustomOrderId1and2 = fiatOrderReducer(
      stateWithCustomOrderId1 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData2),
    );

    const stateWithCustomOrderId1and2and3 = fiatOrderReducer(
      stateWithCustomOrderId1and2 as typeof initialState,
      addFiatCustomIdData(dummyCustomOrderIdData3),
    );

    const stateWithCustomOrderId2removed = fiatOrderReducer(
      stateWithCustomOrderId1and2and3 as typeof initialState,
      removeFiatCustomIdData(dummyCustomOrderIdData2),
    );
    const stateWithCustomOrderId2removedAgain = fiatOrderReducer(
      stateWithCustomOrderId2removed as typeof initialState,
      removeFiatCustomIdData(dummyCustomOrderIdData2),
    );

    expect(stateWithCustomOrderId2removed.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      dummyCustomOrderIdData3,
    ]);

    expect(stateWithCustomOrderId2removedAgain.customOrderIds).toEqual([
      dummyCustomOrderIdData1,
      dummyCustomOrderIdData3,
    ]);
  });

  it('should add an authentication url', () => {
    const stateWithAuthenticationUrl = fiatOrderReducer(
      initialState,
      addAuthenticationUrl('test-authentication-url'),
    );
    const stateWithAuthenticationUrlAgain = fiatOrderReducer(
      stateWithAuthenticationUrl,
      addAuthenticationUrl('test-authentication-url'),
    );

    expect(stateWithAuthenticationUrl.authenticationUrls).toEqual([
      'test-authentication-url',
    ]);
    expect(stateWithAuthenticationUrlAgain.authenticationUrls).toEqual([
      'test-authentication-url',
    ]);
  });

  it('should remove an authentication url', () => {
    const stateWithAuthenticationUrl = fiatOrderReducer(
      {
        ...initialState,
        authenticationUrls: ['test-authentication-url'],
      },
      removeAuthenticationUrl('test-authentication-url'),
    );
    const stateWithNonExistentAuthenticationUrlRemoved = fiatOrderReducer(
      stateWithAuthenticationUrl,
      removeAuthenticationUrl('non-existent-authentication-url'),
    );

    expect(stateWithAuthenticationUrl.authenticationUrls).toEqual([]);
    expect(
      stateWithNonExistentAuthenticationUrlRemoved.authenticationUrls,
    ).toEqual([]);
  });

  it('should add an activation key', () => {
    const stateWithActivationKey = fiatOrderReducer(
      initialState,
      addActivationKey('test-activation-key'),
    );
    const stateWithActivationKeyAgain = fiatOrderReducer(
      stateWithActivationKey,
      addActivationKey('test-activation-key'),
    );

    expect(stateWithActivationKey.activationKeys).toEqual([
      { key: 'test-activation-key', active: true },
    ]);
    expect(stateWithActivationKeyAgain.activationKeys).toEqual([
      { key: 'test-activation-key', active: true },
    ]);
  });

  it('should remove an activation key', () => {
    const stateWithActivationKey = fiatOrderReducer(
      {
        ...initialState,
        activationKeys: [{ key: 'test-activation-key', active: true }],
      },
      removeActivationKey('test-activation-key'),
    );
    const stateWithNonExistentActivationKeyRemoved = fiatOrderReducer(
      {
        ...initialState,
        activationKeys: [{ key: 'test-activation-key', active: true }],
      },
      removeActivationKey('non-existent-activation-key'),
    );

    expect(stateWithActivationKey.activationKeys).toEqual([]);
    expect(stateWithNonExistentActivationKeyRemoved.activationKeys).toEqual([
      {
        key: 'test-activation-key',
        active: true,
      },
    ]);
  });

  it('should update an activation key', () => {
    const stateWithActivationKey = fiatOrderReducer(
      {
        ...initialState,
        activationKeys: [{ key: 'test-activation-key', active: true }],
      },
      updateActivationKey('test-activation-key', false),
    );
    const stateWithNonExistentActivationKeySetInactive = fiatOrderReducer(
      {
        ...initialState,
        activationKeys: [{ key: 'test-activation-key', active: true }],
      },
      updateActivationKey('non-existent-activation-key', false),
    );

    expect(stateWithActivationKey.activationKeys).toEqual([
      { key: 'test-activation-key', active: false },
    ]);
    expect(stateWithNonExistentActivationKeySetInactive.activationKeys).toEqual(
      [
        {
          key: 'test-activation-key',
          active: true,
        },
      ],
    );
  });
});

describe('getProviderName', () => {
  it.each`
    provider                               | providerName
    ${FIAT_ORDER_PROVIDERS.WYRE}           | ${'Wyre'}
    ${FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY} | ${'Wyre'}
    ${FIAT_ORDER_PROVIDERS.TRANSAK}        | ${'Transak'}
    ${FIAT_ORDER_PROVIDERS.MOONPAY}        | ${'MoonPay'}
    ${FIAT_ORDER_PROVIDERS.AGGREGATOR}     | ${'Test Provider'}
  `('should return the correct provider name', ({ provider, providerName }) => {
    const dummyData = {
      provider: {
        name: 'Test Provider',
      },
    } as Partial<FiatOrder['data']>;
    expect(getProviderName(provider, dummyData as FiatOrder['data'])).toEqual(
      providerName,
    );
  });

  it('should return the correct provider name for unknown provider', () => {
    expect(
      getProviderName(
        'unknown provider' as FIAT_ORDER_PROVIDERS,
        {} as FiatOrder['data'],
      ),
    ).toEqual('unknown provider');
  });

  it('should return ... for missing aggregator provider', () => {
    expect(
      getProviderName(FIAT_ORDER_PROVIDERS.AGGREGATOR, {} as FiatOrder['data']),
    ).toEqual('...');
  });
});
