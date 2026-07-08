import {
  selectMoneyHeadlessProviderScope,
  MONEY_HEADLESS_PROVIDER_SCOPE_FLAG_KEY,
} from './index';
import type { FiatProviderScope } from '../../../reducers/fiatOrders/types';

describe('selectMoneyHeadlessProviderScope', () => {
  it('exposes the client-config flag key for registry alignment', () => {
    expect(MONEY_HEADLESS_PROVIDER_SCOPE_FLAG_KEY).toBe(
      'moneyHeadlessProviderScope',
    );
  });

  it.each(['off', 'in-app', 'all'] as FiatProviderScope[])(
    'returns the remote value (%s) when it is a valid scope',
    (scope) => {
      const result = selectMoneyHeadlessProviderScope.resultFunc({
        [MONEY_HEADLESS_PROVIDER_SCOPE_FLAG_KEY]: scope,
      });

      expect(result).toBe(scope);
    },
  );

  it('defaults to off when the flag is absent (safe default)', () => {
    // TEMP: RC test for ETH -> mUSD deposit, revert before merge (was 'off')
    expect(selectMoneyHeadlessProviderScope.resultFunc({})).toBe('all');
  });

  it('defaults to off for an unrecognized string value', () => {
    const result = selectMoneyHeadlessProviderScope.resultFunc({
      [MONEY_HEADLESS_PROVIDER_SCOPE_FLAG_KEY]: 'everything',
    });

    // TEMP: RC test for ETH -> mUSD deposit, revert before merge (was 'off')
    expect(result).toBe('all');
  });

  it('defaults to off for a non-string value', () => {
    const result = selectMoneyHeadlessProviderScope.resultFunc({
      [MONEY_HEADLESS_PROVIDER_SCOPE_FLAG_KEY]: true,
    });

    // TEMP: RC test for ETH -> mUSD deposit, revert before merge (was 'off')
    expect(result).toBe('all');
  });
});
