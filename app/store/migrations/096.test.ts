import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import migrate from './096';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('../storage-wrapper', () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createOrder = (overrides = {}) => ({
  provider: 'DEPOSIT',
  network: undefined,
  cryptocurrency: { symbol: 'ETH' },
  ...overrides,
});

describe('Migration 096', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', async () => {
    const state = { some: 'state' };

    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = await migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged if fiatOrders is not a property', async () => {
    const state = { some: 'state' };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalled();
  });

  it('returns state unchanged if fiatOrders.orders is not an array', async () => {
    const state = {
      fiatOrders: {
        orders: 'not an array',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalled();
  });

  it('returns the same state if there are no orders', async () => {
    const state = {
      fiatOrders: {
        orders: [],
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
  });

  it('returns the same state if there are not affected orders', async () => {
    const state = {
      fiatOrders: {
        orders: [
          createOrder({
            provider: 'AGGREGATOR',
            network: 'eip155:1',
            cryptocurrency: 'ETH',
          }),
          createOrder({
            provider: 'AGGREGATOR',
            network: 'eip155:1',
            cryptocurrency: 'BNB',
          }),
          createOrder({
            provider: 'AGGREGATOR',
            network: 'eip155:1',
            cryptocurrency: 'DAI',
          }),
          createOrder({
            provider: 'AGGREGATOR',
            network: 'eip155:1',
            cryptocurrency: 'USDC',
          }),
        ],
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('fixes affected orders by missing network and updates state', async () => {
    const order1 = createOrder({ network: undefined, cryptocurrency: 'ETH' });
    const order2 = createOrder({ network: null, cryptocurrency: 'BNB' });
    const order3 = createOrder({ network: 'eip155:1', cryptocurrency: 'DAI' });
    const order4 = createOrder({
      provider: 'AGGREGATOR',
      network: 'eip155:1',
      cryptocurrency: 'USDC',
    });

    const state = {
      fiatOrders: {
        orders: [order1, order2, order3, order4],
      },
    };

    const expectedState = {
      fiatOrders: {
        orders: [
          { ...order1, network: '', forceUpdate: true },
          { ...order2, network: '', forceUpdate: true },
          order3,
          order4,
        ],
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('fixes affected orders by invalid cryptocurrency type and updates state', async () => {
    const order1 = createOrder({
      network: 'eip155:1',
      cryptocurrency: { symbol: 'ETH' },
    });
    const order2 = createOrder({
      network: 'eip155:1',
      cryptocurrency: { symbol: 'BNB' },
    });
    const order3 = createOrder({ network: 'eip155:1', cryptocurrency: 'DAI' });
    const order4 = createOrder({
      provider: 'AGGREGATOR',
      network: 'eip155:1',
      cryptocurrency: 'USDC',
    });

    const state = {
      fiatOrders: {
        orders: [order1, order2, order3, order4],
      },
    };

    const expectedState = {
      fiatOrders: {
        orders: [
          { ...order1, cryptocurrency: 'ETH', forceUpdate: true },
          { ...order2, cryptocurrency: 'BNB', forceUpdate: true },
          order3,
          order4,
        ],
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('fixes affected orders by missing network and invalid cryptocurrency type and updates state', async () => {
    const order1 = createOrder({
      network: undefined,
      cryptocurrency: { symbol: 'ETH' },
    });
    const order2 = createOrder({
      network: null,
      cryptocurrency: { symbol: 'BNB' },
    });
    const order3 = createOrder({
      network: null,
      cryptocurrency: { symbol: 'USDT', chainId: 'eip155:56' },
    });
    const order4 = createOrder({ network: 'eip155:1', cryptocurrency: 'DAI' });
    const order5 = createOrder({
      provider: 'AGGREGATOR',
      network: 'eip155:1',
      cryptocurrency: 'USDC',
    });

    const state = {
      fiatOrders: {
        orders: [order1, order2, order3, order4, order5],
      },
    };

    const expectedState = {
      fiatOrders: {
        orders: [
          { ...order1, network: '', cryptocurrency: 'ETH', forceUpdate: true },
          { ...order2, network: '', cryptocurrency: 'BNB', forceUpdate: true },
          {
            ...order3,
            network: 'eip155:56',
            cryptocurrency: 'USDT',
            forceUpdate: true,
          },

          order4,
          order5,
        ],
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
