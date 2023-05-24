import { Order } from '@consensys/on-ramp-sdk';
import { AggregatorNetwork } from '@consensys/on-ramp-sdk/dist/API';
import fiatOrderReducer, {
  addActivationKey,
  addAuthenticationUrl,
  addFiatCustomIdData,
  addFiatOrder,
  chainIdSelector,
  fiatOrdersGetStartedAgg,
  fiatOrdersPaymentMethodSelectorAgg,
  fiatOrdersRegionSelectorAgg,
  getActivationKeys,
  getAuthenticationUrls,
  getCustomOrderIds,
  getHasOrders,
  getOrders,
  getPendingOrders,
  getProviderName,
  getRampNetworks,
  initialState,
  getOrderById,
  removeActivationKey,
  removeAuthenticationUrl,
  removeFiatCustomIdData,
  removeFiatOrder,
  resetFiatOrders,
  selectedAddressSelector,
  setFiatOrdersGetStartedAGG,
  setFiatOrdersPaymentMethodAGG,
  setFiatOrdersRegionAGG,
  updateActivationKey,
  updateFiatCustomIdData,
  updateFiatOrder,
  updateOnRampNetworks,
  networkShortNameSelector,
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
  errorCount: 0,
  lastTimeFetched: 0,
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

const networks: AggregatorNetwork[] = [
  {
    active: true,
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 10,
    chainName: 'Optimism Mainnet',
    shortName: 'Optimism',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 25,
    chainName: 'Cronos Mainnet',
    shortName: 'Cronos',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 56,
    chainName: 'BNB Chain Mainnet',
    shortName: 'BNB Chain',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 137,
    chainName: 'Polygon Mainnet',
    shortName: 'Polygon',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 250,
    chainName: 'Fantom Mainnet',
    shortName: 'Fantom',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 1284,
    chainName: 'Moonbeam Mainnet',
    shortName: 'Moonbeam',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 42161,
    chainName: 'Arbitrum Mainnet',
    shortName: 'Arbitrum',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 42220,
    chainName: 'Celo Mainnet',
    shortName: 'Celo',
    nativeTokenSupported: false,
  },
  {
    active: true,
    chainId: 43114,
    chainName: 'Avalanche C-Chain Mainnet',
    shortName: 'Avalanche',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: 1313161554,
    chainName: 'Aurora Mainnet',
    shortName: 'Aurora',
    nativeTokenSupported: false,
  },
  {
    active: true,
    chainId: 1666600000,
    chainName: 'Harmony Mainnet (Shard 0)',
    shortName: 'Harmony (Shard 0)',
    nativeTokenSupported: true,
  },
];

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

  it('should update networks', () => {
    const stateWithNetworks = fiatOrderReducer(
      initialState,
      updateOnRampNetworks(networks),
    );

    const stateWithNoNetworks = fiatOrderReducer(
      stateWithNetworks,
      updateOnRampNetworks([]),
    );
    expect(stateWithNetworks.networks).toEqual(networks);
    expect(stateWithNoNetworks.networks).toEqual([]);
  });
});

