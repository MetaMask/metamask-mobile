import reducer, {
  initialState,
  setLastKnownMoneyBalance,
  clearLastKnownMoneyBalance,
  setMoneyAccountRedeemableRaw,
  setLastLocalMoneyFlow,
  selectLastKnownMoneyBalance,
  selectLastLocalMoneyFlow,
  selectMoneyAccountRedeemable,
  getUsableMoneyAccountRedeemableRaw,
  getUsableLastLocalFlowConfirmedAt,
  isPersistedMoneyBalanceUsable,
  PersistedMoneyBalance,
  PersistedRedeemableRaw,
  PersistedLocalMoneyFlow,
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

const localFlow: PersistedLocalMoneyFlow = {
  address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
  confirmedAt: 1700000000000,
};

const OTHER_ADDRESS = '0x1234567890123456789012345678901234567890';

describe('moneyBalance slice', () => {
  it('returns the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    expect(initialState.lastKnownBalance).toBeNull();
    expect(initialState.redeemable).toBeNull();
    expect(initialState.lastLocalFlowConfirmedAt).toBeNull();
  });

  it('setLastKnownMoneyBalance stores the balance', () => {
    const state = reducer(initialState, setLastKnownMoneyBalance(balance));

    expect(state.lastKnownBalance).toEqual(balance);
  });

  it('clearLastKnownMoneyBalance resets the balance to null', () => {
    const populated: MoneyBalanceSliceState = {
      lastKnownBalance: balance,
      redeemable: null,
      lastLocalFlowConfirmedAt: null,
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

  it('setLastLocalMoneyFlow stores the account and confirmation time', () => {
    const state = reducer(initialState, setLastLocalMoneyFlow(localFlow));

    expect(state.lastLocalFlowConfirmedAt).toEqual(localFlow);
  });

  it('selectLastLocalMoneyFlow returns the stored marker', () => {
    const state = {
      moneyBalance: { lastLocalFlowConfirmedAt: localFlow },
    } as unknown as RootState;

    expect(selectLastLocalMoneyFlow(state)).toEqual(localFlow);
  });

  it('selectLastLocalMoneyFlow returns null for state persisted before the field existed', () => {
    const state = {
      moneyBalance: { lastKnownBalance: null, redeemable: null },
    } as unknown as RootState;

    expect(selectLastLocalMoneyFlow(state)).toBeNull();
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

  describe('getUsableLastLocalFlowConfirmedAt', () => {
    it('returns the confirmation time when the address matches', () => {
      expect(
        getUsableLastLocalFlowConfirmedAt(localFlow, localFlow.address),
      ).toBe(1700000000000);
    });

    it('returns undefined when the marker belongs to another account', () => {
      expect(
        getUsableLastLocalFlowConfirmedAt(localFlow, OTHER_ADDRESS),
      ).toBeUndefined();
    });

    it('returns undefined for the bare-timestamp shape persisted by older builds', () => {
      expect(
        getUsableLastLocalFlowConfirmedAt(1700000000000, localFlow.address),
      ).toBeUndefined();
    });

    it('returns undefined when no marker has been recorded', () => {
      expect(
        getUsableLastLocalFlowConfirmedAt(null, localFlow.address),
      ).toBeUndefined();
      expect(
        getUsableLastLocalFlowConfirmedAt(undefined, localFlow.address),
      ).toBeUndefined();
    });

    it('returns undefined when there is no active Money account', () => {
      expect(
        getUsableLastLocalFlowConfirmedAt(localFlow, undefined),
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
