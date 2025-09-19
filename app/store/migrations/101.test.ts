import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { IconName } from '../../component-library/components/Icons/Icon/index';
import { brandColor } from '@metamask/design-tokens';
import { DepositOrderType } from '@consensys/native-ramps-sdk';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import migrate from './101';

interface TestState {
  engine: {
    backgroundState: Record<string, unknown>;
  };
  settings: Record<string, unknown>;
  security: Record<string, unknown>;
  fiatOrders: {
    orders: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
interface TestOrder {
  id: string;
  provider: string;
  orderType?: DepositOrderType | OrderOrderTypeEnum;
  createdAt?: number;
  amount?: number;
  state?: string;
  data?: {
    cryptoCurrency?: string | object;
    paymentMethod?: string | object;
    fiatAmount?: number;
    network?: string;
    walletAddress?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const getOrderData = (order: unknown): TestOrder['data'] =>
  (order as TestOrder).data;

const getExpectedOrderData = (
  order: unknown,
): NonNullable<TestOrder['data']> => {
  const data = getOrderData(order);
  expect(data).toBeDefined();
  return data as NonNullable<TestOrder['data']>;
};

const createValidState = (fiatOrders?: TestState['fiatOrders']): TestState => ({
  engine: {
    backgroundState: {},
  },
  settings: {},
  security: {},
  fiatOrders: fiatOrders || {
    orders: [],
  },
});

describe('Migration 101: Convert deposit order string IDs to objects', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = 'not an object';

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual('not an object');
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "FATAL ERROR: Migration 101: Invalid state error: 'string'",
        ),
      }),
    );
  });

  it.each([
    {
      state: {},
      test: 'no fiatOrders property',
    },
    {
      state: {
        fiatOrders: 'invalid',
      },
      test: 'invalid fiatOrders state',
    },
    {
      state: {
        fiatOrders: {},
      },
      test: 'no orders property in fiatOrders',
    },
    {
      state: {
        fiatOrders: {
          orders: 'not an array',
        },
      },
      test: 'orders is not an array',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(orgState);
  });

  it('does not modify state if fiatOrders does not exist', () => {
    const state = {
      engine: {
        backgroundState: {},
      },
      settings: {},
      security: {},
      someOtherData: {
        value: 'test',
      },
    };

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not modify orders that are not DEPOSIT provider', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'AGGREGATOR',
          orderType: OrderOrderTypeEnum.Buy,
          data: {
            cryptoCurrency: 'eip155:1/slip44:60',
            paymentMethod: 'credit_debit_card',
            someOtherField: 'value',
          },
          amount: 100,
        },
        {
          id: 'order-2',
          provider: 'TRANSAK',
          orderType: OrderOrderTypeEnum.Sell,
          data: {
            cryptoCurrency:
              'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            paymentMethod: 'apple_pay',
          },
        },
      ],
      selectedRegion: null,
    });

    const migratedState = migrate(state) as TestState;

    expect(migratedState.fiatOrders.orders).toEqual(state.fiatOrders.orders);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not modify DEPOSIT orders without data field', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          amount: 100,
        },
        {
          id: 'order-2',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: 'invalid data',
        },
      ],
    });

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('converts cryptoCurrency string to object for known asset ID', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency: 'eip155:1/slip44:60',
            paymentMethod: {
              id: 'apple_pay',
              name: 'Apple Pay',
              duration: 'instant',
              icon: IconName.Apple,
            },
            fiatAmount: 100,
          },
        },
      ],
    });

    const migratedState = migrate(state) as TestState;

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).cryptoCurrency,
    ).toEqual({
      assetId: 'eip155:1/slip44:60',
      chainId: 'eip155:1',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('converts paymentMethod string to object for known payment ID', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency: {
              assetId: 'eip155:1/slip44:60',
              symbol: 'ETH',
            },
            paymentMethod: 'apple_pay',
            fiatAmount: 100,
          },
        },
      ],
    });

    const migratedState = migrate(state) as TestState;

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).paymentMethod,
    ).toEqual({
      id: 'apple_pay',
      name: 'Apple Pay',
      duration: 'instant',
      icon: IconName.Apple,
      iconColor: {
        light: brandColor.black,
        dark: brandColor.white,
      },
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('converts both cryptoCurrency and paymentMethod strings to objects', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency:
              'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            paymentMethod: 'credit_debit_card',
            fiatAmount: 100,
            network: 'ethereum',
          },
        },
      ],
    });

    const migratedState = migrate(state) as TestState;

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).cryptoCurrency,
    ).toEqual({
      assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: 'eip155:1',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
    });

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).paymentMethod,
    ).toEqual({
      id: 'credit_debit_card',
      name: 'Debit Card',
      duration: 'instant',
      icon: IconName.Card,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves unknown cryptoCurrency strings unchanged', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency: 'unknown:asset:id',
            paymentMethod: 'credit_debit_card',
            fiatAmount: 100,
          },
        },
      ],
    });

    const migratedState = migrate(state) as TestState;

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).cryptoCurrency,
    ).toBe('unknown:asset:id');

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).paymentMethod,
    ).toEqual({
      id: 'credit_debit_card',
      name: 'Debit Card',
      duration: 'instant',
      icon: IconName.Card,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves unknown paymentMethod strings unchanged', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency: 'eip155:1/slip44:60',
            paymentMethod: 'unknown_payment_method',
            fiatAmount: 100,
          },
        },
      ],
    });

    const migratedState = migrate(state) as TestState;

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).cryptoCurrency,
    ).toEqual({
      assetId: 'eip155:1/slip44:60',
      chainId: 'eip155:1',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
    });

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).paymentMethod,
    ).toBe('unknown_payment_method');

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not modify fields that are already objects', () => {
    const existingCryptoObject = {
      assetId: 'eip155:1/slip44:60',
      symbol: 'ETH',
      name: 'Ethereum',
    };

    const existingPaymentObject = {
      id: 'apple_pay',
      name: 'Apple Pay',
    };

    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency: existingCryptoObject,
            paymentMethod: existingPaymentObject,
            fiatAmount: 100,
          },
        },
      ],
    });

    const migratedState = migrate(state) as TestState;

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).cryptoCurrency,
    ).toBe(existingCryptoObject);
    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).paymentMethod,
    ).toBe(existingPaymentObject);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('preserves other order properties when migrating', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          createdAt: 1673886669608,
          amount: 100,
          state: 'COMPLETED',
          data: {
            cryptoCurrency:
              'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            paymentMethod: 'sepa_bank_transfer',
            fiatAmount: 100,
            network: 'ethereum',
            walletAddress: '0x123',
          },
        },
      ],
      selectedRegion: { name: 'US' },
    });

    const migratedState = migrate(state) as TestState;

    const migratedOrder = migratedState.fiatOrders.orders[0] as TestOrder;

    const orderData = getExpectedOrderData(migratedOrder);
    expect(orderData.cryptoCurrency).toEqual({
      assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: 'eip155:1',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
    });

    expect(orderData.paymentMethod).toEqual({
      id: 'sepa_bank_transfer',
      name: 'SEPA Bank Transfer',
      shortName: 'SEPA',
      duration: '1_to_2_days',
      icon: IconName.Bank,
    });

    expect(migratedOrder.id).toBe('order-1');
    expect(migratedOrder.provider).toBe('DEPOSIT');
    expect(migratedOrder.createdAt).toBe(1673886669608);
    expect(migratedOrder.amount).toBe(100);
    expect(migratedOrder.state).toBe('COMPLETED');
    expect(orderData.fiatAmount).toBe(100);
    expect(orderData.network).toBe('ethereum');
    expect(orderData.walletAddress).toBe('0x123');

    expect(migratedState.fiatOrders.selectedRegion).toEqual({ name: 'US' });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles multiple orders with mixed scenarios', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency: 'eip155:1/slip44:60',
            paymentMethod: 'apple_pay',
          },
        },
        {
          id: 'order-2',
          provider: 'AGGREGATOR',
          data: {
            cryptoCurrency: 'eip155:1/slip44:60',
            paymentMethod: 'apple_pay',
          },
        },
        {
          id: 'order-3',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency: { assetId: 'existing', symbol: 'EXI' },
            paymentMethod: { id: 'existing', name: 'Existing' },
          },
        },
        {
          id: 'order-4',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency: 'unknown:crypto',
            paymentMethod: 'unknown_payment',
          },
        },
      ],
    });

    const migratedState = migrate(state) as TestState;

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).cryptoCurrency,
    ).toEqual({
      assetId: 'eip155:1/slip44:60',
      chainId: 'eip155:1',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
    });
    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).paymentMethod,
    ).toEqual({
      id: 'apple_pay',
      name: 'Apple Pay',
      duration: 'instant',
      icon: IconName.Apple,
      iconColor: {
        light: brandColor.black,
        dark: brandColor.white,
      },
    });

    expect(migratedState.fiatOrders.orders[1]).toEqual(
      state.fiatOrders.orders[1],
    );

    expect(migratedState.fiatOrders.orders[2]).toEqual(
      state.fiatOrders.orders[2],
    );

    expect(migratedState.fiatOrders.orders[3]).toEqual(
      state.fiatOrders.orders[3],
    );

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles migration errors gracefully and returns original state', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency: 'eip155:1/slip44:60',
            paymentMethod: 'apple_pay',
          },
        },
      ],
    });

    const originalMap = jest.spyOn(Array.prototype, 'map');
    originalMap.mockImplementation(() => {
      throw new Error('Migration error');
    });

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 101: Failed to migrate deposit order data',
        ),
      }),
    );

    originalMap.mockRestore();
  });

  it('handles orders without cryptoCurrency or paymentMethod fields', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            fiatAmount: 100,
            network: 'ethereum',
          },
        },
      ],
    });

    const migratedState = migrate(state) as TestState;

    expect(migratedState.fiatOrders.orders[0]).toEqual(
      state.fiatOrders.orders[0],
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('tests USDT Solana token conversion', () => {
    const state = createValidState({
      orders: [
        {
          id: 'order-1',
          provider: 'DEPOSIT',
          orderType: DepositOrderType.Deposit,
          data: {
            cryptoCurrency:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
            paymentMethod: 'wire_transfer',
          },
        },
      ],
    });

    const migratedState = migrate(state) as TestState;

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).cryptoCurrency,
    ).toEqual({
      assetId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      decimals: 6,
      name: 'Tether USD',
      symbol: 'USDT',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB.png',
    });

    expect(
      getExpectedOrderData(migratedState.fiatOrders.orders[0]).paymentMethod,
    ).toEqual({
      id: 'wire_transfer',
      name: 'Wire Transfer',
      shortName: 'Wire',
      duration: '1_to_2_days',
      icon: IconName.Bank,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
