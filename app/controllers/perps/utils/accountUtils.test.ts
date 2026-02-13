import type { AccountState } from '../types';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import {
  aggregateAccountStates,
  calculateWeightedReturnOnEquity,
} from './accountUtils';

describe('aggregateAccountStates', () => {
  const fallback: AccountState = {
    availableBalance: PERPS_CONSTANTS.FallbackDataDisplay,
    totalBalance: PERPS_CONSTANTS.FallbackDataDisplay,
    marginUsed: PERPS_CONSTANTS.FallbackDataDisplay,
    unrealizedPnl: PERPS_CONSTANTS.FallbackDataDisplay,
    returnOnEquity: PERPS_CONSTANTS.FallbackDataDisplay,
  };

  it('returns fallback when given an empty array', () => {
    expect(aggregateAccountStates([])).toEqual(fallback);
  });

  it('returns the single state unchanged when given one element', () => {
    const single: AccountState = {
      availableBalance: '100',
      totalBalance: '200',
      marginUsed: '50',
      unrealizedPnl: '10',
      returnOnEquity: '20',
    };
    expect(aggregateAccountStates([single])).toEqual(single);
  });

  it('sums numeric fields from two states and recalculates ROE', () => {
    const stateA: AccountState = {
      availableBalance: '100',
      totalBalance: '200',
      marginUsed: '50',
      unrealizedPnl: '10',
      returnOnEquity: '20',
    };
    const stateB: AccountState = {
      availableBalance: '50',
      totalBalance: '150',
      marginUsed: '30',
      unrealizedPnl: '6',
      returnOnEquity: '20',
    };

    const result = aggregateAccountStates([stateA, stateB]);

    expect(parseFloat(result.availableBalance)).toBe(150);
    expect(parseFloat(result.totalBalance)).toBe(350);
    expect(parseFloat(result.marginUsed)).toBe(80);
    expect(parseFloat(result.unrealizedPnl)).toBe(16);
    // ROE = (16 / 80) * 100 = 20
    expect(parseFloat(result.returnOnEquity)).toBe(20);
  });

  it('sums numeric fields from three states', () => {
    const states: AccountState[] = [
      {
        availableBalance: '100',
        totalBalance: '200',
        marginUsed: '50',
        unrealizedPnl: '10',
        returnOnEquity: '20',
      },
      {
        availableBalance: '200',
        totalBalance: '300',
        marginUsed: '100',
        unrealizedPnl: '30',
        returnOnEquity: '30',
      },
      {
        availableBalance: '50',
        totalBalance: '100',
        marginUsed: '50',
        unrealizedPnl: '5',
        returnOnEquity: '10',
      },
    ];

    const result = aggregateAccountStates(states);

    expect(parseFloat(result.availableBalance)).toBe(350);
    expect(parseFloat(result.totalBalance)).toBe(600);
    expect(parseFloat(result.marginUsed)).toBe(200);
    expect(parseFloat(result.unrealizedPnl)).toBe(45);
    // ROE = (45 / 200) * 100 = 22.5
    expect(parseFloat(result.returnOnEquity)).toBe(22.5);
  });

  it('does not mutate the input state object', () => {
    const single: AccountState = {
      availableBalance: '100',
      totalBalance: '200',
      marginUsed: '50',
      unrealizedPnl: '10',
      returnOnEquity: '99',
    };
    const result = aggregateAccountStates([single]);
    // result gets recalculated ROE = (10/50)*100 = 20
    expect(result.returnOnEquity).toBe('20');
    // original must be untouched
    expect(single.returnOnEquity).toBe('99');
  });

  it('sets ROE to 0 when total marginUsed is 0', () => {
    const state: AccountState = {
      availableBalance: '100',
      totalBalance: '100',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    };
    const result = aggregateAccountStates([state]);
    expect(result.returnOnEquity).toBe('0');
  });

  it('handles negative unrealizedPnl correctly', () => {
    const stateA: AccountState = {
      availableBalance: '80',
      totalBalance: '180',
      marginUsed: '100',
      unrealizedPnl: '-20',
      returnOnEquity: '-20',
    };
    const stateB: AccountState = {
      availableBalance: '40',
      totalBalance: '90',
      marginUsed: '50',
      unrealizedPnl: '-10',
      returnOnEquity: '-20',
    };

    const result = aggregateAccountStates([stateA, stateB]);

    expect(parseFloat(result.marginUsed)).toBe(150);
    expect(parseFloat(result.unrealizedPnl)).toBe(-30);
    // ROE = (-30 / 150) * 100 = -20
    expect(parseFloat(result.returnOnEquity)).toBe(-20);
  });

  it('handles decimal values correctly', () => {
    const stateA: AccountState = {
      availableBalance: '100.50',
      totalBalance: '200.75',
      marginUsed: '50.25',
      unrealizedPnl: '10.10',
      returnOnEquity: '20.1',
    };
    const stateB: AccountState = {
      availableBalance: '50.50',
      totalBalance: '150.25',
      marginUsed: '30.75',
      unrealizedPnl: '6.90',
      returnOnEquity: '22.4',
    };

    const result = aggregateAccountStates([stateA, stateB]);

    expect(parseFloat(result.availableBalance)).toBeCloseTo(151, 0);
    expect(parseFloat(result.totalBalance)).toBeCloseTo(351, 0);
    expect(parseFloat(result.marginUsed)).toBeCloseTo(81, 0);
    expect(parseFloat(result.unrealizedPnl)).toBeCloseTo(17, 0);
  });
});

describe('calculateWeightedReturnOnEquity', () => {
  it('returns 0 for empty array', () => {
    expect(calculateWeightedReturnOnEquity([])).toBe('0');
  });

  it('returns the single account ROE for one account', () => {
    const result = calculateWeightedReturnOnEquity([
      { unrealizedPnl: '10', returnOnEquity: '20' },
    ]);
    expect(parseFloat(result)).toBeCloseTo(20, 5);
  });
});
