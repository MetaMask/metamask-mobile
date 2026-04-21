import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import type { NotificationPreferences as StoredNotificationPreferences } from '@metamask/authenticated-user-storage';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import {
  useNotificationPreferences,
  TX_AMOUNT_THRESHOLDS,
} from './useNotificationPreferences';

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('@metamask/react-data-query');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockCall = Engine.controllerMessenger.call as jest.Mock;

const GET_ACTION = 'AuthenticatedUserStorageService:getNotificationPreferences';
const PUT_ACTION = 'AuthenticatedUserStorageService:putNotificationPreferences';
const CLIENT_TYPE = 'mobile';

const buildRemote = (
  overrides: Partial<StoredNotificationPreferences> = {},
): StoredNotificationPreferences => ({
  walletActivity: { enabled: true, accounts: [] },
  marketing: { enabled: false },
  perps: { enabled: true },
  socialAI: {
    enabled: true,
    txAmountLimit: 500,
    mutedTraderProfileIds: [],
  },
  ...overrides,
});

const makeQueryResult = (
  overrides: Partial<ReturnType<typeof useQuery>> = {},
): ReturnType<typeof useQuery> =>
  ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  }) as ReturnType<typeof useQuery>;

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
    mockCall.mockResolvedValue(undefined);
    mockRefetch.mockResolvedValue(undefined);
  });

  describe('query configuration', () => {
    it('passes the getNotificationPreferences queryKey to useQuery', () => {
      renderHook(() => useNotificationPreferences());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: [GET_ACTION] }),
      );
    });
  });

  describe('initial state', () => {
    it('seeds defaults when the query returns no data yet', () => {
      const { result } = renderHook(() => useNotificationPreferences());

      expect(result.current.preferences.enabled).toBe(false);
      expect(result.current.preferences.txAmountLimit).toBe(500);
      expect(result.current.preferences.mutedTraderProfileIds).toEqual([]);
    });

    it('reflects the remote socialAI slice when the query resolves', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({
          data: buildRemote({
            socialAI: {
              enabled: false,
              txAmountLimit: 100,
              mutedTraderProfileIds: ['trader-muted'],
            },
          }),
        }),
      );

      const { result } = renderHook(() => useNotificationPreferences());

      expect(result.current.preferences).toEqual({
        enabled: false,
        txAmountLimit: 100,
        mutedTraderProfileIds: ['trader-muted'],
      });
    });

    it('forwards the useQuery loading state', () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));

      const { result } = renderHook(() => useNotificationPreferences());

      expect(result.current.isLoading).toBe(true);
    });

    it('forwards useQuery errors as string via the error field', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: new Error('boom') }),
      );

      const { result } = renderHook(() => useNotificationPreferences());

      expect(result.current.error).toBe('boom');
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('isTraderNotificationEnabled', () => {
    it('returns true when the trader is NOT in the muted list (opt-out)', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({
          data: buildRemote({
            socialAI: {
              enabled: true,
              txAmountLimit: 500,
              mutedTraderProfileIds: ['muted-1'],
            },
          }),
        }),
      );

      const { result } = renderHook(() => useNotificationPreferences());

      expect(result.current.isTraderNotificationEnabled('trader-1')).toBe(true);
      expect(result.current.isTraderNotificationEnabled('muted-1')).toBe(false);
    });
  });

  describe('toggleTraderNotification', () => {
    it('adds the trader id to the muted list when muting', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.toggleTraderNotification('trader-1');
      });

      expect(result.current.preferences.mutedTraderProfileIds).toContain(
        'trader-1',
      );
      expect(result.current.isTraderNotificationEnabled('trader-1')).toBe(
        false,
      );
    });

    it('removes the trader id from the muted list when unmuting', async () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({
          data: buildRemote({
            socialAI: {
              enabled: true,
              txAmountLimit: 500,
              mutedTraderProfileIds: ['trader-1'],
            },
          }),
        }),
      );

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.toggleTraderNotification('trader-1');
      });

      expect(result.current.preferences.mutedTraderProfileIds).not.toContain(
        'trader-1',
      );
      expect(result.current.isTraderNotificationEnabled('trader-1')).toBe(true);
    });

    it('does not affect other traders when muting one', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.toggleTraderNotification('trader-1');
      });

      expect(result.current.isTraderNotificationEnabled('trader-2')).toBe(true);
      expect(result.current.isTraderNotificationEnabled('trader-3')).toBe(true);
    });
  });

  describe('setEnabled', () => {
    it('flips enabled locally before the server catches up', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setEnabled(false);
      });

      expect(result.current.preferences.enabled).toBe(false);
    });
  });

  describe('setTxAmountLimit', () => {
    it.each(TX_AMOUNT_THRESHOLDS)(
      'updates txAmountLimit to %s',
      async (threshold) => {
        mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));

        const { result } = renderHook(() => useNotificationPreferences());

        await act(async () => {
          await result.current.setTxAmountLimit(threshold);
        });

        expect(result.current.preferences.txAmountLimit).toBe(threshold);
      },
    );
  });

  describe('persistence (read-merge-write)', () => {
    it('GETs the latest preferences right before PUTting', async () => {
      const cached = buildRemote();
      mockUseQuery.mockReturnValue(makeQueryResult({ data: cached }));

      // Concurrent writer updated the walletActivity slice on the server.
      const latest = buildRemote({
        walletActivity: {
          enabled: false,
          accounts: [{ address: '0xabc', enabled: true }],
        },
      });
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return latest;
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setEnabled(false);
      });

      const calls = mockCall.mock.calls;
      const getIdx = calls.findIndex((c) => c[0] === GET_ACTION);
      const putIdx = calls.findIndex((c) => c[0] === PUT_ACTION);

      expect(getIdx).toBeGreaterThanOrEqual(0);
      expect(putIdx).toBeGreaterThanOrEqual(0);
      expect(getIdx).toBeLessThan(putIdx);
    });

    it('PUTs a merged payload that preserves other slices and overrides socialAI', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));
      const latest = buildRemote({
        walletActivity: {
          enabled: false,
          accounts: [{ address: '0xabc', enabled: true }],
        },
        marketing: { enabled: true },
      });
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return latest;
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.toggleTraderNotification('trader-1');
      });

      expect(mockCall).toHaveBeenCalledWith(
        PUT_ACTION,
        expect.objectContaining({
          walletActivity: latest.walletActivity,
          marketing: latest.marketing,
          perps: latest.perps,
          socialAI: expect.objectContaining({
            mutedTraderProfileIds: ['trader-1'],
          }),
        }),
        CLIENT_TYPE,
      );
    });

    it('seeds sensible defaults for other slices when the server has nothing stored', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: null }));
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return null;
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setEnabled(false);
      });

      expect(mockCall).toHaveBeenCalledWith(
        PUT_ACTION,
        expect.objectContaining({
          walletActivity: expect.any(Object),
          marketing: expect.any(Object),
          perps: expect.any(Object),
          socialAI: expect.objectContaining({ enabled: false }),
        }),
        CLIENT_TYPE,
      );
    });

    it('rolls back the optimistic overlay and surfaces an error on PUT failure', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return buildRemote();
        if (action === PUT_ACTION) throw new Error('network down');
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setEnabled(false);
      });

      await waitFor(() => {
        expect(result.current.preferences.enabled).toBe(true);
      });
      expect(result.current.error).toBe('network down');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('refetches the query after a successful PUT so the overlay clears', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return buildRemote();
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setEnabled(false);
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('write serialization', () => {
    it('processes back-to-back toggles sequentially without overlapping GETs and PUTs', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));

      const order: string[] = [];
      let resolveFirstPut: () => void = () => undefined;
      const firstPutBlocker = new Promise<void>((r) => {
        resolveFirstPut = r;
      });

      let putCount = 0;
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) {
          order.push('GET');
          return buildRemote();
        }
        if (action === PUT_ACTION) {
          putCount += 1;
          order.push(`PUT-${putCount}-start`);
          if (putCount === 1) {
            await firstPutBlocker;
          }
          order.push(`PUT-${putCount}-end`);
          return undefined;
        }
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        const first = result.current.setEnabled(false);
        const second = result.current.setTxAmountLimit(100);
        // Release the first PUT only after both calls have been initiated.
        // If writes weren't serialized, the second GET would fire before the
        // first PUT resolved.
        setTimeout(() => resolveFirstPut(), 0);
        await Promise.all([first, second]);
      });

      // Expected strict interleaving: GET → PUT-1-start → PUT-1-end → GET → PUT-2-start → PUT-2-end
      expect(order).toEqual([
        'GET',
        'PUT-1-start',
        'PUT-1-end',
        'GET',
        'PUT-2-start',
        'PUT-2-end',
      ]);
    });
  });
});
