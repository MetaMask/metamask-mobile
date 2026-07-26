import { AggregatedOrderBookConnection } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import {
  getAggregatedOrderBookConnection,
  resetAggregatedOrderBookConnectionForTesting,
} from './aggregatedOrderBookConnection';

jest.mock('@metamask/perps-controller', () => {
  const MockConnection = jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    subscribe: jest.fn(),
  }));
  return {
    AggregatedOrderBookConnection: MockConnection,
  };
});

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      state: {
        isTestnet: false,
      },
    },
  },
}));

describe('aggregatedOrderBookConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAggregatedOrderBookConnectionForTesting();
  });

  afterEach(() => {
    resetAggregatedOrderBookConnectionForTesting();
  });

  it('creates a singleton AggregatedOrderBookConnection on first access', () => {
    const first = getAggregatedOrderBookConnection();
    const second = getAggregatedOrderBookConnection();

    expect(AggregatedOrderBookConnection).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('passes isTestnet from PerpsController state into the connection', () => {
    getAggregatedOrderBookConnection();

    const constructorArgs = (
      AggregatedOrderBookConnection as unknown as jest.Mock
    ).mock.calls[0][0] as { isTestnet: () => boolean };

    expect(constructorArgs.isTestnet()).toBe(false);

    (
      Engine.context.PerpsController as { state: { isTestnet: boolean } }
    ).state.isTestnet = true;

    expect(constructorArgs.isTestnet()).toBe(true);
  });

  it('builds a fresh connection after a test reset', () => {
    const first = getAggregatedOrderBookConnection();

    resetAggregatedOrderBookConnectionForTesting();
    const second = getAggregatedOrderBookConnection();

    expect(AggregatedOrderBookConnection).toHaveBeenCalledTimes(2);
    expect(first).not.toBe(second);
    expect(first.close).toHaveBeenCalledTimes(1);
  });
});
