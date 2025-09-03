import { Order } from '@consensys/on-ramp-sdk';
import {
  AggregatorNetwork,
  OrderOrderTypeEnum,
} from '@consensys/on-ramp-sdk/dist/API';
import { toHex } from '@metamask/controller-utils';
import { merge } from 'lodash';
import fiatOrderReducer, {
  addActivationKey,
  addAuthenticationUrl,
  addFiatCustomIdData,
  addFiatOrder,
  chainIdSelector,
  fiatOrdersGetStartedAgg,
  fiatOrdersPaymentMethodSelectorAgg,
  fiatOrdersRegionSelectorAgg,
  fiatOrdersRegionSelectorDeposit,
  getActivationKeys,
  getAuthenticationUrls,
  getCustomOrderIds,
  getHasOrders,
  getOrders,
  getAllDepositOrders,
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
  setFiatOrdersGetStartedSell,
  setFiatOrdersGetStartedDeposit,
  setFiatOrdersPaymentMethodAGG,
  fiatOrdersGetStartedDeposit,
  setFiatOrdersRegionAGG,
  setFiatOrdersRegionDeposit,
  updateActivationKey,
  updateFiatCustomIdData,
  updateFiatOrder,
  updateOnRampNetworks,
  networkShortNameSelector,
  fiatOrdersGetStartedSell,
  setFiatSellTxHash,
  removeFiatSellTxHash,
  getOrdersProviders,
} from '.';
import { FIAT_ORDER_PROVIDERS } from '../../constants/on-ramp';
import { CustomIdData, Action, FiatOrder, Region } from './types';
import initialRootState from '../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../util/test/accountsControllerTestUtils';
import mockedEngine from '../../core/__mocks__/MockedEngine';

const MOCK_ADDRESS_1 = '0x4567';
const MOCK_ADDRESS_2 = '0x1234';
const MOCK_FULL_LOWERCASE_ADDRESS =
  '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';

const MOCK_ACCOUNTS_CONTROLLER_STATE_1 = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const MOCK_ACCOUNTS_CONTROLLER_STATE_2 = createMockAccountsControllerState([
  MOCK_ADDRESS_2,
]);

const MOCK_ACCOUNTS_CONTROLLER_STATE_FULL_ADDRESS =
  createMockAccountsControllerState([MOCK_FULL_LOWERCASE_ADDRESS]);

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
  account: MOCK_ADDRESS_2,
  network: '1',
  txHash: '0x987654321',
  excludeFromPurchases: false,
  orderType: OrderOrderTypeEnum.Buy,
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
    walletAddress: MOCK_ADDRESS_2,
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
  orderType: 'BUY',
  createdAt: 123,
  lastTimeFetched: 123,
  errorCount: 0,
};

const dummyCustomOrderIdData2: CustomIdData = {
  id: '456',
  chainId: '1',
  account: '0x123',
  orderType: 'BUY',
  createdAt: 123,
  lastTimeFetched: 123,
  errorCount: 0,
};
const dummyCustomOrderIdData3: CustomIdData = {
  id: '789',
  chainId: '1',
  account: '0x123',
  orderType: 'BUY',
  createdAt: 123,
  lastTimeFetched: 123,
  errorCount: 0,
};

