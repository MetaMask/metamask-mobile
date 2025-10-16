import { renderHook } from '@testing-library/react-native';
import { useWithdrawalAmount } from './useWithdrawalAmount';

interface WithdrawalRequest {
  status: string;
  amount?: string;
}

describe('useWithdrawalAmount', () => {
  it('returns null when no withdrawal requests are provided', () => {
    const { result } = renderHook(() => useWithdrawalAmount([]));
    expect(result.current.withdrawalAmount).toBeNull();
  });

  it('returns null when no active withdrawals exist', () => {
    const withdrawalRequests = [
      { status: 'completed', amount: '100' },
      { status: 'failed', amount: '50' },
    ];

    const { result } = renderHook(() =>
      useWithdrawalAmount(withdrawalRequests),
    );
    expect(result.current.withdrawalAmount).toBeNull();
  });

  it('returns withdrawal amount when pending withdrawal exists', () => {
    const withdrawalRequests = [
      { status: 'completed', amount: '100' },
      { status: 'pending', amount: '250' },
    ];

    const { result } = renderHook(() =>
      useWithdrawalAmount(withdrawalRequests),
    );
    expect(result.current.withdrawalAmount).toBe('250');
  });

  it('returns withdrawal amount when bridging withdrawal exists', () => {
    const withdrawalRequests = [
      { status: 'completed', amount: '100' },
      { status: 'bridging', amount: '500' },
    ];

    const { result } = renderHook(() =>
      useWithdrawalAmount(withdrawalRequests),
    );
    expect(result.current.withdrawalAmount).toBe('500');
  });

  it('returns the first active withdrawal amount when multiple active withdrawals exist', () => {
    const withdrawalRequests = [
      { status: 'pending', amount: '100' },
      { status: 'bridging', amount: '500' },
    ];

    const { result } = renderHook(() =>
      useWithdrawalAmount(withdrawalRequests),
    );
    expect(result.current.withdrawalAmount).toBe('100');
  });

  it('returns null when active withdrawal has no amount', () => {
    const withdrawalRequests = [
      { status: 'pending' }, // No amount property
    ];

    const { result } = renderHook(() =>
      useWithdrawalAmount(withdrawalRequests),
    );
    expect(result.current.withdrawalAmount).toBeNull();
  });

  it('updates when withdrawal requests change', () => {
    const { result, rerender } = renderHook(
      ({ requests }: { requests: WithdrawalRequest[] }) =>
        useWithdrawalAmount(requests),
      {
        initialProps: { requests: [] as WithdrawalRequest[] },
      },
    );

    expect(result.current.withdrawalAmount).toBeNull();

    // Add a pending withdrawal
    const pendingRequest: WithdrawalRequest = {
      status: 'pending',
      amount: '300',
    };
    rerender({ requests: [pendingRequest] });
    expect(result.current.withdrawalAmount).toBe('300');

    // Change to completed
    const completedRequest: WithdrawalRequest = {
      status: 'completed',
      amount: '300',
    };
    rerender({ requests: [completedRequest] });
    expect(result.current.withdrawalAmount).toBeNull();
  });
});
