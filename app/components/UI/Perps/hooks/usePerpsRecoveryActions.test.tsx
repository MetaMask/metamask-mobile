import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type {
  PerpsActiveProviderMode,
  PerpsPendingManualRecovery,
  PerpsRecoveredDispatch,
  PerpsRecoveryVenueReview,
  Position,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import { initialStatePerps } from '../../../../../tests/component-view/presets/perpsStatePreset';
import { usePerpsRecovery } from './usePerpsRecovery';
import { usePerpsRecoveryActions } from './usePerpsRecoveryActions';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PerpsController: {
        getRecoveredDispatches: jest.fn(),
        getPendingManualRecoveries: jest.fn(),
        reconcileRecoveredDispatches: jest.fn(),
        reviewRecoveryVenue: jest.fn(),
        acknowledgeRecoveredDispatch: jest.fn(),
        resolveRecoveryProtection: jest.fn(),
        placeOrder: jest.fn(),
        updatePositionTPSL: jest.fn(),
      },
    },
  },
}));

const ACCOUNT_A = '0x8Dc623E964475D4d669da601Fd15ea9125469003';
const ACCOUNT_B = '0x1234567890123456789012345678901234567890';
const controller = Engine.context.PerpsController;
const getDispatches = jest.mocked(controller.getRecoveredDispatches);
const getProtections = jest.mocked(controller.getPendingManualRecoveries);
const reviewVenue = jest.mocked(controller.reviewRecoveryVenue);
const acknowledge = jest.mocked(controller.acknowledgeRecoveredDispatch);
const resolveProtection = jest.mocked(controller.resolveRecoveryProtection);

const DISPATCH: PerpsRecoveredDispatch = {
  recoveryId: 'opaque:do-not-parse-dispatch',
  providerId: 'lighter',
  walletAddress: ACCOUNT_A,
  network: 'testnet',
  acknowledgeable: true,
  kind: 14,
  intent: 'placeOrder:ETH:123',
  txHash: null,
  outcome: 'succeeded',
  evidence: 'tx-status:2',
};
const PROTECTION: PerpsPendingManualRecovery = {
  recoveryId: 'opaque:do-not-parse-protection',
  providerId: 'lighter',
  walletAddress: ACCOUNT_A,
  network: 'testnet',
  symbol: 'ETH',
  settlementKey: 'opaque:do-not-parse-source',
  recordedAt: 1_790_000_000_000,
  reason: 'interrupted',
  priorIntent: 'replace',
  survivingOrderIds: ['owned-order-one'],
  actionNeeded: 'review protection',
};
const POSITION: Position = {
  symbol: 'ETH',
  providerId: 'lighter',
  size: '0.01',
  entryPrice: '2500',
  positionValue: '25',
  unrealizedPnl: '2.5',
  marginUsed: '25',
  leverage: { type: 'isolated', value: 1 },
  liquidationPrice: '100',
  maxLeverage: 50,
  returnOnEquity: '10',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitCount: 0,
  stopLossCount: 0,
};
const VENUE: Extract<PerpsRecoveryVenueReview, { status: 'ready' }> = {
  status: 'ready',
  providerId: 'lighter',
  walletAddress: ACCOUNT_A,
  network: 'testnet',
  accountIndex: 64,
  positions: [POSITION],
  orders: [],
  reviewedAt: 1_790_000_000_000,
};

const createState = ({
  address = ACCOUNT_A,
  isTestnet = true,
  provider = 'lighter',
}: {
  address?: string;
  isTestnet?: boolean;
  provider?: PerpsActiveProviderMode;
} = {}): RootState =>
  initialStatePerps()
    .withMinimalAccounts(address)
    .withAccountTreeForSelectedAccount()
    .withOverrides({
      engine: {
        backgroundState: {
          PerpsController: { isTestnet, activeProvider: provider },
        },
      },
    })
    .build() as RootState;

interface ReplaceStateAction {
  type: 'replace-state';
  state: RootState;
}

