import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useABTest } from '../../../../../hooks/useABTest';
import { useMoneyAccountDepositPrefillEnabled } from './useMoneyAccountDepositPrefillEnabled';
import {
  MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS,
  MoneyAccountDepositPrefillVariant,
} from './abTestConfig';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseABTest = jest.mocked(useABTest);

describe('useMoneyAccountDepositPrefillEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue({ enabled: true });
    mockUseABTest.mockReturnValue({
      variant:
        MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS[
          MoneyAccountDepositPrefillVariant.Treatment
        ],
      variantName: MoneyAccountDepositPrefillVariant.Treatment,
      isActive: true,
    });
  });

  it('returns true for treatment when remote kill-switch is enabled', () => {
    const { result } = renderHook(() => useMoneyAccountDepositPrefillEnabled());
    expect(result.current()).toBe(true);
  });

  it('resolves assignment without tracking experiment exposure', () => {
    renderHook(() => useMoneyAccountDepositPrefillEnabled());

    expect(mockUseABTest).toHaveBeenCalledWith(
      MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
      MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS,
      { trackExposure: false },
    );
  });

  it('returns false for control even when remote kill-switch is enabled', () => {
    mockUseABTest.mockReturnValue({
      variant:
        MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS[
          MoneyAccountDepositPrefillVariant.Control
        ],
      variantName: MoneyAccountDepositPrefillVariant.Control,
      isActive: true,
    });

    const { result } = renderHook(() => useMoneyAccountDepositPrefillEnabled());
    expect(result.current()).toBe(false);
  });

  it('returns true for addMusd on control', () => {
    mockUseABTest.mockReturnValue({
      variant:
        MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS[
          MoneyAccountDepositPrefillVariant.Control
        ],
      variantName: MoneyAccountDepositPrefillVariant.Control,
      isActive: true,
    });

    const { result } = renderHook(() => useMoneyAccountDepositPrefillEnabled());
    expect(result.current('addMusd')).toBe(true);
  });

  it('returns false for card on treatment', () => {
    const { result } = renderHook(() => useMoneyAccountDepositPrefillEnabled());
    expect(result.current('card')).toBe(false);
  });
});
