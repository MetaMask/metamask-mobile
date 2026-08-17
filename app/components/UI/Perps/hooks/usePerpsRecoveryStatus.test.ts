import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePerpsRecoveryStatus } from './usePerpsRecoveryStatus';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getPendingManualRecoveries: jest.fn(),
      getRecoveredDispatches: jest.fn(),
      acknowledgeRecoveredDispatch: jest.fn(),
    },
  },
}));

const mockController = Engine.context.PerpsController as unknown as {
  getPendingManualRecoveries: jest.Mock;
  getRecoveredDispatches: jest.Mock;
  acknowledgeRecoveredDispatch: jest.Mock;
};

const manualRecovery = {
  symbol: 'BTC',
  settlementKey: '0xabc:28:7:BTC',
  recordedAt: 5,
  reason:
    'Replacement TP/SL failed after the previous protection cancels began',
  priorIntent: 'replace' as const,
  survivingOrderIds: ['9'],
  actionNeeded: 'Submit a new TP/SL update',
};

const recoveredDispatch = {
  recoveryId: '42:abcd',
  kind: 13,
  intent: 'withdraw:25',
  txHash: 'abcd',
  outcome: 'succeeded' as const,
  evidence: 'tx-status:3',
};

describe('usePerpsRecoveryStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockController.getPendingManualRecoveries.mockResolvedValue([]);
    mockController.getRecoveredDispatches.mockResolvedValue([]);
    mockController.acknowledgeRecoveredDispatch.mockResolvedValue(undefined);
  });

  it('loads pending manual recoveries and recovered dispatches on mount', async () => {
    mockController.getPendingManualRecoveries.mockResolvedValue([
      manualRecovery,
    ]);
    mockController.getRecoveredDispatches.mockResolvedValue([
      recoveredDispatch,
    ]);

    const { result } = renderHook(() => usePerpsRecoveryStatus());

    await waitFor(() => {
      expect(result.current.pendingManualRecoveries).toEqual([manualRecovery]);
    });
    expect(result.current.recoveredDispatches).toEqual([recoveredDispatch]);
    expect(result.current.error).toBeNull();
  });

  it('acknowledges a single dispatch by its stable id and refreshes', async () => {
    mockController.getRecoveredDispatches.mockResolvedValue([
      recoveredDispatch,
    ]);
    const { result } = renderHook(() => usePerpsRecoveryStatus());
    await waitFor(() => {
      expect(result.current.recoveredDispatches).toHaveLength(1);
    });

    mockController.getRecoveredDispatches.mockResolvedValue([]);
    await act(async () => {
      await result.current.acknowledge('42:abcd');
    });

    expect(mockController.acknowledgeRecoveredDispatch).toHaveBeenCalledWith(
      '42:abcd',
    );
    expect(result.current.recoveredDispatches).toEqual([]);
  });

  it('surfaces read failures instead of degrading to empty lists', async () => {
    mockController.getPendingManualRecoveries.mockRejectedValue(
      new Error('Lighter TP/SL manual-recovery index is corrupt'),
    );

    const { result } = renderHook(() => usePerpsRecoveryStatus());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.error?.message).toContain('corrupt');
  });

  it('propagates acknowledgment failures to the caller', async () => {
    mockController.acknowledgeRecoveredDispatch.mockRejectedValue(
      new Error('No pending recovered Lighter dispatch matches id 42:abcd'),
    );
    const { result } = renderHook(() => usePerpsRecoveryStatus());

    await expect(
      act(async () => {
        await result.current.acknowledge('42:abcd');
      }),
    ).rejects.toThrow('No pending recovered');
  });
});