const networks: AggregatorNetwork[] = [
  {
    active: true,
    chainId: '1',
    chainName: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: '10',
    chainName: 'Optimism Mainnet',
    shortName: 'Optimism',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: '25',
    chainName: 'Cronos Mainnet',
    shortName: 'Cronos',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: '56',
    chainName: 'BNB Chain Mainnet',
    shortName: 'BNB Chain',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: '137',
    chainName: 'Polygon Mainnet',
    shortName: 'Polygon',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: '250',
    chainName: 'Fantom Mainnet',
    shortName: 'Fantom',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: '1284',
    chainName: 'Moonbeam Mainnet',
    shortName: 'Moonbeam',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: '42161',
    chainName: 'Arbitrum Mainnet',
    shortName: 'Arbitrum',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: '42220',
    chainName: 'Celo Mainnet',
    shortName: 'Celo',
    nativeTokenSupported: false,
  },
  {
    active: true,
    chainId: '43114',
    chainName: 'Avalanche C-Chain Mainnet',
    shortName: 'Avalanche',
    nativeTokenSupported: true,
  },
  {
    active: true,
    chainId: '1313161554',
    chainName: 'Aurora Mainnet',
    shortName: 'Aurora',
    nativeTokenSupported: false,
  },
  {
    active: true,
    chainId: '1666600000',
    chainName: 'Harmony Mainnet (Shard 0)',
    shortName: 'Harmony (Shard 0)',
    nativeTokenSupported: true,
  },
];

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
  context: {
    NetworkController: {
      getNetworkClientById: (selectedNetwork: string) => {
        if (selectedNetwork === 'aurora') {
          return {
            configuration: {
              chainId: '0x4e454152',
              rpcUrl: 'https://aurora.infura.io/v3',
              ticker: 'ETH',
              type: 'custom',
            },
          };
        }
        if (selectedNetwork === 'unknown-network') {
          return {
            configuration: {
              chainId: '0x36bbbe6d',
              rpcUrl: 'https://unknown-network.infura.io/v3',
              ticker: 'ETH',
              type: 'custom',
            },
          };
        }
        return {
          configuration: {
            chainId: '0x38',
            rpcUrl: 'https://binance.infura.io/v3',
            ticker: 'BNB',
            type: 'custom',
          },
        };
      },
    },
  },
}));

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

  it('should set get started sell', () => {
    const stateWithStartedTrue = fiatOrderReducer(
      initialState,
      setFiatOrdersGetStartedSell(true),
    );
    const stateWithStartedFalse = fiatOrderReducer(
      stateWithStartedTrue,
      setFiatOrdersGetStartedSell(false),
    );
    expect(stateWithStartedTrue.getStartedSell).toEqual(true);
    expect(stateWithStartedFalse.getStartedSell).toEqual(false);
  });

  it('should set get started deposit', () => {
    const stateWithStartedTrue = fiatOrderReducer(
      initialState,
      setFiatOrdersGetStartedDeposit(true),
    );
    const stateWithStartedFalse = fiatOrderReducer(
      stateWithStartedTrue,
      setFiatOrdersGetStartedDeposit(false),
    );
    expect(stateWithStartedTrue.getStartedDeposit).toEqual(true);
    expect(stateWithStartedFalse.getStartedDeposit).toEqual(false);
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

  it('should set the selected deposit region', () => {
    const testDepositRegion = {
      isoCode: 'US',
      flag: '🇺🇸',
      name: 'United States',
      phone: {
        prefix: '+1',
        placeholder: '123 456 7890',
        template: 'XXX XXX XXXX',
      },
      currency: 'USD',
      supported: true,
      recommended: true,
    };
    const stateWithSelectedDepositRegion = fiatOrderReducer(
      initialState,
      setFiatOrdersRegionDeposit(testDepositRegion),
    );
    const stateWithoutSelectedDepositRegion = fiatOrderReducer(
      stateWithSelectedDepositRegion,
      setFiatOrdersRegionDeposit(null),
    );

    expect(stateWithSelectedDepositRegion.selectedRegionDeposit).toEqual(
      testDepositRegion,
    );
    expect(stateWithoutSelectedDepositRegion.selectedRegionDeposit).toEqual(
      null,
    );
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
    const stateWithActivationKeyWithLabel = fiatOrderReducer(
      stateWithActivationKey,
      addActivationKey('test-activation-key-with-label', 'test-label'),
    );

    expect(stateWithActivationKey.activationKeys).toEqual([
      { key: 'test-activation-key', active: true },
    ]);
    expect(stateWithActivationKeyAgain.activationKeys).toEqual([
      { key: 'test-activation-key', active: true },
    ]);
    expect(stateWithActivationKeyWithLabel.activationKeys).toEqual([
      { key: 'test-activation-key', active: true },
      {
        key: 'test-activation-key-with-label',
        active: true,
        label: 'test-label',
      },
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
        activationKeys: [
          { key: 'test-activation-key', label: 'test-key', active: true },
        ],
      },
      updateActivationKey('test-activation-key', 'test-key-updated', false),
    );
    const stateWithNonExistentActivationKeySetInactive = fiatOrderReducer(
      {
        ...initialState,
        activationKeys: [
          { key: 'test-activation-key', label: 'test-key', active: true },
        ],
      },
      updateActivationKey(
        'non-existent-activation-key',
        'non-existing-test-key',
        false,
      ),
    );

    const stateWithActivationKeyWithLabel = fiatOrderReducer(
      stateWithActivationKey,
      updateActivationKey('test-activation-key', 'test-label', false),
    );

    expect(stateWithActivationKey.activationKeys).toEqual([
      { key: 'test-activation-key', label: 'test-key-updated', active: false },
    ]);
    expect(stateWithNonExistentActivationKeySetInactive.activationKeys).toEqual(
      [
        {
          key: 'test-activation-key',
          label: 'test-key',
          active: true,
        },
      ],
    );
    expect(stateWithActivationKeyWithLabel.activationKeys).toEqual([
      { key: 'test-activation-key', active: false, label: 'test-label' },
    ]);
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

  it('should set the sell tx hash', () => {
    const stateWithOrder1 = fiatOrderReducer(
      initialState,
      addFiatOrder(mockOrder1),
    );
    const stateWithSellTxHash = fiatOrderReducer(
      stateWithOrder1,
      setFiatSellTxHash(mockOrder1.id, '0x123'),
    );

    expect(stateWithSellTxHash.orders[0].sellTxHash).toEqual('0x123');
  });

  it('should return same state when setting the sell tx hash if order does not exist', () => {
    const stateWithOrder1 = fiatOrderReducer(
      initialState,
      addFiatOrder(mockOrder1),
    );
    const stateWithoutChanges = fiatOrderReducer(
      stateWithOrder1,
      setFiatSellTxHash('non-existing-order', '0x123'),
    );

    expect(stateWithoutChanges).toEqual(stateWithOrder1);
  });

  it('should remove the sell tx hash', () => {
    const stateWithOrder1 = fiatOrderReducer(
      initialState,
      addFiatOrder(mockOrder1),
    );
    const stateWithSellTxHash = fiatOrderReducer(
      stateWithOrder1,
      setFiatSellTxHash(mockOrder1.id, '0x123'),
    );
    const stateWithoutSellTxHash = fiatOrderReducer(
      stateWithSellTxHash,
      removeFiatSellTxHash(mockOrder1.id),
    );

    expect(stateWithoutSellTxHash.orders[0].sellTxHash).not.toBeDefined();
  });

  it('should return same state when removing the sell tx hash if order does not exist', () => {
    const stateWithOrder1 = fiatOrderReducer(
      initialState,
      addFiatOrder(mockOrder1),
    );
    const stateWithoutChanges = fiatOrderReducer(
      stateWithOrder1,
      removeFiatSellTxHash('non-existing-order'),
    );

    expect(stateWithoutChanges).toEqual(stateWithOrder1);
  });
});

describe('selectors', () => {
  describe('chainIdSelector', () => {
    it('should return the chainId', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'binance',
              networksMetadata: {
                binance: {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x38': {
                  blockExplorerUrls: ['https://etherscan.com'],
                  chainId: '0x38',
                  defaultRpcEndpointIndex: 0,
                  name: 'Binance network',
                  nativeCurrency: 'BNB',
                  rpcEndpoints: [
                    {
                      networkClientId: 'binance',
                      type: 'Custom',
                      url: 'https://binance.infura.io/v3',
                    },
                  ],
                },
              },
            },
          },
        },
      });

      expect(chainIdSelector(state)).toBe('56');
    });
  });

  describe('selectedAddressSelector', () => {
    it('should return the selected address in checksum format', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_FULL_ADDRESS,
          },
        },
      });

      expect(selectedAddressSelector(state)).toBe(
        '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      );
    });
  });

  describe('fiatOrdersRegionSelectorAgg', () => {
    it('should return the selected region', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          selectedRegionAgg: {
            id: '/region/cl',
            name: 'Chile',
          },
        },
      });

      expect(fiatOrdersRegionSelectorAgg(state)).toEqual({
        id: '/region/cl',
        name: 'Chile',
      });
    });
  });

  describe('fiatOrdersRegionSelectorDeposit', () => {
    it('should return the selected deposit region', () => {
      const testDepositRegion = {
        isoCode: 'US',
        flag: '🇺🇸',
        name: 'United States',
        phone: {
          prefix: '+1',
          placeholder: '123 456 7890',
          template: 'XXX XXX XXXX',
        },
        currency: 'USD',
        supported: true,
        recommended: true,
      };
      const state = merge({}, initialRootState, {
        fiatOrders: {
          selectedRegionDeposit: testDepositRegion,
        },
      });

      expect(fiatOrdersRegionSelectorDeposit(state)).toEqual(testDepositRegion);
    });

    it('should return null when no deposit region is selected', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          selectedRegionDeposit: null,
        },
      });

      expect(fiatOrdersRegionSelectorDeposit(state)).toEqual(null);
    });
  });

  describe('fiatOrdersPaymentMethodSelectorAgg', () => {
    it('should return the selected payment method id', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          selectedPaymentMethodAgg: '/payment-method/test-payment-method',
        },
      });

      expect(fiatOrdersPaymentMethodSelectorAgg(state)).toEqual(
        '/payment-method/test-payment-method',
      );
    });
  });

  describe('fiatOrdersGetStartedAgg', () => {
    it('should return the get started state', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          getStartedAgg: true,
        },
      });

      expect(fiatOrdersGetStartedAgg(state)).toEqual(true);
    });
  });

  describe('fiatOrdersGetStartedSell', () => {
    it('should return the get started sell state', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          getStartedSell: true,
        },
      });

      expect(fiatOrdersGetStartedSell(state)).toEqual(true);
    });
  });

  describe('fiatOrdersGetStartedDeposit', () => {
    it('should return the get started deposit state', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          getStartedDeposit: true,
        },
      });

      expect(fiatOrdersGetStartedDeposit(state)).toEqual(true);
    });
  });

  describe('getOrders', () => {
    it('should return empty array if order property is not defined', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_1,
          },
        },
        fiatOrders: {
          orders: undefined,
        },
      });

      expect(getOrders(state)).toEqual([]);
    });

    it('should return all orders by address across all chains', () => {
      const state1 = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'binance',
              networksMetadata: {
                binance: {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x38': {
                  blockExplorerUrls: ['https://etherscan.com'],
                  chainId: '0x38',
                  defaultRpcEndpointIndex: 0,
                  name: 'Binance network',
                  nativeCurrency: 'BNB',
                  rpcEndpoints: [
                    {
                      networkClientId: 'binance',
                      type: 'Custom',
                      url: 'https://binance.infura.io/v3',
                    },
                  ],
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_1,
          },
        },
        fiatOrders: {
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              network: '1',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });

      const state2 = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              networkConfigurations: {
                mainnet: {
                  id: 'mainnet',
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x1',
                  ticker: 'ETH',
                  nickname: 'Ethereum network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_2,
          },
        },
        fiatOrders: {
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              network: '1',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });

      expect(getOrders(state1)).toHaveLength(4);
      expect(getOrders(state1).map((o) => o.id)).toEqual([
        'test-56-order-1',
        'test-56-order-3',
        'test-1-order-1',
        'test-1-order-3',
      ]);
      expect(getOrders(state2)).toHaveLength(2);
      expect(getOrders(state2).map((o) => o.id)).toEqual([
        'test-56-order-2',
        'test-1-order-2',
      ]);
    });

    it('should return all the orders in a test net', () => {
      const state1 = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'sepolia',
              networksMetadata: {},
              networkConfigurations: {
                sepolia: {
                  id: 'sepolia',
                  rpcUrl: 'https://sepolia.infura.io/v3',
                  chainId: toHex('11155111'),
                  ticker: 'ETH',
                  nickname: 'Sepolia network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://sepolia-etherscan.com',
                  },
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_1,
          },
        },
        fiatOrders: {
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              network: '1',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });

      const state2 = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'sepolia',
              networksMetadata: {},
              networkConfigurations: {
                sepolia: {
                  id: 'sepolia',
                  rpcUrl: 'https://sepolia.infura.io/v3',
                  chainId: '0xaa36a7',
                  ticker: 'ETH',
                  nickname: 'Sepolia network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_2,
          },
        },
        fiatOrders: {
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              network: '1',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });

      expect(getOrders(state1)).toHaveLength(4);
      expect(getOrders(state1).map((o) => o.id)).toEqual([
        'test-56-order-1',
        'test-56-order-3',
        'test-1-order-1',
        'test-1-order-3',
      ]);
      expect(getOrders(state2)).toHaveLength(2);
      expect(getOrders(state2).map((o) => o.id)).toEqual([
        'test-56-order-2',
        'test-1-order-2',
      ]);
    });

    it('it should return empty array by default', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              networkConfigurations: {
                mainnet: {
                  id: 'mainnet',
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x1',
                  ticker: 'ETH',
                  nickname: 'Sepolia network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_2,
          },
        },
        fiatOrders: {},
      });

      expect(getOrders(state)).toEqual([]);
    });
  });

  describe('getAllDepositOrders', () => {
    const mockDepositOrder1 = {
      ...mockOrder1,
      id: 'deposit-order-1',
      provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
      state: 'CREATED' as FiatOrder['state'],
      network: '1',
      account: MOCK_ADDRESS_1,
    };

    const mockDepositOrder2 = {
      ...mockOrder1,
      id: 'deposit-order-2',
      provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
      state: 'PENDING' as FiatOrder['state'],
      network: '56',
      account: MOCK_ADDRESS_2,
    };

    const mockAggregatorOrder = {
      ...mockOrder1,
      id: 'aggregator-order-1',
      provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
      state: 'COMPLETED' as FiatOrder['state'],
      network: '1',
      account: MOCK_ADDRESS_1,
    };

    it('should return all deposit orders regardless of network or account', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {
                mainnet: {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x1': {
                  blockExplorerUrls: ['https://etherscan.com'],
                  chainId: '0x1',
                  defaultRpcEndpointIndex: 0,
                  name: 'Ethereum network',
                  nativeCurrency: 'ETH',
                  rpcEndpoints: [
                    {
                      networkClientId: 'mainnet',
                      type: 'Custom',
                      url: 'https://mainnet.infura.io/v3',
                    },
                  ],
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_1,
          },
        },
        fiatOrders: {
          orders: [mockDepositOrder1, mockDepositOrder2, mockAggregatorOrder],
        },
      });

      const result = getAllDepositOrders(state);

      expect(result).toHaveLength(2);
      expect(result.map((o) => o.id)).toEqual([
        'deposit-order-1',
        'deposit-order-2',
      ]);
      expect(
        result.every(
          (order) => order.provider === FIAT_ORDER_PROVIDERS.DEPOSIT,
        ),
      ).toBe(true);
    });
  });

  describe('getPendingOrders', () => {
    it('should return pending orders by address across all chains', () => {
      const state1 = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'binance',
              networksMetadata: {
                binance: {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x38': {
                  blockExplorerUrls: ['https://etherscan.com'],
                  chainId: '0x38',
                  defaultRpcEndpointIndex: 0,
                  name: 'Binance network',
                  nativeCurrency: 'BNB',
                  rpcEndpoints: [
                    {
                      networkClientId: 'binance',
                      type: 'Custom',
                      url: 'https://binance.infura.io/v3',
                    },
                  ],
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_1,
          },
        },
        fiatOrders: {
          orders: [
            {
              ...mockOrder1,
              state: 'PENDING',
              id: 'test-56-order-1',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              state: 'PENDING',
              id: 'test-56-order-3',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              network: '1',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });

      const state2 = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              networkConfigurations: {
                mainnet: {
                  id: 'mainnet',
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x1',
                  ticker: 'ETH',
                  nickname: 'Ethereum network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_2,
          },
        },
        fiatOrders: {
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              state: 'PENDING',
              network: '1',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });

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
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              networkConfigurations: {
                mainnet: {
                  id: 'mainnet',
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x1',
                  ticker: 'ETH',
                  nickname: 'Sepolia network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_2,
          },
        },
        fiatOrders: {},
      });

      expect(getPendingOrders(state)).toEqual([]);
    });
  });

  describe('customOrdersSelector', () => {
    it('should return empty array if custom order property is not defined', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_1,
          },
        },
        fiatOrders: {
          customOrderIds: undefined,
        },
      });

      expect(getCustomOrderIds(state)).toEqual([]);
    });

    it('should return all custom order ids by address across all chains', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'binance',
              networksMetadata: {
                binance: {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x38': {
                  blockExplorerUrls: ['https://etherscan.com'],
                  chainId: '0x38',
                  defaultRpcEndpointIndex: 0,
                  name: 'Binance network',
                  nativeCurrency: 'BNB',
                  rpcEndpoints: [
                    {
                      networkClientId: 'binance',
                      type: 'Custom',
                      url: 'https://binance.infura.io/v3',
                    },
                  ],
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_1,
          },
        },
        fiatOrders: {
          customOrderIds: [
            {
              id: 'test-56-order-1',
              chainId: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              id: 'test-1-order-1',
              chainId: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              id: 'test-56-order-2',
              chainId: '56',
              account: '0x4564',
            },
            {
              id: 'test-56-order-3',
              chainId: '56',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });

      expect(getCustomOrderIds(state)).toHaveLength(3);
      expect(getCustomOrderIds(state).map((c) => c.id)).toEqual([
        'test-56-order-1',
        'test-1-order-1',
        'test-56-order-3',
      ]);
    });

    it('it should return empty array by default', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              networkConfigurations: {
                mainnet: {
                  id: 'mainnet',
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x1',
                  ticker: 'ETH',
                  nickname: 'Sepolia network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_2,
          },
        },
        fiatOrders: {},
      });

      expect(getCustomOrderIds(state)).toEqual([]);
    });
  });

  describe('getOrderById', () => {
    it('should make selector and return the correct order id', () => {
      const state = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              networkConfigurations: {
                mainnet: {
                  id: 'mainnet',
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x1',
                  ticker: 'ETH',
                  nickname: 'Sepolia network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_2,
          },
        },
        fiatOrders: {
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              state: 'PENDING',
              network: '1',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });
      const order = getOrderById(state, 'test-56-order-2');
      expect(order?.id).toBe('test-56-order-2');
    });
  });

  describe('getHasOrders', () => {
    it('should return true if there are orders from any chain', () => {
      const state1 = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {
                mainnet: {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x1': {
                  blockExplorerUrls: ['https://etherscan.com'],
                  chainId: '0x1',
                  defaultRpcEndpointIndex: 0,
                  name: 'Ethereum network',
                  nativeCurrency: 'ETH',
                  rpcEndpoints: [
                    {
                      networkClientId: 'mainnet',
                      type: 'Custom',
                      url: 'https://mainnet.infura.io/v3',
                    },
                  ],
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_2,
          },
        },
        fiatOrders: {
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              state: 'PENDING',
              network: '1',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });
      const state2 = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'binance',
              networksMetadata: {
                binance: {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x38': {
                  blockExplorerUrls: ['https://bscscan.com'],
                  chainId: '0x38',
                  defaultRpcEndpointIndex: 0,
                  name: 'Binance network',
                  nativeCurrency: 'BNB',
                  rpcEndpoints: [
                    {
                      networkClientId: 'binance',
                      type: 'Custom',
                      url: 'https://binance.infura.io/v3',
                    },
                  ],
                },
              },
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_2,
          },
        },
        fiatOrders: {
          orders: [
            {
              ...mockOrder1,
              id: 'test-56-order-1',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-2',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '56',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-1',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-2',
              state: 'PENDING',
              network: '1',
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-1-order-3',
              network: '1',
              excludeFromPurchases: true,
              account: MOCK_ADDRESS_2,
            },
            {
              ...mockOrder1,
              id: 'test-56-order-3',
              network: '1',
              account: MOCK_ADDRESS_1,
            },
          ],
        },
      });
      expect(getHasOrders(state1)).toBe(true);
      expect(getHasOrders(state2)).toBe(true);
    });
  });

  describe('getActivationKeys', () => {
    it('should return empty array if activation keys property is not defined', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          activationKeys: undefined,
        },
      });
      expect(getActivationKeys(state)).toStrictEqual([]);
    });

    it('should return activation keys', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          activationKeys: [
            {
              key: 'test-activation-key-1',
              active: true,
              label: 'test-label-1',
            },
            { key: 'test-activation-key-2', active: false },
          ],
        },
      });
      expect(getActivationKeys(state)).toStrictEqual([
        { key: 'test-activation-key-1', active: true, label: 'test-label-1' },
        { key: 'test-activation-key-2', active: false },
      ]);
    });
    it('should return empty array by default', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {},
      });
      expect(getActivationKeys(state)).toStrictEqual([]);
    });
  });

  describe('getAuthenticationUrls', () => {
    it('should return empty array if authentication urls property is not defined', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          authenticationUrls: undefined,
        },
      });
      expect(getAuthenticationUrls(state)).toStrictEqual([]);
    });

    it('should return authentication urls', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          authenticationUrls: [
            'test-authentication-url-1',
            'test-authentication-url-2',
          ],
        },
      });
      expect(getAuthenticationUrls(state)).toStrictEqual([
        'test-authentication-url-1',
        'test-authentication-url-2',
      ]);
    });
    it('should return empty array by default', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {},
      });
      expect(getAuthenticationUrls(state)).toStrictEqual([]);
    });
  });

  describe('getRampNetworks', () => {
    it('should return the correct ramp networks', () => {
      const state = merge({}, initialRootState, {
        fiatOrders: {
          networks,
        },
      });
      const otherState = merge({}, initialRootState, {
        fiatOrders: {
          networks: [networks[1]],
        },
      });
      expect(getRampNetworks(state)).toStrictEqual(networks);
      expect(getRampNetworks(otherState)).toStrictEqual([networks[1]]);
    });
  });

  describe('networkNameSelector', () => {
    it('should return the correct network name', () => {
      const mainnetState = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {
                mainnet: {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x1': {
                  blockExplorerUrls: ['https://etherscan.com'],
                  chainId: '0x1',
                  defaultRpcEndpointIndex: 0,
                  name: 'Sepolia network',
                  nativeCurrency: 'ETH',
                  rpcEndpoints: [
                    {
                      networkClientId: 'mainnet',
                      type: 'Custom',
                      url: 'https://mainnet.infura.io/v3',
                    },
                  ],
                },
              },
            },
          },
        },
        fiatOrders: {
          networks,
        },
      });

      const auroraState = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'aurora',
              networksMetadata: {
                aurora: {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x4e454152': {
                  blockExplorerUrls: ['https://etherscan.com'],
                  chainId: '0x4e454152',
                  defaultRpcEndpointIndex: 0,
                  name: 'Aurora Network',
                  nativeCurrency: 'ETH',
                  rpcEndpoints: [
                    {
                      networkClientId: 'aurora',
                      type: 'Custom',
                      url: 'https://aurora.infura.io/v3',
                    },
                  ],
                },
              },
            },
          },
        },
        fiatOrders: {
          networks,
        },
      });

      const missingNetworkState = merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'unknown-network',
              networksMetadata: {
                'unknown-network': {
                  status: 'available',
                  EIPS: {},
                },
              },
              networkConfigurationsByChainId: {
                '0x36bbbe6d': {
                  blockExplorerUrls: ['https://etherscan.com'],
                  chainId: '0x36bbbe6d',
                  defaultRpcEndpointIndex: 0,
                  name: 'Unknown network',
                  nativeCurrency: 'ETH',
                  rpcEndpoints: [
                    {
                      networkClientId: 'unknown-network',
                      type: 'Custom',
                      url: 'https://unknown-network.infura.io/v3',
                    },
                  ],
                },
              },
            },
          },
        },
        fiatOrders: {
          networks,
        },
      });

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

