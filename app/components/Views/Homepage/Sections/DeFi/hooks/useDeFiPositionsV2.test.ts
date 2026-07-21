import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { selectDeFiPositionsV2State } from '../../../../../../selectors/defiPositionsControllerV2';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import {
  selectSelectedAccountGroupId,
  selectSelectedAccountGroupInternalAccounts,
} from '../../../../../../selectors/multichainAccounts/accountTreeController';
import { useDeFiPositionsV2 } from './useDeFiPositionsV2';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    DeFiPositionsControllerV2: {
      fetchDeFiPositions: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockFetchDeFiPositions = Engine.context.DeFiPositionsControllerV2
  .fetchDeFiPositions as jest.MockedFunction<
  typeof Engine.context.DeFiPositionsControllerV2.fetchDeFiPositions
>;

describe('useDeFiPositionsV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) {
        return true;
      }
      if (selector === selectSelectedAccountGroupId) {
        return 'group-1';
      }
      if (selector === selectSelectedAccountGroupInternalAccounts) {
        return [{ id: 'account-1' }];
      }
      if (selector === selectDeFiPositionsV2State) {
        return {};
      }
      return undefined;
    });

    // Run deferred fetch work synchronously in unit tests.
    (
      globalThis as typeof globalThis & {
        requestIdleCallback: (callback: () => void) => number;
        cancelIdleCallback: (handle: number) => void;
      }
    ).requestIdleCallback = (callback) => {
      callback();
      return 0;
    };
    (
      globalThis as typeof globalThis & {
        cancelIdleCallback: (handle: number) => void;
      }
    ).cancelIdleCallback = jest.fn();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'requestIdleCallback');
    Reflect.deleteProperty(globalThis, 'cancelIdleCallback');
  });

  it('does not fetch when disabled', async () => {
    renderHook(() => useDeFiPositionsV2({ enabled: false, isVisible: true }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchDeFiPositions).not.toHaveBeenCalled();
  });

  it('does not fetch when not visible', async () => {
    renderHook(() => useDeFiPositionsV2({ enabled: true, isVisible: false }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchDeFiPositions).not.toHaveBeenCalled();
  });

  it('fetches without forceRefresh when enabled and visible', async () => {
    renderHook(() => useDeFiPositionsV2({ enabled: true, isVisible: true }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchDeFiPositions).toHaveBeenCalledTimes(1);
    expect(mockFetchDeFiPositions).toHaveBeenCalledWith();
  });

  it('does not fetch when wallet is locked', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) {
        return false;
      }
      if (selector === selectSelectedAccountGroupId) {
        return 'group-1';
      }
      if (selector === selectSelectedAccountGroupInternalAccounts) {
        return [{ id: 'account-1' }];
      }
      if (selector === selectDeFiPositionsV2State) {
        return {};
      }
      return undefined;
    });

    renderHook(() => useDeFiPositionsV2({ enabled: true, isVisible: true }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchDeFiPositions).not.toHaveBeenCalled();
  });

  it('returns merged positions from state', async () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) {
        return true;
      }
      if (selector === selectSelectedAccountGroupId) {
        return 'group-1';
      }
      if (selector === selectSelectedAccountGroupInternalAccounts) {
        return [{ id: 'account-1' }];
      }
      if (selector === selectDeFiPositionsV2State) {
        return {
          'account-1': [
            {
              protocolId: 'aave',
              productName: 'Aave',
              protocolIconUrl: 'aave.png',
              chainId: 'eip155:1',
              marketValue: 100,
              iconGroup: [],
              sections: [],
            },
          ],
        };
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useDeFiPositionsV2({ enabled: true, isVisible: true }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.positions).toHaveLength(1);
    expect(result.current.positions[0].protocolId).toBe('aave');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasFetched).toBe(true);
  });

  it('sets isError when fetch rejects', async () => {
    mockFetchDeFiPositions.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() =>
      useDeFiPositionsV2({ enabled: true, isVisible: true }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.hasFetched).toBe(true);
  });

  it('keeps hasFetched false before the first fetch', () => {
    const { result } = renderHook(() =>
      useDeFiPositionsV2({ enabled: true, isVisible: false }),
    );

    expect(result.current.hasFetched).toBe(false);
  });

  it('refresh bypasses visibility and force-refreshes', async () => {
    const { result } = renderHook(() =>
      useDeFiPositionsV2({ enabled: true, isVisible: false }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchDeFiPositions).toHaveBeenCalledTimes(1);
    expect(mockFetchDeFiPositions).toHaveBeenCalledWith({ forceRefresh: true });
  });
});
