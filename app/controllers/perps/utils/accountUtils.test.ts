import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { AccountState } from '../types';

import {
  addSpotBalanceToAccountState,
  aggregateAccountStates,
  calculateWeightedReturnOnEquity,
  getSpotBalance,
} from './accountUtils';

describe('aggregateAccountStates', () => {
  const fallback: AccountState = {
    spendableBalance: PERPS_CONSTANTS.FallbackDataDisplay,
    withdrawableBalance: PERPS_CONSTANTS.FallbackDataDisplay,
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
      spendableBalance: '100',
      withdrawableBalance: '100',
      totalBalance: '200',
      marginUsed: '50',
      unrealizedPnl: '10',
      returnOnEquity: '20',
    };
    expect(aggregateAccountStates([single])).toEqual(single);
  });

  it('sums numeric fields from two states and recalculates ROE', () => {
    const stateA: AccountState = {
      spendableBalance: '100',
      withdrawableBalance: '100',
      totalBalance: '200',
      marginUsed: '50',
      unrealizedPnl: '10',
      returnOnEquity: '20',
    };
    const stateB: AccountState = {
      spendableBalance: '50',
      withdrawableBalance: '50',
      totalBalance: '150',
      marginUsed: '30',
      unrealizedPnl: '6',
      returnOnEquity: '20',
    };

    const result = aggregateAccountStates([stateA, stateB]);

    expect(parseFloat(result.spendableBalance)).toBe(150);
    expect(parseFloat(result.withdrawableBalance)).toBe(150);
    expect(parseFloat(result.totalBalance)).toBe(350);
    expect(parseFloat(result.marginUsed)).toBe(80);
    expect(parseFloat(result.unrealizedPnl)).toBe(16);
    // ROE = (16 / 80) * 100 = 20
    expect(parseFloat(result.returnOnEquity)).toBe(20);
  });

  it('sums numeric fields from three states', () => {
    const states: AccountState[] = [
      {
        spendableBalance: '100',
        withdrawableBalance: '100',
        totalBalance: '200',
        marginUsed: '50',
        unrealizedPnl: '10',
        returnOnEquity: '20',
      },
      {
        spendableBalance: '200',
        withdrawableBalance: '200',
        totalBalance: '300',
        marginUsed: '100',
        unrealizedPnl: '30',
        returnOnEquity: '30',
      },
      {
        spendableBalance: '50',
        withdrawableBalance: '50',
        totalBalance: '100',
        marginUsed: '50',
        unrealizedPnl: '5',
        returnOnEquity: '10',
      },
    ];

    const result = aggregateAccountStates(states);

    expect(parseFloat(result.spendableBalance)).toBe(350);
    expect(parseFloat(result.withdrawableBalance)).toBe(350);
    expect(parseFloat(result.totalBalance)).toBe(600);
    expect(parseFloat(result.marginUsed)).toBe(200);
    expect(parseFloat(result.unrealizedPnl)).toBe(45);
    // ROE = (45 / 200) * 100 = 22.5
    expect(parseFloat(result.returnOnEquity)).toBe(22.5);
  });

  it('does not mutate the input state object', () => {
    const single: AccountState = {
      spendableBalance: '100',
      withdrawableBalance: '100',
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
      spendableBalance: '100',
      withdrawableBalance: '100',
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
      spendableBalance: '80',
      withdrawableBalance: '80',
      totalBalance: '180',
      marginUsed: '100',
      unrealizedPnl: '-20',
      returnOnEquity: '-20',
    };
    const stateB: AccountState = {
      spendableBalance: '40',
      withdrawableBalance: '40',
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
      spendableBalance: '100.50',
      withdrawableBalance: '100.50',
      totalBalance: '200.75',
      marginUsed: '50.25',
      unrealizedPnl: '10.10',
      returnOnEquity: '20.1',
    };
    const stateB: AccountState = {
      spendableBalance: '50.50',
      withdrawableBalance: '50.50',
      totalBalance: '150.25',
      marginUsed: '30.75',
      unrealizedPnl: '6.90',
      returnOnEquity: '22.4',
    };

    const result = aggregateAccountStates([stateA, stateB]);

    expect(parseFloat(result.spendableBalance)).toBeCloseTo(151, 0);
    expect(parseFloat(result.withdrawableBalance)).toBeCloseTo(151, 0);
    expect(parseFloat(result.totalBalance)).toBeCloseTo(351, 0);
    expect(parseFloat(result.marginUsed)).toBeCloseTo(81, 0);
    expect(parseFloat(result.unrealizedPnl)).toBeCloseTo(17, 0);
  });
});

