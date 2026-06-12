import { renderHook } from '@testing-library/react-native';
import { useBalanceRefresh } from '../../../../Views/Wallet/hooks/useBalanceRefresh';
import { useWalletHomeOnboardingBalanceRefreshEffect } from './useWalletHomeOnboardingBalanceRefreshEffect';

jest.mock('../../../../Views/Wallet/hooks/useBalanceRefresh', () => ({
  useBalanceRefresh: jest.fn(),
}));

describe('useWalletHomeOnboardingBalanceRefreshEffect', () => {
  const mockRefreshBalance = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useBalanceRefresh).mockReturnValue({
      refreshBalance: mockRefreshBalance,
      handleRefresh: jest.fn(),
      refreshing: false,
    });
  });

  it('does not refresh when disabled', () => {
    renderHook(() =>
      useWalletHomeOnboardingBalanceRefreshEffect({
        enabled: false,
      }),
    );

    expect(mockRefreshBalance).not.toHaveBeenCalled();
  });

  it('refreshes once when enabled', () => {
    const { rerender } = renderHook(
      (
        props: Parameters<
          typeof useWalletHomeOnboardingBalanceRefreshEffect
        >[0],
      ) => useWalletHomeOnboardingBalanceRefreshEffect(props),
      {
        initialProps: {
          enabled: true,
        },
      },
    );

    expect(mockRefreshBalance).toHaveBeenCalledTimes(1);

    rerender({
      enabled: true,
    });

    expect(mockRefreshBalance).toHaveBeenCalledTimes(1);
  });

  it('refreshes once when enabled after an initial disabled render', () => {
    const { rerender } = renderHook(
      (
        props: Parameters<
          typeof useWalletHomeOnboardingBalanceRefreshEffect
        >[0],
      ) => useWalletHomeOnboardingBalanceRefreshEffect(props),
      {
        initialProps: {
          enabled: false,
        },
      },
    );

    rerender({
      enabled: true,
    });

    expect(mockRefreshBalance).toHaveBeenCalledTimes(1);
  });
});
