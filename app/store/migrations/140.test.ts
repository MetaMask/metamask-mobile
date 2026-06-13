import { captureException } from '@sentry/react-native';

import migrate, { migrationVersion } from './140';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

interface TestState {
  fiatOrders?: { orders: unknown[] };
  engine: {
    backgroundState: Record<string, unknown>;
  };
}

function buildState(overrides: Partial<TestState> = {}): TestState {
  return {
    fiatOrders: {
      orders: [
        { id: 'dev-panel-aggregator-order', provider: 'AGGREGATOR' },
        { id: 'dev-panel-deposit-order', provider: 'DEPOSIT' },
        { id: 'dev-panel-sell-order', provider: 'AGGREGATOR' },
        { id: 'real-order-1', provider: 'AGGREGATOR' },
      ],
    },
    engine: {
      backgroundState: {
        RampsController: {
          orders: [
            {
              providerOrderId: 'dev-panel-ramps-order',
              provider: { id: 'paypal' },
            },
            {
              providerOrderId: 'real-ramps-order',
              provider: { id: '/providers/transak' },
            },
          ],
        },
        BridgeStatusController: {
          txHistory: {
            'dev-panel-bridge-tx': { status: { status: 'COMPLETE' } },
            'real-bridge-tx': { status: { status: 'COMPLETE' } },
          },
        },
        TransactionController: {
          transactions: [
            { id: 'dev-panel-bridge-tx', status: 'confirmed' },
            { id: 'real-tx', status: 'confirmed' },
          ],
        },
      },
    },
    ...overrides,
  };
}

describe(`Migration ${migrationVersion}: Remove Navigation Dev Panel seeded data`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged if ensureValidState returns false', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes dev-panel fiat orders while keeping real ones', () => {
    const state = buildState();

    const result = migrate(state) as TestState;

    expect(result.fiatOrders?.orders).toStrictEqual([
      { id: 'real-order-1', provider: 'AGGREGATOR' },
    ]);
  });

  it('removes the dev-panel ramps order while keeping real ones', () => {
    const state = buildState();

    const result = migrate(state) as TestState;

    const ramps = result.engine.backgroundState.RampsController as {
      orders: { providerOrderId: string }[];
    };
    expect(ramps.orders).toStrictEqual([
      {
        providerOrderId: 'real-ramps-order',
        provider: { id: '/providers/transak' },
      },
    ]);
  });

  it('removes the dev-panel bridge transaction from history and transactions', () => {
    const state = buildState();

    const result = migrate(state) as TestState;

    const bridge = result.engine.backgroundState.BridgeStatusController as {
      txHistory: Record<string, unknown>;
    };
    const txController = result.engine.backgroundState
      .TransactionController as {
      transactions: { id: string }[];
    };

    expect(bridge.txHistory).not.toHaveProperty('dev-panel-bridge-tx');
    expect(bridge.txHistory).toHaveProperty('real-bridge-tx');
    expect(txController.transactions).toStrictEqual([
      { id: 'real-tx', status: 'confirmed' },
    ]);
  });

  it('returns state unchanged when affected slices are missing', () => {
    const state = { engine: { backgroundState: {} } };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('ignores non-array / malformed slices without throwing', () => {
    const state = {
      fiatOrders: { orders: 'not-an-array' },
      engine: {
        backgroundState: {
          RampsController: { orders: null },
          BridgeStatusController: { txHistory: 'nope' },
          TransactionController: { transactions: undefined },
        },
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