describe('getOrdersProviders', () => {
  function createMockOrderWithProviderId(provider: string) {
    return {
      ...mockOrder1,
      data: {
        ...mockOrder1.data,
        provider: {
          ...mockOrder1.data.provider,
          id: provider,
        },
      },
    };
  }

  it('should return the correct providers', () => {
    const state = merge({}, initialRootState, {
      fiatOrders: {
        orders: [
          createMockOrderWithProviderId('test-provider-id-1'),
          createMockOrderWithProviderId('test-provider-id-2'),
          createMockOrderWithProviderId('test-provider-id-4'),
          createMockOrderWithProviderId('test-provider-id-3'),
          createMockOrderWithProviderId('test-provider-id-1'),
          createMockOrderWithProviderId('test-provider-id-2'),
        ],
      },
    });

    expect(getOrdersProviders(state)).toEqual([
      'test-provider-id-1',
      'test-provider-id-2',
      'test-provider-id-4',
      'test-provider-id-3',
    ]);
  });

  it('should return empty array without orders', () => {
    const state = merge({}, initialRootState, {
      fiatOrders: {
        orders: [],
      },
    });

    expect(getOrdersProviders(state)).toEqual([]);
  });

  it('should return empty array with undefined orders', () => {
    const state = merge({}, initialRootState, {
      fiatOrders: {
        orders: undefined,
      },
    });

    expect(getOrdersProviders(state)).toEqual([]);
  });
});
