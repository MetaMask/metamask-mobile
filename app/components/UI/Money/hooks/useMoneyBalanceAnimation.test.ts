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

const arrangeAccount = (address: string) =>
  mockUseMoneyAccountInfo.mockReturnValue({
    primaryMoneyAccount: { address },
  });

const renderBalance = (amount?: number) =>
  renderHook<ReturnType<typeof useMoneyBalanceAnimation>, number | undefined>(
    (next) => useMoneyBalanceAnimation(next),
    { initialProps: amount },
  );

describe('useMoneyBalanceAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeAccount(mockAddress);
    arrangeSelectors();
  });

  it('seeds from the persisted anchor before a balance arrives', () => {
    const { result } = renderBalance();

    expect(result.current.amount).toBe(100);
    expect(result.current.animated).toBe(false);
  });

  it('rolls from the anchor to the first resolved balance', async () => {
    const { result } = renderBalance(120.5);

    expect(result.current.amount).toBe(100);

    await waitFor(() => expect(result.current.amount).toBe(120.5));
    expect(result.current.animated).toBe(true);
  });

  it('does not roll a first ever load with no anchor', () => {
    arrangeSelectors({ lastKnownBalance: null });

    const { result } = renderBalance(120.5);

    expect(result.current.amount).toBe(120.5);
    expect(result.current.animated).toBe(false);
  });

  it('leaves a background poll silent', () => {
    const { result, rerender } = renderBalance(120.5);

    rerender(130.75);

    expect(result.current.amount).toBe(130.75);
    expect(result.current.animated).toBe(false);
  });

  it('rolls a change the user caused and consumes the signal', async () => {
    const { result, rerender } = renderBalance(120.5);

    arrangeSelectors({ hasPendingUserOp: true });
    rerender(220.5);

    await waitFor(() => expect(result.current.amount).toBe(220.5));
    expect(result.current.animated).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith(clearMoneyBalanceUserOp());
  });

  it('keeps the user-op signal until the balance actually moves', () => {
    arrangeSelectors({ hasPendingUserOp: true });
    const { rerender } = renderBalance(120.5);

    mockDispatch.mockClear();
    rerender(120.5);

    expect(mockDispatch).not.toHaveBeenCalledWith(clearMoneyBalanceUserOp());
  });

  it('keeps the signal through drift that does not move the rendered figure', () => {
    arrangeSelectors({ lastKnownBalance: null });
    const { rerender } = renderBalance(120.5);

    arrangeSelectors({ lastKnownBalance: null, hasPendingUserOp: true });
    rerender(120.5);
    mockDispatch.mockClear();

    rerender(120.504);

    expect(mockDispatch).not.toHaveBeenCalledWith(clearMoneyBalanceUserOp());
  });

  it('ignores drift below the rendered precision', () => {
    arrangeSelectors({ lastKnownBalance: null });
    const { result, rerender } = renderBalance(120.5);

    arrangeSelectors({ lastKnownBalance: null, hasPendingUserOp: true });
    rerender(120.500004);

    expect(result.current.amount).toBe(120.5);
    expect(result.current.animated).toBe(false);
  });

  it('replaces the figure outright when the account changes', () => {
    const { result, rerender } = renderBalance(120.5);

    arrangeAccount('0xdef');
    arrangeSelectors({ lastKnownBalance: null, hasPendingUserOp: true });
    rerender(999.99);

    expect(result.current.amount).toBe(999.99);
    expect(result.current.animated).toBe(false);
  });

  it('reports no amount while the account in view has changed but the new balance has not landed', () => {
    const { result, rerender } = renderBalance(120.5);

    arrangeAccount('0xdef');
    arrangeSelectors({ lastKnownBalance: null });
    rerender(undefined);

    expect(result.current.amount).toBeUndefined();
    expect(result.current.animated).toBe(false);
  });

  it('ignores an anchor persisted for a different account', () => {
    arrangeSelectors({ lastKnownBalance: { ...ANCHOR, address: '0xdef' } });

    const { result } = renderBalance();

    expect(result.current.amount).toBeUndefined();
  });

  it('has no anchor when the persisted entry predates the numeric field', () => {
    arrangeSelectors({ lastKnownBalance: { ...ANCHOR, amount: undefined } });

    const { result } = renderBalance(120.5);

    expect(result.current.amount).toBe(120.5);
    expect(result.current.animated).toBe(false);
  });
});
