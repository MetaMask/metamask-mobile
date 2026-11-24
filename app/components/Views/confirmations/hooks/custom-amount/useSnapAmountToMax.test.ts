import { renderHook } from '@testing-library/react-native';
import { useSnapAmountToMax } from './useSnapAmountToMax';
import { useTransactionPayBalance } from '../pay/useTransactionPayBalance';
import { useTransactionPayIsMaxAmount } from '../pay/useTransactionPayData';

jest.mock('../pay/useTransactionPayBalance');
jest.mock('../pay/useTransactionPayData');

const useTransactionPayBalanceMock = jest.mocked(useTransactionPayBalance);
const useTransactionPayIsMaxAmountMock = jest.mocked(
  useTransactionPayIsMaxAmount,
);

function runHook({
  balanceUsd = 2.28,
  isMaxAmount = false,
  isMaxAvailable = true,
}: {
  balanceUsd?: number;
  isMaxAmount?: boolean;
  isMaxAvailable?: boolean;
} = {}) {
  useTransactionPayBalanceMock.mockReturnValue({
    balanceRaw: '0',
    balanceUsd,
  });
  useTransactionPayIsMaxAmountMock.mockReturnValue(isMaxAmount);

  return renderHook(() => useSnapAmountToMax({ isMaxAvailable })).result
    .current;
}

describe('useSnapAmountToMax', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('isSnapToMax', () => {
    it('returns true when the amount equals the displayed balance', () => {
      const { isSnapToMax } = runHook({ balanceUsd: 2.28 });

      expect(isSnapToMax('2.28')).toBe(true);
    });

    it('compares against the balance as displayed, truncated to cents', () => {
      const { isSnapToMax } = runHook({ balanceUsd: 2.2795 });

      expect(isSnapToMax('2.27')).toBe(true);
      expect(isSnapToMax('2.28')).toBe(false);
    });

    it('matches amounts regardless of trailing zeros', () => {
      const { isSnapToMax } = runHook({ balanceUsd: 5.1 });

      expect(isSnapToMax('5.1')).toBe(true);
      expect(isSnapToMax('5.10')).toBe(true);
    });

    it('returns false for amounts below the displayed balance', () => {
      const { isSnapToMax } = runHook({ balanceUsd: 2.28 });

      expect(isSnapToMax('2.27')).toBe(false);
    });

    it('returns false for amounts above the displayed balance', () => {
      const { isSnapToMax } = runHook({ balanceUsd: 2.28 });

      expect(isSnapToMax('2.29')).toBe(false);
    });

    it('returns false when Max is not available', () => {
      const { isSnapToMax } = runHook({
        balanceUsd: 2.28,
        isMaxAvailable: false,
      });

      expect(isSnapToMax('2.28')).toBe(false);
    });

    it('returns false when Max is already set', () => {
      const { isSnapToMax } = runHook({ balanceUsd: 2.28, isMaxAmount: true });

      expect(isSnapToMax('2.28')).toBe(false);
    });

    it('returns false when the displayed balance is zero', () => {
      const { isSnapToMax } = runHook({ balanceUsd: 0.004 });

      expect(isSnapToMax('0')).toBe(false);
      expect(isSnapToMax('0.00')).toBe(false);
    });

    it('returns false for empty or invalid amounts', () => {
      const { isSnapToMax } = runHook({ balanceUsd: 2.28 });

      expect(isSnapToMax('')).toBe(false);
      expect(isSnapToMax('abc')).toBe(false);
    });
  });

  describe('resolveAmountFiat', () => {
    it('returns the full-precision balance when the amount snaps', () => {
      const { resolveAmountFiat } = runHook({ balanceUsd: 2.2795 });

      expect(resolveAmountFiat('2.27')).toBe('2.2795');
    });

    it('returns the amount unchanged when it does not snap', () => {
      const { resolveAmountFiat } = runHook({ balanceUsd: 2.2795 });

      expect(resolveAmountFiat('2.26')).toBe('2.26');
      expect(resolveAmountFiat('2.28')).toBe('2.28');
    });

    it('returns the amount unchanged when Max is not available', () => {
      const { resolveAmountFiat } = runHook({
        balanceUsd: 2.2795,
        isMaxAvailable: false,
      });

      expect(resolveAmountFiat('2.27')).toBe('2.27');
    });
  });
});
