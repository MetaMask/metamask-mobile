import reducer, {
  initialState,
  setLastKnownMoneyBalance,
  clearLastKnownMoneyBalance,
  setMoneyAccountRedeemableRaw,
  selectLastKnownMoneyBalance,
  selectMoneyAccountRedeemable,
  getUsableMoneyAccountRedeemableRaw,
  isPersistedMoneyBalanceUsable,
  PersistedMoneyBalance,
  PersistedRedeemableRaw,
  MoneyBalanceSliceState,
} from '.';
import { RootState } from '../../../../reducers';

const balance: PersistedMoneyBalance = {
  address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
  value: '$2,384.34',
  currency: 'usd',
  updatedAt: 1700000000000,
};

const redeemable: PersistedRedeemableRaw = {
  address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
  raw: '15019083',
};

describe('moneyBalance slice', () => {
  it('returns the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    expect(initialState.lastKnownBalance).toBeNull();
    expect(initialState.redeemable).toBeNull();
  });

  it('setLastKnownMoneyBalance stores the balance', () => {
    const state = reducer(initialState, setLastKnownMoneyBalance(balance));

    expect(state.lastKnownBalance).toEqual(balance);
  });

  it('clearLastKnownMoneyBalance resets the balance to null', () => {
    const populated: MoneyBalanceSliceState = {
      lastKnownBalance: balance,
      redeemable: null,
    };

    const state = reducer(populated, clearLastKnownMoneyBalance());

    expect(state.lastKnownBalance).toBeNull();
  });

  it('setMoneyAccountRedeemableRaw stores and clears the redeemable', () => {
    const stored = reducer(
      initialState,
      setMoneyAccountRedeemableRaw(redeemable),
    );
    expect(stored.redeemable).toEqual(redeemable);

    const cleared = reducer(stored, setMoneyAccountRedeemableRaw(null));
    expect(cleared.redeemable).toBeNull();
  });

  it('selectLastKnownMoneyBalance returns the stored balance', () => {
    const state = {
      moneyBalance: { lastKnownBalance: balance },
    } as unknown as RootState;

    expect(selectLastKnownMoneyBalance(state)).toEqual(balance);
  });

  it('selectMoneyAccountRedeemable returns the stored redeemable', () => {
    const state = {
      moneyBalance: { redeemable },
    } as unknown as RootState;

    expect(selectMoneyAccountRedeemable(state)).toEqual(redeemable);
  });

  describe('getUsableMoneyAccountRedeemableRaw', () => {
    it('returns the raw value when the address matches', () => {
      expect(
        getUsableMoneyAccountRedeemableRaw(redeemable, redeemable.address),
      ).toBe('15019083');
    });

    it('returns undefined when the address does not match', () => {
      expect(
        getUsableMoneyAccountRedeemableRaw(redeemable, '0xdifferent'),
      ).toBeUndefined();
    });

    it('returns undefined when there is no cached redeemable', () => {
      expect(
        getUsableMoneyAccountRedeemableRaw(null, redeemable.address),
      ).toBeUndefined();
    });

    it('returns undefined when no active address is provided', () => {
      expect(
        getUsableMoneyAccountRedeemableRaw(redeemable, undefined),
      ).toBeUndefined();
    });
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