describe('spot balance helpers', () => {
  it('returns zero spot balance when no spot state is provided', () => {
    expect(getSpotBalance()).toBe(0);
  });

  it('bumps totalBalance, spendableBalance, and withdrawableBalance by spot USDC without mutating the input', () => {
    const accountState: AccountState = {
      spendableBalance: '0',
      withdrawableBalance: '0',
      totalBalance: '100',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    };

    const result = addSpotBalanceToAccountState(accountState, {
      balances: [
        { coin: 'USDC', total: '25.5' },
        { coin: 'HYPE', total: '0.5' },
      ],
    } as never);

    // Only USDC contributes — non-stablecoin spot assets are not convertible
    // to perps collateral and must not inflate balances.
    expect(result.totalBalance).toBe('125.5');
    expect(result.spendableBalance).toBe('25.5');
    expect(result.withdrawableBalance).toBe('25.5');
    expect(accountState.totalBalance).toBe('100');
  });

  it('ignores non-collateral spot balances entirely', () => {
    const accountState: AccountState = {
      spendableBalance: '0',
      withdrawableBalance: '0',
      totalBalance: '50',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    };

    const result = addSpotBalanceToAccountState(accountState, {
      balances: [
        { coin: 'HYPE', total: '1000' },
        { coin: 'PURR', total: '5000' },
      ],
    } as never);

    expect(result).toBe(accountState);
  });

  it('excludes USDH-only spot balance from funded-state totals', () => {
    const accountState: AccountState = {
      spendableBalance: '0',
      withdrawableBalance: '0',
      totalBalance: '0',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    };

    const result = addSpotBalanceToAccountState(accountState, {
      balances: [
        { coin: 'USDH', total: '75.25' },
        { coin: 'HYPE', total: '999' },
      ],
    } as never);

    expect(result).toBe(accountState);
  });

  it('adds only the USDC portion when USDC and USDH are both present', () => {
    const accountState: AccountState = {
      spendableBalance: '0',
      withdrawableBalance: '0',
      totalBalance: '10',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    };

    const result = addSpotBalanceToAccountState(accountState, {
      balances: [
        { coin: 'USDC', total: '20' },
        { coin: 'USDH', total: '30' },
        { coin: 'HYPE', total: '9999' },
      ],
    } as never);

    expect(result.totalBalance).toBe('30');
    expect(result.spendableBalance).toBe('20');
    expect(result.withdrawableBalance).toBe('20');
  });

  it('subtracts spot hold from total and only folds free spot into spendable/withdrawable', () => {
    const accountState: AccountState = {
      spendableBalance: '10',
      withdrawableBalance: '10',
      totalBalance: '100',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    };

    const result = addSpotBalanceToAccountState(accountState, {
      balances: [{ coin: 'USDC', total: '40', hold: '15' }],
    } as never);

    // totalBalance += spotTotal - spotHold = 100 + 40 - 15 = 125
    expect(parseFloat(result.totalBalance)).toBe(125);
    // spendable/withdrawable += freeSpot = 10 + (40 - 15) = 35
    expect(parseFloat(result.spendableBalance)).toBe(35);
    expect(parseFloat(result.withdrawableBalance)).toBe(35);
  });

  it('returns the input untouched when no collateral spot balance is present', () => {
    const accountState: AccountState = {
      spendableBalance: '1',
      withdrawableBalance: '1',
      totalBalance: '2',
      marginUsed: '3',
      unrealizedPnl: '4',
      returnOnEquity: '5',
    };

    const result = addSpotBalanceToAccountState(accountState, {
      balances: [],
    } as never);

    expect(result).toBe(accountState);
  });

  it('does NOT fold spot into spendable/withdrawable when foldIntoCollateral is false (e.g. HL Standard mode)', () => {
    const accountState: AccountState = {
      spendableBalance: '5',
      withdrawableBalance: '5',
      totalBalance: '5',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    };

    const result = addSpotBalanceToAccountState(
      accountState,
      { balances: [{ coin: 'USDC', total: '30' }] } as never,
      { foldIntoCollateral: false },
    );

    // Total still reflects combined wealth (display).
    expect(parseFloat(result.totalBalance)).toBe(35);
    // Spendable/withdrawable must remain perps-only — spot isn't auto-collateral
    // on Standard mode, so surfacing a folded value would mislead the validation
    // hook into approving submissions HL will reject.
    expect(result.spendableBalance).toBe('5');
    expect(result.withdrawableBalance).toBe('5');
  });

  it('folds spot into spendable/withdrawable when foldIntoCollateral is explicitly true (parity with default)', () => {
    const accountState: AccountState = {
      spendableBalance: '5',
      withdrawableBalance: '5',
      totalBalance: '5',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    };

    const result = addSpotBalanceToAccountState(
      accountState,
      { balances: [{ coin: 'USDC', total: '30' }] } as never,
      { foldIntoCollateral: true },
    );

    expect(parseFloat(result.totalBalance)).toBe(35);
    expect(parseFloat(result.spendableBalance)).toBe(35);
    expect(parseFloat(result.withdrawableBalance)).toBe(35);
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
