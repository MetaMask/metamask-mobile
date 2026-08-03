import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import useMoneyBalanceAnimation from './useMoneyBalanceAnimation';
import {
  clearMoneyBalanceUserOp,
  selectHasPendingMoneyBalanceUserOp,
  selectLastKnownMoneyBalance,
  type PersistedMoneyBalance,
} from '../../../../core/redux/slices/moneyBalance';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

const mockAddress = '0xabc';
const mockUseMoneyAccountInfo = jest.fn();
jest.mock('./useMoneyAccountInfo', () => ({
  __esModule: true,
  default: () => mockUseMoneyAccountInfo(),
}));

const ANCHOR: PersistedMoneyBalance = {
  address: mockAddress,
  value: '$100.00',
  amount: 100,
  currency: 'USD',
  updatedAt: 1,
};

const arrangeSelectors = ({
  lastKnownBalance = ANCHOR as PersistedMoneyBalance | null,
  hasPendingUserOp = false,
  currency = 'USD',
} = {}) => {
  (useSelector as jest.Mock).mockImplementation((selector) => {
    if (selector === selectLastKnownMoneyBalance) return lastKnownBalance;
    if (selector === selectHasPendingMoneyBalanceUserOp)
      return hasPendingUserOp;
    if (selector === selectCurrentCurrency) return currency;
    return undefined;
  });
};

describe('useMoneyBalanceAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountInfo.mockReturnValue({
      primaryMoneyAccount: { address: mockAddress },
    });
    arrangeSelectors();
  });

  it('seeds from the persisted anchor before a balance arrives', () => {
    const { result } = renderHook(() => useMoneyBalanceAnimation(undefined));

    expect(result.current.amount).toBe(100);
    expect(result.current.animated).toBe(false);
  });

  it('rolls from the anchor to the first resolved balance', async () => {
    const { result } = renderHook(() => useMoneyBalanceAnimation(120.5));

    // The roll is held back a frame so NumberFlow can measure its font first.
    expect(result.current.amount).toBe(100);

    await waitFor(() => {
      expect(result.current.amount).toBe(120.5);
    });
    expect(result.current.animated).toBe(true);
  });

  it('does not roll a first ever load with no anchor', () => {
    arrangeSelectors({ lastKnownBalance: null });

    const { result } = renderHook(() => useMoneyBalanceAnimation(120.5));

    expect(result.current.amount).toBe(120.5);
    expect(result.current.animated).toBe(false);
  });

  it('leaves a background poll silent', () => {
    const { result, rerender } = renderHook(
      (amount: number) => useMoneyBalanceAnimation(amount),
      { initialProps: 120.5 },
    );

    rerender(130.75);

    expect(result.current.amount).toBe(130.75);
    expect(result.current.animated).toBe(false);
  });

  it('rolls a change the user caused and consumes the signal', async () => {
    const { result, rerender } = renderHook(
      (amount: number) => useMoneyBalanceAnimation(amount),
      { initialProps: 120.5 },
    );

    arrangeSelectors({ hasPendingUserOp: true });
    rerender(220.5);

    await waitFor(() => {
      expect(result.current.amount).toBe(220.5);
    });
    expect(result.current.animated).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith(clearMoneyBalanceUserOp());
  });

  it('keeps the user-op signal until the balance actually moves', () => {
    arrangeSelectors({ hasPendingUserOp: true });

    const { rerender } = renderHook(
      (amount: number) => useMoneyBalanceAnimation(amount),
      { initialProps: 120.5 },
    );

    mockDispatch.mockClear();
    rerender(120.5);

    expect(mockDispatch).not.toHaveBeenCalledWith(clearMoneyBalanceUserOp());
  });

  it('ignores drift below the rendered precision', () => {
    arrangeSelectors({ lastKnownBalance: null });
    const { result, rerender } = renderHook(
      (amount: number) => useMoneyBalanceAnimation(amount),
      { initialProps: 120.5 },
    );

    arrangeSelectors({ lastKnownBalance: null, hasPendingUserOp: true });
    rerender(120.500004);

    expect(result.current.amount).toBe(120.5);
    expect(result.current.animated).toBe(false);
  });

  it('replaces the figure outright when the account changes', () => {
    const { result, rerender } = renderHook(
      (amount: number) => useMoneyBalanceAnimation(amount),
      { initialProps: 120.5 },
    );

    mockUseMoneyAccountInfo.mockReturnValue({
      primaryMoneyAccount: { address: '0xdef' },
    });
    arrangeSelectors({ lastKnownBalance: null, hasPendingUserOp: true });
    rerender(999.99);

    expect(result.current.amount).toBe(999.99);
    expect(result.current.animated).toBe(false);
  });

  it('reports no amount while the account in view has changed but the new balance has not landed', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useMoneyBalanceAnimation>,
      number | undefined
    >((amount) => useMoneyBalanceAnimation(amount), { initialProps: 120.5 });

    mockUseMoneyAccountInfo.mockReturnValue({
      primaryMoneyAccount: { address: '0xdef' },
    });
    arrangeSelectors({ lastKnownBalance: null });
    rerender(undefined);

    // Reporting the previous figure here would show one account's balance
    // under another's name.
    expect(result.current.amount).toBeUndefined();
    expect(result.current.animated).toBe(false);
  });

  it('ignores an anchor persisted for a different account', () => {
    arrangeSelectors({
      lastKnownBalance: { ...ANCHOR, address: '0xdef' },
    });

    const { result } = renderHook(() => useMoneyBalanceAnimation(undefined));

    expect(result.current.amount).toBeUndefined();
  });

  it('has no anchor when the persisted entry predates the numeric field', () => {
    arrangeSelectors({
      lastKnownBalance: { ...ANCHOR, amount: undefined },
    });

    const { result } = renderHook(() => useMoneyBalanceAnimation(120.5));

    expect(result.current.amount).toBe(120.5);
    expect(result.current.animated).toBe(false);
  });
});