describe('selectors', () => {
  describe('chainIdSelector', () => {
    it('should return the chainId', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '56',
              },
            },
          },
        },
      };

      expect(chainIdSelector(state)).toBe('56');
    });
  });

  describe('selectedAddressSelector', () => {
    it('should return the selected address', () => {
      const state = {
        engine: {
          backgroundState: {
            PreferencesController: {
              selectedAddress: '0x12345678',
            },
          },
        },
      };

      expect(selectedAddressSelector(state)).toBe('0x12345678');
    });
  });

  describe('fiatOrdersRegionSelectorAgg', () => {
    it('should return the selected region', () => {
      const state = {
        fiatOrders: {
          ...initialState,
          selectedRegionAgg: {
            id: '/region/cl',
            name: 'Chile',
          },
        },
      };

      expect(fiatOrdersRegionSelectorAgg(state)).toEqual({
        id: '/region/cl',
        name: 'Chile',
      });
    });
  });

  describe('fiatOrdersPaymentMethodSelectorAgg', () => {
    it('should return the selected payment method id', () => {
      const state = {
        fiatOrders: {
          ...initialState,
          selectedPaymentMethodAgg: '/payment-method/test-payment-method',
        },
      };

      expect(fiatOrdersPaymentMethodSelectorAgg(state)).toEqual(
        '/payment-method/test-payment-method',
      );
    });
  });

  describe('fiatOrdersGetStartedAgg', () => {
    it('should return the get started state', () => {
      const state = {
        fiatOrders: {
          ...initialState,
          getStartedAgg: true,
        },
      };

      expect(fiatOrdersGetStartedAgg(state)).toEqual(true);
    });
  });

  describe('getOrders', () => {
    it('should return the orders by address and chainId', () => {
      const state1 = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '56',
              },
            },
            PreferencesController: {
              selectedAddress: '0x4567',
            },
          },
        },
        fiatOrders: {
          ...initialState,
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              network: '1',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: '0x4567',
            },
          ],
        },
      };

      const state2 = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '1',
              },
            },
            PreferencesController: {
              selectedAddress: '0x1234',
            },
          },
        },
        fiatOrders: {
          ...initialState,
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              network: '1',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: '0x4567',
            },
          ],
        },
      };

      expect(getOrders(state1)).toHaveLength(2);
      expect(getOrders(state1).map((o) => o.id)).toEqual([
        'test-56-order-1',
        'test-56-order-3',
      ]);
      expect(getOrders(state2)).toHaveLength(1);
      expect(getOrders(state2).map((o) => o.id)).toEqual(['test-1-order-2']);
    });

    it('it should return empty array by default', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '1',
              },
            },
            PreferencesController: {
              selectedAddress: '0x1234',
            },
          },
        },
        fiatOrders: {},
      };

      expect(getOrders(state)).toEqual([]);
    });
  });

  describe('getPendingOrders', () => {
    it('should return the orders by address and chainId and state pending', () => {
      const state1 = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '56',
              },
            },
            PreferencesController: {
              selectedAddress: '0x4567',
            },
          },
        },
        fiatOrders: {
          ...initialState,
          orders: [
            {
              ...mockOrder1,
              state: 'PENDING',
              id: 'test-56-order-1',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              state: 'PENDING',
              id: 'test-56-order-3',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              network: '1',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: '0x4567',
            },
          ],
        },
      };

      const state2 = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '1',
              },
            },
            PreferencesController: {
              selectedAddress: '0x1234',
            },
          },
        },
        fiatOrders: {
          ...initialState,
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              state: 'PENDING',
              network: '1',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: '0x4567',
            },
          ],
        },
      };

      expect(getPendingOrders(state1)).toHaveLength(2);
      expect(getPendingOrders(state1).map((o) => o.id)).toEqual([
        'test-56-order-1',
        'test-56-order-3',
      ]);
      expect(getPendingOrders(state2)).toHaveLength(1);
      expect(getPendingOrders(state2).map((o) => o.id)).toEqual([
        'test-1-order-2',
      ]);
    });

    it('it should return empty array by default', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '1',
              },
            },
            PreferencesController: {
              selectedAddress: '0x1234',
            },
          },
        },
        fiatOrders: {},
      };

      expect(getPendingOrders(state)).toEqual([]);
    });
  });

  describe('customOrdersSelector', () => {
    it('should return the custom order ids by address and chainId', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '56',
              },
            },
            PreferencesController: {
              selectedAddress: '0x4567',
            },
          },
        },
        fiatOrders: {
          ...initialState,
          customOrderIds: [
            {
              id: 'test-56-order-1',
              chainId: '56',
              account: '0x4567',
            },
            {
              id: 'test-1-order-1',
              chainId: '1',
              account: '0x4567',
            },
            {
              id: 'test-56-order-2',
              chainId: '56',
              account: '0x4564',
            },
            {
              id: 'test-56-order-3',
              chainId: '56',
              account: '0x4567',
            },
          ],
        },
      };

      expect(getCustomOrderIds(state)).toHaveLength(2);
      expect(getCustomOrderIds(state).map((c) => c.id)).toEqual([
        'test-56-order-1',
        'test-56-order-3',
      ]);
    });

    it('it should return empty array by default', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '1',
              },
            },
            PreferencesController: {
              selectedAddress: '0x1234',
            },
          },
        },
        fiatOrders: {},
      };

      expect(getCustomOrderIds(state)).toEqual([]);
    });
  });

  describe('getOrderById', () => {
    it('should make selector and return the correct order id', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '1',
              },
            },
            PreferencesController: {
              selectedAddress: '0x1234',
            },
          },
        },
        fiatOrders: {
          ...initialState,
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              state: 'PENDING',
              network: '1',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: '0x4567',
            },
          ],
        },
      };
      const order = getOrderById(state, 'test-56-order-2');
      expect(order?.id).toBe('test-56-order-2');
    });
  });

  describe('getHasOrders', () => {
    it('should return true only if there are orders', () => {
      const state1 = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '1',
              },
            },
            PreferencesController: {
              selectedAddress: '0x1234',
            },
          },
        },
        fiatOrders: {
          ...initialState,
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              state: 'PENDING',
              network: '1',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: '0x4567',
            },
          ],
        },
      };
      const state2 = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '56',
              },
            },
            PreferencesController: {
              selectedAddress: '0x1234',
            },
          },
        },
        fiatOrders: {
          ...initialState,
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: '0x4567',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              state: 'PENDING',
              network: '1',
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: '0x1234',
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: '0x4567',
            },
          ],
        },
      };
      expect(getHasOrders(state1)).toBe(true);
      expect(getHasOrders(state2)).toBe(false);
    });
  });

  describe('getActivationKeys', () => {
    it('should return activation keys', () => {
      const state = {
        fiatOrders: {
          ...initialState,
          activationKeys: [
            { key: 'test-activation-key-1', active: true },
            { key: 'test-activation-key-2', active: false },
          ],
        },
      };
      expect(getActivationKeys(state)).toStrictEqual([
        { key: 'test-activation-key-1', active: true },
        { key: 'test-activation-key-2', active: false },
      ]);
    });
    it('should return empty array by default', () => {
      const state = {
        fiatOrders: {},
      };
      expect(getActivationKeys(state)).toStrictEqual([]);
    });
  });

  describe('getAuthenticationUrls', () => {
    it('should return authentication urls', () => {
      const state = {
        fiatOrders: {
          ...initialState,
          authenticationUrls: [
            'test-authentication-url-1',
            'test-authentication-url-2',
          ],
        },
      };
      expect(getAuthenticationUrls(state)).toStrictEqual([
        'test-authentication-url-1',
        'test-authentication-url-2',
      ]);
    });
    it('should return empty array by default', () => {
      const state = {
        fiatOrders: {},
      };
      expect(getAuthenticationUrls(state)).toStrictEqual([]);
    });
  });

  describe('getRampNetworks', () => {
    it('should return the correct ramp networks', () => {
      const state = {
        fiatOrders: {
          ...initialState,
          networks,
        },
      };
      const otherState = {
        fiatOrders: {
          ...initialState,
          networks: networks[1],
        },
      };
      expect(getRampNetworks(state)).toStrictEqual(networks);
      expect(getRampNetworks(otherState)).toStrictEqual(networks[1]);
    });
  });

  describe('networkNameSelector', () => {
    it('should return the correct network name', () => {
      const mainnetState = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '1',
              },
            },
          },
        },
        fiatOrders: {
          ...initialState,
          networks,
        },
      };

      const auroraState = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '1313161554',
              },
            },
          },
        },
        fiatOrders: {
          ...initialState,
          networks,
        },
      };

      const missingNetworkState = {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: {
                chainId: '918273645',
              },
            },
          },
        },
        fiatOrders: {
          ...initialState,
          networks,
        },
      };

      expect(networkShortNameSelector(mainnetState)).toEqual('Ethereum');
      expect(networkShortNameSelector(auroraState)).toEqual('Aurora');
      expect(networkShortNameSelector(missingNetworkState)).toBeUndefined();
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
    `(
      'should return the correct provider name',
      ({ provider, providerName }) => {
        const dummyData = {
          provider: {
            name: 'Test Provider',
          },
        } as Partial<FiatOrder['data']>;
        expect(
          getProviderName(provider, dummyData as FiatOrder['data']),
        ).toEqual(providerName);
      },
    );

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
        getProviderName(
          FIAT_ORDER_PROVIDERS.AGGREGATOR,
          {} as FiatOrder['data'],
        ),
      ).toEqual('...');
    });
  });
});
