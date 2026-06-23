import reducer, {
  initialState,
  setLastKnownMoneyBalance,
  clearLastKnownMoneyBalance,
  selectLastKnownMoneyBalance,
  isPersistedMoneyBalanceUsable,
  PersistedMoneyBalance,
  MoneyBalanceSliceState,
} from '.';
import { RootState } from '../../../../reducers';

const balance: PersistedMoneyBalance = {
  address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
  value: '$2,384.34',
  currency: 'usd',
  updatedAt: 1700000000000,
};

describe('moneyBalance slice', () => {
  it('returns the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    expect(initialState.lastKnownBalance).toBeNull();
  });

  it('setLastKnownMoneyBalance stores the balance', () => {
    const state = reducer(initialState, setLastKnownMoneyBalance(balance));

    expect(state.lastKnownBalance).toEqual(balance);
  });

  it('clearLastKnownMoneyBalance resets the balance to null', () => {
    const populated: MoneyBalanceSliceState = { lastKnownBalance: balance };

    const state = reducer(populated, clearLastKnownMoneyBalance());

    expect(state.lastKnownBalance).toBeNull();
  });

  it('selectLastKnownMoneyBalance returns the stored balance', () => {
    const state = {
      moneyBalance: { lastKnownBalance: balance },
    } as unknown as RootState;

    expect(selectLastKnownMoneyBalance(state)).toEqual(balance);
  });

  describe('isPersistedMoneyBalanceUsable', () => {
    const target = { address: balance.address, currency: 'usd' };

    it('is true when address and currency match', () => {
      expect(isPersistedMoneyBalanceUsable(balance, target)).toBe(true);
    });

    it('is false when there is no persisted balance', () => {
      expect(isPersistedMoneyBalanceUsable(null, target)).toBe(false);
      expect(isPersistedMoneyBalanceUsable(undefined, target)).toBe(false);
    });

    it('is false when the address differs', () => {
      expect(
        isPersistedMoneyBalanceUsable(balance, {
          ...target,
          address: '0xdifferent',
        }),
      ).toBe(false);
    });

    it('is false when the currency differs', () => {
      expect(
        isPersistedMoneyBalanceUsable(balance, { ...target, currency: 'eur' }),
      ).toBe(false);
    });

    it('is false when no account address is in view', () => {
      expect(
        isPersistedMoneyBalanceUsable(balance, {
          address: undefined,
          currency: 'usd',
        }),
      ).toBe(false);
    });
  });
});
