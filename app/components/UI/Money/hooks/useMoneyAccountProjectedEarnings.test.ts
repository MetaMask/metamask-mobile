import { renderHook } from '@testing-library/react-native';
import useMoneyAccountBalance from './useMoneyAccountBalance';
import useMoneyVaultApy from './useMoneyVaultApy';
import useMoneyAccountProjectedEarnings from './useMoneyAccountProjectedEarnings';

jest.mock('./useMoneyAccountBalance');
jest.mock('./useMoneyVaultApy');

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);

const setBalance = (totalFiatRaw: string | undefined): void => {
  mockUseMoneyAccountBalance.mockReturnValue({
    totalFiatRaw,
  } as unknown as ReturnType<typeof useMoneyAccountBalance>);
};

const setApy = (apyDecimal: number | undefined): void => {
  mockUseMoneyVaultApy.mockReturnValue({
    apyDecimal,
  } as unknown as ReturnType<typeof useMoneyVaultApy>);
};

describe('useMoneyAccountProjectedEarnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('projects earnings as balance compounded at the vault APY over one year', () => {
    setBalance('60000');
    setApy(0.04);

    const { result } = renderHook(() => useMoneyAccountProjectedEarnings());

    // 60000 * ((1 + 0.04)^1 - 1) === 2400
    expect(result.current.balanceFiat).toBe(60000);
    expect(result.current.apyDecimal).toBe(0.04);
    expect(result.current.projectedAmount).toBeCloseTo(2400, 6);
  });

  it('forwards the enabled option to balance and APY queries', () => {
    setBalance('60000');
    setApy(0.04);

    renderHook(() =>
      useMoneyAccountProjectedEarnings({
        enabled: false,
      }),
    );

    expect(mockUseMoneyAccountBalance).toHaveBeenCalledWith({
      enabled: false,
    });
    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it('returns undefined projection when the balance is unavailable', () => {
    setBalance(undefined);
    setApy(0.04);

    const { result } = renderHook(() => useMoneyAccountProjectedEarnings());

    expect(result.current.balanceFiat).toBeUndefined();
    expect(result.current.projectedAmount).toBeUndefined();
  });

  it('returns undefined projection when the APY is unavailable', () => {
    setBalance('1000');
    setApy(undefined);

    const { result } = renderHook(() => useMoneyAccountProjectedEarnings());

    expect(result.current.apyDecimal).toBeUndefined();
    expect(result.current.projectedAmount).toBeUndefined();
  });

  it('returns undefined balance and projection when the raw balance is not a finite number', () => {
    setBalance('not-a-number');
    setApy(0.04);

    const { result } = renderHook(() => useMoneyAccountProjectedEarnings());

    expect(result.current.balanceFiat).toBeUndefined();
    expect(result.current.projectedAmount).toBeUndefined();
  });

  it('returns zero projection when the balance is zero', () => {
    setBalance('0');
    setApy(0.04);

    const { result } = renderHook(() => useMoneyAccountProjectedEarnings());

    expect(result.current.balanceFiat).toBe(0);
    expect(result.current.projectedAmount).toBe(0);
  });
});