const renderActions = (initialState = createState()) => {
  const store = configureStore<RootState, ReplaceStateAction>({
    reducer: (state: RootState | undefined, action: ReplaceStateAction) =>
      action.type === 'replace-state' ? action.state : (state ?? initialState),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return {
    ...renderHook(
      () => {
        const activity = usePerpsRecovery();
        return { activity, actions: usePerpsRecoveryActions(activity) };
      },
      { wrapper },
    ),
    replaceState: (state: RootState) =>
      store.dispatch({ type: 'replace-state', state }),
  };
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('usePerpsRecoveryActions', () => {
  beforeEach(() => {
    Engine.context.PerpsController = controller;
    jest.clearAllMocks();
    getDispatches.mockReset().mockResolvedValue([DISPATCH]);
    getProtections.mockReset().mockResolvedValue([PROTECTION]);
    reviewVenue.mockReset().mockResolvedValue(VENUE);
    acknowledge.mockReset().mockResolvedValue(undefined);
    resolveProtection.mockReset().mockResolvedValue({
      status: 'settled',
      providerId: 'lighter',
      success: true,
    });
  });

  afterEach(() => {
    Engine.context.PerpsController = controller;
  });

  it('grants review only to an exact current scoped list member', async () => {
    const { result } = renderActions();
    expect(result.current.actions.canReview(DISPATCH)).toBe(false);
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));

    expect(result.current.actions.canReview(DISPATCH)).toBe(true);
    expect(result.current.actions.canReview({ ...DISPATCH })).toBe(false);
    expect(await result.current.actions.reviewEntry({ ...DISPATCH })).toBe(
      false,
    );
    expect(reviewVenue).not.toHaveBeenCalled();
    expect(acknowledge).not.toHaveBeenCalled();
    expect(resolveProtection).not.toHaveBeenCalled();
  });

  it.each([
    { ...DISPATCH, providerId: undefined },
    { ...DISPATCH, walletAddress: undefined },
    { ...DISPATCH, network: undefined },
    { ...DISPATCH, walletAddress: ACCOUNT_B },
    { ...DISPATCH, network: 'mainnet' },
    { ...DISPATCH, providerId: 'hyperliquid' as const },
  ])(
    'refuses unavailable or mismatched recovery-row ownership %#',
    async (entry) => {
      getDispatches.mockResolvedValue([entry]);
      const { result } = renderActions();
      await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));

      expect(result.current.actions.canReview(entry)).toBe(false);
      expect(await result.current.actions.reviewEntry(entry)).toBe(false);
      expect(reviewVenue).not.toHaveBeenCalled();
    },
  );

  it('reviews the row owner in aggregated mode without placing or retrying an order', async () => {
    const { result } = renderActions(createState({ provider: 'aggregated' }));
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));

    await act(async () =>
      expect(await result.current.actions.reviewEntry(PROTECTION)).toBe(true),
    );

    expect(reviewVenue).toHaveBeenCalledWith({ providerId: 'lighter' });
    expect(result.current.actions.review?.positions).toEqual([POSITION]);
    expect(controller.placeOrder).not.toHaveBeenCalled();
    expect(controller.updatePositionTPSL).not.toHaveBeenCalled();
    expect(resolveProtection).not.toHaveBeenCalled();
  });

  it.each([
    { ...VENUE, providerId: 'hyperliquid' as const },
    { ...VENUE, walletAddress: ACCOUNT_B },
    { ...VENUE, network: 'mainnet' },
  ])(
    'rejects a venue review for another ownership context %#',
    async (venue) => {
      reviewVenue.mockResolvedValue(venue);
      const { result } = renderActions();
      await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));

      await act(async () =>
        expect(await result.current.actions.reviewEntry(PROTECTION)).toBe(
          false,
        ),
      );

      expect(result.current.actions.review).toBeUndefined();
      expect(result.current.actions.actionError).toBe('review');
      expect(result.current.actions.canRemoveProtection(PROTECTION)).toBe(
        false,
      );
    },
  );

  it('retains an explicit unsupported warning without granting action authority', async () => {
    reviewVenue.mockResolvedValue({
      status: 'unsupported',
      providerId: 'lighter',
      reason: 'internal detail',
    });
    const { result } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));

    await act(async () =>
      expect(await result.current.actions.reviewEntry(PROTECTION)).toBe(false),
    );

    expect(result.current.actions.actionError).toBe('unsupported');
    expect(result.current.actions.review).toBeUndefined();
    expect(resolveProtection).not.toHaveBeenCalled();
  });

  it('invalidates the old review synchronously when starting a replacement review', async () => {
    const { result } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(PROTECTION));
    const prepare = result.current.actions.prepareProtectionEdit;
    expect(prepare(PROTECTION)).toBeDefined();
    const pending = deferred<PerpsRecoveryVenueReview>();
    reviewVenue.mockReturnValueOnce(pending.promise);
    let reviewing: Promise<boolean> | undefined;

    act(() => {
      reviewing = result.current.actions.reviewEntry(DISPATCH);
      expect(prepare(PROTECTION)).toBeUndefined();
    });
    await act(async () => {
      pending.resolve(VENUE);
      expect(await reviewing).toBe(true);
    });

    expect(result.current.actions.review?.entry).toBe(DISPATCH);
  });

  it('refreshes venue state immediately before acknowledging the exact opaque outcome', async () => {
    const { result } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    expect(await result.current.actions.acknowledge(DISPATCH)).toBe(false);
    await act(async () => result.current.actions.reviewEntry(DISPATCH));
    const lifecycle: string[] = [];
    reviewVenue.mockImplementationOnce(async () => {
      lifecycle.push('fresh venue');
      return VENUE;
    });
    acknowledge.mockImplementationOnce(async (id) => {
      lifecycle.push(id);
    });

    await act(async () =>
      expect(await result.current.actions.acknowledge(DISPATCH)).toBe(true),
    );

    expect(lifecycle).toEqual(['fresh venue', DISPATCH.recoveryId]);
    expect(acknowledge).toHaveBeenCalledTimes(1);
    expect(getDispatches).toHaveBeenCalledTimes(2);
    expect(result.current.actions.review).toBeUndefined();
    expect(controller.placeOrder).not.toHaveBeenCalled();
  });

  it('never acknowledges a raw unresolved dispatch', async () => {
    const entry = {
      ...DISPATCH,
      acknowledgeable: false,
      outcome: 'unknown' as const,
    };
    getDispatches.mockResolvedValue([entry]);
    const { result } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(entry));

    expect(await result.current.actions.acknowledge(entry)).toBe(false);
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it.each([
    ['account', createState({ address: ACCOUNT_B })],
    ['network', createState({ isTestnet: false })],
    ['provider', createState({ provider: 'hyperliquid' })],
    ['account A to B to A', undefined],
  ])(
    'stops acknowledgment after a %s change during its fresh venue read',
    async (_label, state) => {
      const { result, replaceState } = renderActions();
      await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
      await act(async () => result.current.actions.reviewEntry(DISPATCH));
      const pending = deferred<PerpsRecoveryVenueReview>();
      reviewVenue.mockReturnValueOnce(pending.promise);
      let acknowledging: Promise<boolean> | undefined;

      act(() => {
        acknowledging = result.current.actions.acknowledge(DISPATCH);
        if (state === undefined) {
          replaceState(createState({ address: ACCOUNT_B }));
          replaceState(createState());
        } else {
          replaceState(state);
        }
      });
      await act(async () => {
        pending.resolve(VENUE);
        expect(await acknowledging).toBe(false);
      });

      expect(acknowledge).not.toHaveBeenCalled();
      expect(result.current.actions.actionError).toBeUndefined();
      expect(result.current.actions.isActionPending).toBe(false);
    },
  );

  it('claims editor submission before dismissal and preserves it across focus refresh', async () => {
    const { result } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(PROTECTION));
    const params = result.current.actions.prepareProtectionEdit(PROTECTION);
    if (params === undefined) {
      throw new Error('Expected reviewed protection editor params');
    }
    expect(params.isPositionReviewCurrent?.(POSITION)).toBe(true);
    expect(params.isPositionReviewCurrent?.({ ...POSITION })).toBe(false);
    expect(await params.onConfirm(POSITION, '2800', '2300')).toEqual({
      success: false,
    });
    expect(resolveProtection).not.toHaveBeenCalled();

    act(() => expect(params.onBeforeConfirm?.()).toBe(true));
    expect(result.current.actions.isActionPending).toBe(true);
    expect(await result.current.actions.reload()).toBe(false);
    expect(getDispatches).toHaveBeenCalledTimes(1);
    await act(async () =>
      expect(await params.onConfirm(POSITION, '2800', '2300')).toEqual({
        success: true,
      }),
    );

    expect(resolveProtection).toHaveBeenCalledWith({
      providerId: 'lighter',
      recoveryId: PROTECTION.recoveryId,
      symbol: 'ETH',
      position: POSITION,
      expectedPosition: { size: '0.01', entryPrice: '2500' },
      takeProfitPrice: '2800',
      stopLossPrice: '2300',
      trackingData: undefined,
    });
    expect(result.current.actions.isActionPending).toBe(false);
    expect(params.isPositionReviewCurrent?.(POSITION)).toBe(false);
    expect(getDispatches).toHaveBeenCalledTimes(2);
    expect(controller.updatePositionTPSL).not.toHaveBeenCalled();
  });

  it('refuses a second editor claim without revoking the first claim', async () => {
    const { result } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(PROTECTION));
    const params = result.current.actions.prepareProtectionEdit(PROTECTION);
    if (params === undefined) {
      throw new Error('Expected reviewed protection editor params');
    }

    act(() => {
      expect(params.onBeforeConfirm?.()).toBe(true);
      expect(params.onBeforeConfirm?.()).toBe(false);
    });
    await act(async () =>
      expect(await params.onConfirm(POSITION, '2800')).toEqual({
        success: true,
      }),
    );

    expect(resolveProtection).toHaveBeenCalledTimes(1);
  });

  it('rejects editor forwarding after account A to B to A during dismissal', async () => {
    const { result, replaceState } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(PROTECTION));
    const params = result.current.actions.prepareProtectionEdit(PROTECTION);
    if (params === undefined) {
      throw new Error('Expected reviewed protection editor params');
    }

    act(() => {
      expect(params.onBeforeConfirm?.()).toBe(true);
      replaceState(createState({ address: ACCOUNT_B }));
      replaceState(createState());
    });
    expect(params.isPositionReviewCurrent?.(POSITION)).toBe(false);
    await act(async () =>
      expect(await params.onConfirm(POSITION, '2800')).toEqual({
        success: false,
      }),
    );

    expect(resolveProtection).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', []],
    ['ambiguous', [POSITION, { ...POSITION }]],
    ['closed', [{ ...POSITION, size: '0' }]],
    ['unknown size', [{ ...POSITION, size: 'unknown' }]],
    ['unknown entry', [{ ...POSITION, entryPrice: '' }]],
  ])(
    'refuses replacement for a %s position while allowing explicit removal',
    async (_label, positions) => {
      reviewVenue.mockResolvedValue({ ...VENUE, positions });
      const { result } = renderActions();
      await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
      await act(async () => result.current.actions.reviewEntry(PROTECTION));

      expect(
        result.current.actions.prepareProtectionEdit(PROTECTION),
      ).toBeUndefined();
      expect(result.current.actions.canEditProtection(PROTECTION)).toBe(false);
      expect(result.current.actions.canRemoveProtection(PROTECTION)).toBe(true);
      await act(async () =>
        expect(
          await result.current.actions.removeProtection(PROTECTION),
        ).toEqual({ success: true }),
      );

      expect(resolveProtection).toHaveBeenCalledWith({
        providerId: 'lighter',
        recoveryId: PROTECTION.recoveryId,
        symbol: 'ETH',
      });
    },
  );

  it('does not infer a missing recovery ID from the durable source key', async () => {
    const entry = { ...PROTECTION, recoveryId: undefined };
    getProtections.mockResolvedValue([entry]);
    const { result } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(entry));

    expect(result.current.actions.canRemoveProtection(entry)).toBe(false);
    expect(result.current.actions.prepareProtectionEdit(entry)).toBeUndefined();
    expect(await result.current.actions.removeProtection(entry)).toEqual({
      success: false,
    });
    expect(resolveProtection).not.toHaveBeenCalled();
  });

  it('does not start another action while the selected protection request is pending', async () => {
    const { result } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(PROTECTION));
    const pending =
      deferred<
        Awaited<ReturnType<typeof controller.resolveRecoveryProtection>>
      >();
    resolveProtection.mockReturnValueOnce(pending.promise);
    let removing: Promise<{ success: boolean }> | undefined;

    act(() => {
      removing = result.current.actions.removeProtection(PROTECTION);
    });
    expect(await result.current.actions.removeProtection(PROTECTION)).toEqual({
      success: false,
    });
    expect(await result.current.actions.reviewEntry(DISPATCH)).toBe(false);
    expect(await result.current.actions.reload()).toBe(false);
    expect(resolveProtection).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({
        status: 'settled',
        providerId: 'lighter',
        success: true,
      });
      expect(await removing).toEqual({ success: true });
    });
  });

  it('keeps a replacement account review pending when an old account request rejects', async () => {
    const { result, replaceState } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(PROTECTION));
    const oldResult =
      deferred<
        Awaited<ReturnType<typeof controller.resolveRecoveryProtection>>
      >();
    resolveProtection.mockReturnValueOnce(oldResult.promise);
    let removing: Promise<{ success: boolean }> | undefined;
    act(() => {
      removing = result.current.actions.removeProtection(PROTECTION);
    });
    const entryB = { ...PROTECTION, walletAddress: ACCOUNT_B };
    const venueB = { ...VENUE, walletAddress: ACCOUNT_B, accountIndex: 65 };
    getProtections.mockResolvedValue([entryB]);
    act(() => replaceState(createState({ address: ACCOUNT_B })));
    await waitFor(() =>
      expect(result.current.activity.protections).toEqual([entryB]),
    );
    const nextReview = deferred<PerpsRecoveryVenueReview>();
    reviewVenue.mockReturnValueOnce(nextReview.promise);
    let reviewing: Promise<boolean> | undefined;
    act(() => {
      reviewing = result.current.actions.reviewEntry(entryB);
    });

    await act(async () => {
      oldResult.reject(new Error('old account failure'));
      expect(await removing).toEqual({ success: false });
    });

    expect(result.current.actions.isActionPending).toBe(true);
    expect(result.current.actions.actionError).toBeUndefined();
    await act(async () => {
      nextReview.resolve(venueB);
      expect(await reviewing).toBe(true);
    });
    expect(result.current.actions.review?.entry).toBe(entryB);
    expect(result.current.actions.canRemoveProtection(entryB)).toBe(true);
  });

  it.each([
    [undefined, undefined],
    ['', '2300'],
    ['0', '2300'],
    ['NaN', '2300'],
    ['2800', 'Infinity'],
  ])(
    'refuses missing or invalid explicit replacement prices %#',
    async (takeProfitPrice, stopLossPrice) => {
      const { result } = renderActions();
      await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
      await act(async () => result.current.actions.reviewEntry(PROTECTION));
      const params = result.current.actions.prepareProtectionEdit(PROTECTION);
      if (params === undefined) {
        throw new Error('Expected reviewed protection editor params');
      }
      act(() => expect(params.onBeforeConfirm?.()).toBe(true));

      await act(async () =>
        expect(
          await params.onConfirm(POSITION, takeProfitPrice, stopLossPrice),
        ).toEqual({ success: false }),
      );

      expect(resolveProtection).not.toHaveBeenCalled();
      expect(result.current.actions.actionError).toBe('resolve');
      expect(result.current.actions.isActionPending).toBe(false);
    },
  );

  it('rejects an editor claim after controller replacement before React renders', async () => {
    const { result } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(PROTECTION));
    const params = result.current.actions.prepareProtectionEdit(PROTECTION);
    if (params === undefined) {
      throw new Error('Expected reviewed protection editor params');
    }
    const replacement = { ...controller, resolveRecoveryProtection: jest.fn() };

    Object.defineProperty(Engine.context, 'PerpsController', {
      configurable: true,
      writable: true,
      value: replacement,
    });

    expect(params.onBeforeConfirm?.()).toBe(false);
    expect(await params.onConfirm(POSITION, '2800')).toEqual({
      success: false,
    });
    expect(replacement.resolveRecoveryProtection).not.toHaveBeenCalled();
    expect(resolveProtection).not.toHaveBeenCalled();
  });

  it.each([
    {
      status: 'unresolved' as const,
      providerId: 'lighter' as const,
      success: false,
    },
    {
      status: 'settled' as const,
      providerId: 'lighter' as const,
      success: false,
    },
    {
      status: 'unsupported' as const,
      providerId: 'lighter' as const,
      success: false as const,
      error: 'internal detail',
    },
  ])(
    'preserves a visible warning for an unsuccessful protection result %#',
    async (outcome) => {
      resolveProtection.mockResolvedValue(outcome);
      const { result } = renderActions();
      await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
      await act(async () => result.current.actions.reviewEntry(PROTECTION));

      await act(async () =>
        expect(
          await result.current.actions.removeProtection(PROTECTION),
        ).toEqual({ success: false }),
      );

      expect(result.current.actions.actionError).toBe(
        outcome.status === 'unsupported' ? 'unsupported' : 'unresolved',
      );
      expect(result.current.activity.protections).toEqual([PROTECTION]);
      expect(result.current.actions.isActionPending).toBe(false);
    },
  );

  it('rejects retained review and editor callbacks after unmount', async () => {
    const { result, unmount } = renderActions();
    await waitFor(() => expect(result.current.activity.hasLoaded).toBe(true));
    await act(async () => result.current.actions.reviewEntry(PROTECTION));
    const actions = result.current.actions;
    const params = actions.prepareProtectionEdit(PROTECTION);
    if (params === undefined) {
      throw new Error('Expected reviewed protection editor params');
    }

    unmount();

    expect(params.onBeforeConfirm?.()).toBe(false);
    expect(await actions.reviewEntry(PROTECTION)).toBe(false);
    expect(await actions.removeProtection(PROTECTION)).toEqual({
      success: false,
    });
    expect(resolveProtection).not.toHaveBeenCalled();
    expect(reviewVenue).toHaveBeenCalledTimes(1);
  });
});
