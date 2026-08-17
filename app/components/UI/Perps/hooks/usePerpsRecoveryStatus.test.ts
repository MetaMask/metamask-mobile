import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePerpsRecoveryStatus } from './usePerpsRecoveryStatus';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  selectPerpsProvider,
  selectPerpsNetwork,
} from '../selectors/perpsController';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getPendingManualRecoveries: jest.fn(),
      getRecoveredDispatches: jest.fn(),
      acknowledgeRecoveredDispatch: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const { useSelector } = jest.requireMock('react-redux') as {
  useSelector: jest.Mock;
};
const { useFocusEffect } = jest.requireMock('@react-navigation/native') as {
  useFocusEffect: jest.Mock;
};

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

const selectorState: {
  address: string;
  provider: string;
  network: string;
} = { address: '0xabc', provider: 'lighter', network: 'testnet' };

describe('usePerpsRecoveryStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectorState.address = '0xabc';
    selectorState.provider = 'lighter';
    selectorState.network = 'testnet';
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountAddress) {
        return selectorState.address;
      }
      if (selector === selectPerpsProvider) {
        return selectorState.provider;
      }
      if (selector === selectPerpsNetwork) {
        return selectorState.network;
      }
      return undefined;
    });
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

  it('registers a screen-focus refresh (returning from a failed trade re-reads state)', async () => {
    const { result } = renderHook(() => usePerpsRecoveryStatus());
    await waitFor(() => {
      expect(mockController.getRecoveredDispatches).toHaveBeenCalled();
    });
    expect(useFocusEffect).toHaveBeenCalled();
    const callsBefore = mockController.getRecoveredDispatches.mock.calls.length;
    // Simulate a focus event by invoking the registered callback.
    const focusCallback = useFocusEffect.mock.calls.at(-1)?.[0] as () => void;
    mockController.getRecoveredDispatches.mockResolvedValue([
      recoveredDispatch,
    ]);
    await act(async () => {
      focusCallback();
    });
    await waitFor(() => {
      expect(
        mockController.getRecoveredDispatches.mock.calls.length,
      ).toBeGreaterThan(callsBefore);
    });
    expect(result.current.recoveredDispatches).toEqual([recoveredDispatch]);
  });

  it('re-reads when the selected account, provider, or network changes', async () => {
    const { rerender } = renderHook(() => usePerpsRecoveryStatus());
    await waitFor(() => {
      expect(mockController.getRecoveredDispatches).toHaveBeenCalled();
    });
    const callsAfterMount =
      mockController.getRecoveredDispatches.mock.calls.length;

    selectorState.address = '0xother';
    rerender(undefined);
    await waitFor(() => {
      expect(
        mockController.getRecoveredDispatches.mock.calls.length,
      ).toBeGreaterThan(callsAfterMount);
    });

    const callsAfterAccount =
      mockController.getRecoveredDispatches.mock.calls.length;
    selectorState.provider = 'hyperliquid';
    rerender(undefined);
    await waitFor(() => {
      expect(
        mockController.getRecoveredDispatches.mock.calls.length,
      ).toBeGreaterThan(callsAfterAccount);
    });
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

  it('records and propagates acknowledgment failures so the surface stays actionable', async () => {
    mockController.acknowledgeRecoveredDispatch.mockRejectedValue(
      new Error('No pending recovered Lighter dispatch matches id 42:abcd'),
    );
    const { result } = renderHook(() => usePerpsRecoveryStatus());
    // Let the mount refresh settle first — its success would otherwise
    // clear the acknowledgment error after the fact.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.acknowledge('42:abcd');
      } catch (error) {
        caught = error as Error;
      }
    });
    expect(caught).not.toBeNull();
    expect((caught as unknown as Error).message).toContain(
      'No pending recovered',
    );
    await waitFor(() => {
      expect(result.current.error?.message).toContain('No pending recovered');
    });
  });
});
