import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import { DEFAULT_SOCIAL_AI_PREFERENCES } from '@metamask/notification-services-controller/notification-services';
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

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<
  typeof useQueryClient
>;
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockSetQueryData = jest.fn();
const mockCall = Engine.controllerMessenger.call as jest.Mock;

const GET_ACTION = 'AuthenticatedUserStorageService:getNotificationPreferences';
const PUT_ACTION = 'AuthenticatedUserStorageService:putNotificationPreferences';
const CLIENT_TYPE = 'mobile';

const buildRemote = (
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences => ({
  walletActivity: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    accounts: [],
  },
  marketing: {
    inAppNotificationsEnabled: false,
    pushNotificationsEnabled: false,
  },
  perps: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  socialAI: {
    ...DEFAULT_SOCIAL_AI_PREFERENCES,
    mutedTraderProfileIds: [
      ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
    ],
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
    mockUseQueryClient.mockReturnValue({
      setQueryData: mockSetQueryData,
    } as unknown as ReturnType<typeof useQueryClient>);
  });

  describe('query configuration', () => {
    it('uses the shared notification storage queryKey', () => {
      renderHook(() => useNotificationPreferences());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: [GET_ACTION] }),
      );
    });
  });

  describe('initial state', () => {
    it('seeds defaults when the query returns no data yet', () => {
      const { result } = renderHook(() => useNotificationPreferences());

      expect(result.current.preferences.pushNotificationsEnabled).toBe(true);
      expect(result.current.preferences.inAppNotificationsEnabled).toBe(true);
      expect(result.current.preferences.txAmountLimit).toBe(500);
      expect(result.current.preferences.mutedTraderProfileIds).toEqual([]);
      expect(result.current.hasNotificationPreferences).toBe(false);
    });

    it('reflects the remote socialAI slice when the query resolves', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({
          data: buildRemote({
            socialAI: {
              pushNotificationsEnabled: false,
              inAppNotificationsEnabled: true,
              txAmountLimit: 100,
              mutedTraderProfileIds: ['trader-muted'],
            },
          }),
        }),
      );

      const { result } = renderHook(() => useNotificationPreferences());

      expect(result.current.preferences).toEqual({
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: true,
        txAmountLimit: 100,
        mutedTraderProfileIds: ['trader-muted'],
      });
      expect(result.current.hasNotificationPreferences).toBe(true);
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
              inAppNotificationsEnabled: true,
              pushNotificationsEnabled: true,
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
              inAppNotificationsEnabled: true,
              pushNotificationsEnabled: true,
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

  describe('setPushNotificationsEnabled', () => {
    it('flips pushNotificationsEnabled locally before the server catches up', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setPushNotificationsEnabled(false);
      });

      expect(result.current.preferences.pushNotificationsEnabled).toBe(false);
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
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          accounts: [{ address: '0xabc', enabled: true }],
        },
      });
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return latest;
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setPushNotificationsEnabled(false);
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
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          accounts: [{ address: '0xabc', enabled: true }],
        },
        marketing: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        },
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

    it('does not initialize preferences when the server has nothing stored', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: null }));
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return null;
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setPushNotificationsEnabled(false);
      });

      expect(mockCall).not.toHaveBeenCalled();
      expect(result.current.error).toBe(
        'No notification preferences found when updating social AI preferences, enable notifications first',
      );
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'useNotificationPreferences: persist skipped',
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
        await result.current.setPushNotificationsEnabled(false);
      });

      await waitFor(() => {
        expect(result.current.preferences.pushNotificationsEnabled).toBe(true);
      });
      expect(result.current.error).toBe('network down');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('does not refetch the query after a successful PUT', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return buildRemote();
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setPushNotificationsEnabled(false);
      });

      expect(mockRefetch).not.toHaveBeenCalled();
    });

    it('does not roll back or set an error when persist succeeds', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return buildRemote();
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setPushNotificationsEnabled(false);
      });

      // The mutation was saved — optimistic overlay must remain (push disabled).
      expect(result.current.preferences.pushNotificationsEnabled).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('primes the TanStack cache with the updated socialAI slice', async () => {
      const latest = buildRemote({
        walletActivity: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          accounts: [{ address: '0xabc', enabled: true }],
        },
      });
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return latest;
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setPushNotificationsEnabled(false);
      });

      expect(mockSetQueryData).toHaveBeenCalledTimes(1);
      const [keyArg, updaterArg] = mockSetQueryData.mock.calls[0];
      expect(keyArg).toEqual([GET_ACTION]);
      // The updater merges socialAI on top of the previous cached value.
      const merged = (updaterArg as CallableFunction)(latest);
      expect(merged).toEqual(
        expect.objectContaining({
          walletActivity: latest.walletActivity,
          socialAI: expect.objectContaining({
            pushNotificationsEnabled: false,
          }),
        }),
      );
    });

    it('rolls back from the optimistic cache update when the PUT fails', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return buildRemote();
        if (action === PUT_ACTION) throw new Error('network down');
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        await result.current.setPushNotificationsEnabled(false);
      });

      expect(mockSetQueryData).toHaveBeenCalledTimes(1);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('does not corrupt state when a first rapid mutation fails but a second succeeds', async () => {
      // Remote: enabled=true, txAmountLimit=500
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));

      let putCount = 0;
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return buildRemote();
        if (action === PUT_ACTION) {
          putCount += 1;
          // First PUT (from setPushNotificationsEnabled) fails; second
          // (from setTxAmountLimit) succeeds.
          if (putCount === 1) throw new Error('first PUT failed');
          return undefined;
        }
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        const first = result.current.setPushNotificationsEnabled(false);
        const second = result.current.setTxAmountLimit(100);
        await Promise.all([first, second]);
      });

      // The second mutation's overlay must survive the first mutation's rollback.
      // B built its nextSocialAI on top of A's pending state
      // (pushNotificationsEnabled:false, txAmountLimit:100), and its PUT
      // succeeded, so both changes are on the server.
      expect(result.current.preferences.pushNotificationsEnabled).toBe(false);
      expect(result.current.preferences.txAmountLimit).toBe(100);
      // A's failure was swallowed because a newer mutation was in flight.
      expect(result.current.error).toBeNull();
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
        const first = result.current.setPushNotificationsEnabled(false);
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

    it('chains rapid successive mutations so the second PUT reflects both changes', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: buildRemote() }));
      mockCall.mockImplementation(async (action: string) => {
        if (action === GET_ACTION) return buildRemote();
        return undefined;
      });

      const { result } = renderHook(() => useNotificationPreferences());

      await act(async () => {
        // Fire both mutations without awaiting — simulates rapid user interaction
        // before React can re-render with the new overlay.
        const first = result.current.setPushNotificationsEnabled(false);
        const second = result.current.setTxAmountLimit(100);
        await Promise.all([first, second]);
      });

      // There must be exactly two PUTs (one per mutation, serialized).
      const putCalls = mockCall.mock.calls.filter((c) => c[0] === PUT_ACTION);
      expect(putCalls).toHaveLength(2);

      // The second PUT must carry BOTH mutations — not the stale socialAI base
      // from the first render (which would have re-applied push: true).
      expect(putCalls[1][1].socialAI).toMatchObject({
        pushNotificationsEnabled: false,
        txAmountLimit: 100,
      });
    });
  });
});
