import {
  FRESH_MONEY_BALANCE_WINDOW_MS,
  getFreshMoneyBalanceOptionsFromLocalFlow,
  getMoneyAccountBalanceQueryKey,
} from './moneyAccountBalanceQueryKey';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';

const ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const NOW = 1_700_000_000_000;

describe('getMoneyAccountBalanceQueryKey', () => {
  it('returns the plain facade key when no fresh options are set', () => {
    expect(getMoneyAccountBalanceQueryKey(ADDRESS)).toEqual([
      MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
      ADDRESS,
    ]);
  });

  it('appends fresh options so createUIQueryClient forwards them as args', () => {
    expect(
      getMoneyAccountBalanceQueryKey(ADDRESS, {
        fresh: true,
        minBlock: 42,
      }),
    ).toEqual([
      MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
      ADDRESS,
      { fresh: true, minBlock: 42 },
    ]);
  });
});

describe('getFreshMoneyBalanceOptionsFromLocalFlow', () => {
  it('returns undefined when there is no usable local flow', () => {
    expect(
      getFreshMoneyBalanceOptionsFromLocalFlow(null, ADDRESS, NOW),
    ).toBeUndefined();
  });

  it('returns fresh options while the post-confirm window is open', () => {
    expect(
      getFreshMoneyBalanceOptionsFromLocalFlow(
        { address: ADDRESS, confirmedAt: NOW, minBlock: 42 },
        ADDRESS,
        NOW + 1_000,
      ),
    ).toEqual({ fresh: true, minBlock: 42 });
  });

  it('omits minBlock when the local flow did not record one', () => {
    expect(
      getFreshMoneyBalanceOptionsFromLocalFlow(
        { address: ADDRESS, confirmedAt: NOW },
        ADDRESS,
        NOW,
      ),
    ).toEqual({ fresh: true });
  });

  it('returns undefined once the fresh window has elapsed', () => {
    expect(
      getFreshMoneyBalanceOptionsFromLocalFlow(
        { address: ADDRESS, confirmedAt: NOW, minBlock: 42 },
        ADDRESS,
        NOW + FRESH_MONEY_BALANCE_WINDOW_MS,
      ),
    ).toBeUndefined();
  });

  it('returns undefined for a local flow belonging to another account', () => {
    expect(
      getFreshMoneyBalanceOptionsFromLocalFlow(
        {
          address: '0x0000000000000000000000000000000000000001',
          confirmedAt: NOW,
          minBlock: 42,
        },
        ADDRESS,
        NOW,
      ),
    ).toBeUndefined();
  });
});
