import { Json } from '@metamask/utils';
import {
  FRESH_MONEY_BALANCE_WINDOW_MS,
  armFreshMoneyBalanceWindow,
  clearFreshMoneyBalanceWindow,
  withFreshMoneyBalanceOptions,
} from './moneyBalanceFreshWindow';

const ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const NOW = 1_700_000_000_000;

const facadeCall = (params: Json[] = [ADDRESS]) =>
  withFreshMoneyBalanceOptions(
    'MoneyAccountBalanceService:fetchBalanceWithFallback',
    params,
    NOW,
  );

describe('moneyBalanceFreshWindow', () => {
  afterEach(() => {
    clearFreshMoneyBalanceWindow();
  });

  it('leaves a facade call unchanged when no window is armed', () => {
    expect(facadeCall()).toEqual([ADDRESS]);
  });

  it('appends fresh and minBlock while the window is open for that account', () => {
    armFreshMoneyBalanceWindow(ADDRESS, 42, NOW);

    expect(facadeCall()).toEqual([ADDRESS, { fresh: true, minBlock: 42 }]);
    expect(facadeCall([ADDRESS.toLowerCase()])).toEqual([
      ADDRESS.toLowerCase(),
      { fresh: true, minBlock: 42 },
    ]);
  });

  it('omits minBlock when the confirmed block was unknown', () => {
    armFreshMoneyBalanceWindow(ADDRESS, undefined, NOW);

    expect(facadeCall()).toEqual([ADDRESS, { fresh: true }]);
  });

  it('does not rewrite a call that already passes options', () => {
    armFreshMoneyBalanceWindow(ADDRESS, 42, NOW);

    expect(facadeCall([ADDRESS, { fresh: false }])).toEqual([
      ADDRESS,
      { fresh: false },
    ]);
  });

  it('does not rewrite other messenger actions', () => {
    armFreshMoneyBalanceWindow(ADDRESS, 42, NOW);

    expect(
      withFreshMoneyBalanceOptions(
        'MoneyAccountBalanceService:getMoneyAccountBalance',
        [ADDRESS],
        NOW,
      ),
    ).toEqual([ADDRESS]);
  });

  it('stops appending options once the window has elapsed', () => {
    armFreshMoneyBalanceWindow(ADDRESS, 42, NOW);

    expect(
      withFreshMoneyBalanceOptions(
        'MoneyAccountBalanceService:fetchBalanceWithFallback',
        [ADDRESS],
        NOW + FRESH_MONEY_BALANCE_WINDOW_MS,
      ),
    ).toEqual([ADDRESS]);
  });

  it('does not apply a window armed for a different account', () => {
    armFreshMoneyBalanceWindow(
      '0x0000000000000000000000000000000000000001',
      42,
      NOW,
    );

    expect(facadeCall()).toEqual([ADDRESS]);
  });
});
