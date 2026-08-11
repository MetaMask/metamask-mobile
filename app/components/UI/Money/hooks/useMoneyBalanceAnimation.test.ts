import { act, waitFor } from '@testing-library/react-native';
import {
  renderHookWithProvider,
  type ProviderValues,
} from '../../../../util/test/renderWithProvider';
import {
  markMoneyBalanceUserOp,
  type PersistedMoneyBalance,
} from '../../../../core/redux/slices/moneyBalance';
import useMoneyBalanceAnimation from './useMoneyBalanceAnimation';

const MONEY_ADDRESS = '0x0000000000000000000000000000000000000abc';
const OTHER_ADDRESS = '0x0000000000000000000000000000000000000def';

// The account in view is the one input that cannot be moved through the store:
// it is derived from Engine background state, which only changes when Engine
// itself emits. Everything else this hook reads is real Redux.
const mockUseMoneyAccountInfo = jest.fn();
jest.mock('./useMoneyAccountInfo', () => ({
  __esModule: true,
  default: () => mockUseMoneyAccountInfo(),
}));

const ANCHOR: PersistedMoneyBalance = {
  address: MONEY_ADDRESS,
  value: '$100.00',
  amount: 100,
  currency: 'usd',
  updatedAt: 1,
};

const arrangeState = ({
  lastKnownBalance = ANCHOR as PersistedMoneyBalance | null,
  hasPendingUserOp = false,
  currency = 'usd',
} = {}): ProviderValues['state'] =>
  ({
    engine: {
      backgroundState: {
        CurrencyRateController: {
          currentCurrency: currency,
          currencyRates: {},
        },
        RemoteFeatureFlagController: { remoteFeatureFlags: {} },
      },
    },
    moneyBalance: { lastKnownBalance, hasPendingUserOp },
  }) as ProviderValues['state'];

const renderBalance = (state: ProviderValues['state'] = arrangeState()) =>
  renderHookWithProvider<
    ReturnType<typeof useMoneyBalanceAnimation>,
    number | undefined
  >((amount) => useMoneyBalanceAnimation(amount), { state });

describe('useMoneyBalanceAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountInfo.mockReturnValue({
      primaryMoneyAccount: { address: MONEY_ADDRESS },
    });
  });

  it('seeds from the persisted anchor before a balance arrives', () => {
    const { result } = renderBalance();

    expect(result.current.amount).toBe(100);
    expect(result.current.animated).toBe(false);
  });

  it('rolls from the anchor to the first resolved balance', async () => {
    const { result, rerender } = renderBalance();

    rerender(120.5);

    await waitFor(() => expect(result.current.amount).toBe(120.5));
    expect(result.current.animated).toBe(true);
  });

  it('does not roll a first ever load with no anchor', () => {
    const { result, rerender } = renderBalance(
      arrangeState({ lastKnownBalance: null }),
    );

    rerender(120.5);

    expect(result.current.amount).toBe(120.5);
    expect(result.current.animated).toBe(false);
  });

  it('leaves a background poll silent', () => {
    const { result, rerender } = renderBalance(
      arrangeState({ lastKnownBalance: null }),
    );
    rerender(120.5);

    rerender(130.75);

    expect(result.current.amount).toBe(130.75);
    expect(result.current.animated).toBe(false);
  });

  it('rolls a change the user caused and consumes the signal in the store', async () => {
    const { result, rerender, store } = renderBalance(
      arrangeState({ lastKnownBalance: null }),
    );
    rerender(120.5);

    act(() => {
      store.dispatch(markMoneyBalanceUserOp());
    });
    rerender(220.5);

    await waitFor(() => expect(result.current.amount).toBe(220.5));
    expect(result.current.animated).toBe(true);
    expect(store.getState().moneyBalance.hasPendingUserOp).toBe(false);
  });

  it('keeps the user-op signal while the balance has not visibly moved', () => {
    const { rerender, store } = renderBalance(
      arrangeState({ hasPendingUserOp: true }),
    );

    rerender(100);

    expect(store.getState().moneyBalance.hasPendingUserOp).toBe(true);
  });

  it('keeps the signal through drift that does not move the rendered figure', () => {
    const { rerender, store } = renderBalance(
      arrangeState({ hasPendingUserOp: true }),
    );
    rerender(100);

    rerender(100.004);

    expect(store.getState().moneyBalance.hasPendingUserOp).toBe(true);
  });

  it('ignores drift below the rendered precision', () => {
    const { result, rerender } = renderBalance(
      arrangeState({ lastKnownBalance: null }),
    );
    rerender(120.5);

    rerender(120.500004);

    expect(result.current.amount).toBe(120.5);
    expect(result.current.animated).toBe(false);
  });

  it('replaces the figure outright when the account changes', () => {
    const { result, rerender } = renderBalance();
    rerender(120.5);

    mockUseMoneyAccountInfo.mockReturnValue({
      primaryMoneyAccount: { address: OTHER_ADDRESS },
    });
    rerender(999.99);

    expect(result.current.amount).toBe(999.99);
    expect(result.current.animated).toBe(false);
  });

  it('reports no amount while the account in view has changed but its balance has not landed', () => {
    const { result, rerender } = renderBalance();
    rerender(120.5);

    mockUseMoneyAccountInfo.mockReturnValue({
      primaryMoneyAccount: { address: OTHER_ADDRESS },
    });
    rerender(undefined);

    expect(result.current.amount).toBeUndefined();
    expect(result.current.animated).toBe(false);
  });

  it('ignores an anchor persisted for a different account', () => {
    const { result } = renderBalance(
      arrangeState({ lastKnownBalance: { ...ANCHOR, address: OTHER_ADDRESS } }),
    );

    expect(result.current.amount).toBeUndefined();
  });

  it('ignores an anchor persisted in a different currency', () => {
    const { result } = renderBalance(
      arrangeState({ lastKnownBalance: { ...ANCHOR, currency: 'eur' } }),
    );

    expect(result.current.amount).toBeUndefined();
  });

  it('has no anchor when the persisted entry predates the numeric field', () => {
    const { result, rerender } = renderBalance(
      arrangeState({ lastKnownBalance: { ...ANCHOR, amount: undefined } }),
    );

    rerender(120.5);

    expect(result.current.amount).toBe(120.5);
    expect(result.current.animated).toBe(false);
  });
});
