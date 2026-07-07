import { renderHook, act } from '@testing-library/react-native';
import {
  useWalletHomeOnboardingFundStepBalanceGate,
  WALLET_HOME_ONBOARDING_FUND_STEP_POSITIVE_BALANCE_DEBOUNCE_MS,
  WALLET_HOME_ONBOARDING_FUND_STEP_ZERO_BALANCE_GRACE_MS,
} from './useWalletHomeOnboardingFundStepBalanceGate';

describe('useWalletHomeOnboardingFundStepBalanceGate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false when disabled', () => {
    const { result } = renderHook(() =>
      useWalletHomeOnboardingFundStepBalanceGate({
        enabled: false,
        accountGroupBalance: { totalBalanceInUserCurrency: 100 },
        groupId: 'wallet-1/group-1',
      }),
    );

    act(() => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_FUND_STEP_POSITIVE_BALANCE_DEBOUNCE_MS + 100,
      );
    });

    expect(result.current).toBe(false);
  });

  it('returns false while balance is zero or null', () => {
    const { result, rerender } = renderHook(
      (
        props: Parameters<typeof useWalletHomeOnboardingFundStepBalanceGate>[0],
      ) => useWalletHomeOnboardingFundStepBalanceGate(props),
      {
        initialProps: {
          enabled: true,
          accountGroupBalance: null,
          groupId: 'wallet-1/group-1',
        },
      },
    );

    act(() => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_FUND_STEP_ZERO_BALANCE_GRACE_MS,
      );
    });
    expect(result.current).toBe(false);

    rerender({
      enabled: true,
      accountGroupBalance: null,
      groupId: 'wallet-1/group-1',
    });

    act(() => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_FUND_STEP_ZERO_BALANCE_GRACE_MS,
      );
    });
    expect(result.current).toBe(false);
  });

  it('returns true after debounce when balance becomes positive', () => {
    const { result, rerender } = renderHook(
      (
        props: Parameters<typeof useWalletHomeOnboardingFundStepBalanceGate>[0],
      ) => useWalletHomeOnboardingFundStepBalanceGate(props),
      {
        initialProps: {
          enabled: true,
          accountGroupBalance: { totalBalanceInUserCurrency: 0 },
          groupId: 'wallet-1/group-1',
        },
      },
    );

    rerender({
      enabled: true,
      accountGroupBalance: { totalBalanceInUserCurrency: 250 },
      groupId: 'wallet-1/group-1',
    });

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_FUND_STEP_POSITIVE_BALANCE_DEBOUNCE_MS,
      );
    });

    expect(result.current).toBe(true);
  });

  it('does not advance when balance becomes positive after the zero-balance grace period', () => {
    const { result, rerender } = renderHook(
      (
        props: Parameters<typeof useWalletHomeOnboardingFundStepBalanceGate>[0],
      ) => useWalletHomeOnboardingFundStepBalanceGate(props),
      {
        initialProps: {
          enabled: true,
          accountGroupBalance: { totalBalanceInUserCurrency: 0 },
          groupId: 'wallet-1/group-1',
        },
      },
    );

    act(() => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_FUND_STEP_ZERO_BALANCE_GRACE_MS,
      );
    });

    rerender({
      enabled: true,
      accountGroupBalance: { totalBalanceInUserCurrency: 250 },
      groupId: 'wallet-1/group-1',
    });

    act(() => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_FUND_STEP_POSITIVE_BALANCE_DEBOUNCE_MS,
      );
    });

    expect(result.current).toBe(false);
  });

  it('does not advance when a positive reading corrects to zero before debounce', () => {
    const { result, rerender } = renderHook(
      (
        props: Parameters<typeof useWalletHomeOnboardingFundStepBalanceGate>[0],
      ) => useWalletHomeOnboardingFundStepBalanceGate(props),
      {
        initialProps: {
          enabled: true,
          accountGroupBalance: { totalBalanceInUserCurrency: 42 },
          groupId: 'wallet-1/group-1',
        },
      },
    );

    rerender({
      enabled: true,
      accountGroupBalance: { totalBalanceInUserCurrency: 0 },
      groupId: 'wallet-1/group-1',
    });

    act(() => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_FUND_STEP_POSITIVE_BALANCE_DEBOUNCE_MS + 100,
      );
    });

    expect(result.current).toBe(false);
  });

  it('resets when the selected account group changes', () => {
    const { result, rerender } = renderHook(
      (
        props: Parameters<typeof useWalletHomeOnboardingFundStepBalanceGate>[0],
      ) => useWalletHomeOnboardingFundStepBalanceGate(props),
      {
        initialProps: {
          enabled: true,
          accountGroupBalance: { totalBalanceInUserCurrency: 100 },
          groupId: 'wallet-1/group-1',
        },
      },
    );

    act(() => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_FUND_STEP_POSITIVE_BALANCE_DEBOUNCE_MS,
      );
    });
    expect(result.current).toBe(true);

    rerender({
      enabled: true,
      accountGroupBalance: { totalBalanceInUserCurrency: 100 },
      groupId: 'wallet-1/group-2',
    });

    expect(result.current).toBe(false);
  });

  it('opens the gate when accountGroupBalance catches up after groupBalance was already positive', () => {
    const { result, rerender } = renderHook(
      (
        props: Parameters<typeof useWalletHomeOnboardingFundStepBalanceGate>[0],
      ) => useWalletHomeOnboardingFundStepBalanceGate(props),
      {
        initialProps: {
          enabled: true,
          accountGroupBalance: { totalBalanceInUserCurrency: 500 },
          groupId: 'wallet-1/group-1',
        },
      },
    );

    rerender({
      enabled: true,
      accountGroupBalance: { totalBalanceInUserCurrency: 500 },
      groupId: 'wallet-1/group-1',
    });

    act(() => {
      jest.advanceTimersByTime(
        WALLET_HOME_ONBOARDING_FUND_STEP_POSITIVE_BALANCE_DEBOUNCE_MS,
      );
    });

    expect(result.current).toBe(true);
  });
});
