/**
 * History views mock this hook. The behavior is the focus fetch and the
 * shared slice, so this stays a hook unit test.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { ClaimDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { captureException } from '@sentry/react-native';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import configureStore from '../../../../util/test/configureStore';
import { useInFlightClaims } from './useInFlightClaims';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const PROFILE_A = 'profile-a';

function claim(id: string): ClaimDto {
  return {
    id,
    beneficiary_profile_id: PROFILE_A,
    money_account_address: '0xabc',
    earning_origin_types: ['SWAPS_FEE_CASHBACK'],
    gross_amount: '2500000',
    withheld_amount: '0',
    net_amount: '2500000',
    withholding_rate_bps: 0,
    nonce: '0x01',
    signature: '0x02',
    valid_before: null,
    settled_block: null,
    settled_tx_hash: null,
    settled_at: null,
    released_at: null,
    status: 'AUTHORIZED',
    route: 'REFERRAL_TRADE_FEE_CASHBACK',
    payout_method: 'VOUCHER',
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  };
}

function renderClaims(readProfileId: () => string | undefined) {
  const store = configureStore({});
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store } as never, children);
  return renderHook(() => useInFlightClaims(readProfileId()), { wrapper });
}

describe('useInFlightClaims', () => {
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const flushPromises = () => new Promise(process.nextTick);
  const pendingFocusEffects: (() => void)[] = [];
  let focusEffect: (() => void) | undefined;

  function zeroJitter(): void {
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 0;
        }
        return array;
      });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    pendingFocusEffects.length = 0;
    focusEffect = () => {
      pendingFocusEffects.slice().forEach((effect) => {
        effect();
      });
    };
    mockUseFocusEffect.mockImplementation((effect) => {
      pendingFocusEffects.push(effect);
      // The busy refetch and the focus fetch each register one effect. A
      // later render replaces both, so a focus runs this render's pair.
      pendingFocusEffects.splice(
        0,
        Math.max(0, pendingFocusEffects.length - 2),
      );
    });
    mockEngineCall.mockResolvedValue({ results: [claim('claim-open')] });
  });

  it('stores the first page on focus', async () => {
    const { result } = renderClaims(() => PROFILE_A);

    expect(result.current.claims).toEqual([]);

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getClaimHistory',
      { forceFresh: false },
    );
    expect(result.current.claims).toEqual([claim('claim-open')]);
  });

  it('shows a claim written by the other screen after this one focused', async () => {
    const store = configureStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store } as never, children);
    const history = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });
    const earnings = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(history.result.current.claims).toEqual([claim('claim-open')]);

    mockEngineCall.mockResolvedValue({
      results: [claim('claim-open'), claim('claim-new')],
    });

    await act(async () => {
      await earnings.result.current.refresh({ forceFresh: true });
    });

    expect(history.result.current.claims).toEqual([
      claim('claim-open'),
      claim('claim-new'),
    ]);
  });

  it('keeps the fresh page when an earlier cache read resolves later', async () => {
    let resolveStale: (page: { results: ClaimDto[] }) => void = () => undefined;
    let resolveFresh: (page: { results: ClaimDto[] }) => void = () => undefined;
    mockEngineCall.mockImplementation(
      (_action: string, params: { forceFresh?: boolean }) =>
        new Promise((resolve) => {
          if (params.forceFresh) {
            resolveFresh = resolve;
            return;
          }
          resolveStale = resolve;
        }),
    );

    const store = configureStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store } as never, children);
    const history = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });
    const earnings = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });

    let staleRead: Promise<void> = Promise.resolve();
    let freshRead: Promise<void> = Promise.resolve();
    act(() => {
      staleRead = history.result.current.refresh();
      freshRead = earnings.result.current.refresh({ forceFresh: true });
    });

    await act(async () => {
      resolveFresh({ results: [claim('claim-new')] });
      await freshRead;
    });

    await act(async () => {
      resolveStale({ results: [claim('claim-open')] });
      await staleRead;
    });

    expect(history.result.current.claims).toEqual([claim('claim-new')]);
  });

  it('leaves the slice unchanged when a cache read resolves during a fresh refresh', async () => {
    let resolveCache: (page: { results: ClaimDto[] }) => void = () => undefined;
    let rejectFresh: (error: Error) => void = () => undefined;
    mockEngineCall.mockImplementation(
      (_action: string, params: { forceFresh?: boolean }) =>
        new Promise((resolve, reject) => {
          if (params.forceFresh) {
            rejectFresh = reject;
            return;
          }
          resolveCache = resolve;
        }),
    );

    const store = configureStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store } as never, children);
    const history = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });
    const earnings = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });

    let cacheRead: Promise<void> = Promise.resolve();
    let freshRead: Promise<void> = Promise.resolve();
    act(() => {
      freshRead = earnings.result.current.refresh({ forceFresh: true });
      cacheRead = history.result.current.refresh();
    });

    await act(async () => {
      resolveCache({ results: [claim('claim-open')] });
      await cacheRead;
    });

    expect(history.result.current.claims).toEqual([]);
    expect(earnings.result.current.claims).toEqual([]);

    await act(async () => {
      rejectFresh(new Error('offline'));
      await freshRead;
    });

    expect(history.result.current.claims).toEqual([]);
    expect(earnings.result.current.claims).toEqual([]);
  });

  it('keeps the later refresh page when overlapping refreshes answer out of order', async () => {
    const pending: ((page: { results: ClaimDto[] }) => void)[] = [];
    mockEngineCall.mockImplementation(
      () => new Promise((resolve) => pending.push(resolve)),
    );
    const store = configureStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store } as never, children);
    const history = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });
    const earnings = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });

    let firstRefresh: Promise<void> = Promise.resolve();
    let cacheRead: Promise<void> = Promise.resolve();
    let retryRefresh: Promise<void> = Promise.resolve();
    act(() => {
      firstRefresh = earnings.result.current.refresh({ forceFresh: true });
      cacheRead = history.result.current.refresh();
      retryRefresh = earnings.result.current.refresh({ forceFresh: true });
    });

    await act(async () => {
      pending[2]({ results: [claim('claim-open'), claim('claim-retry')] });
      await retryRefresh;
    });
    await act(async () => {
      pending[0]({ results: [claim('claim-open')] });
      await firstRefresh;
    });
    await act(async () => {
      pending[1]({ results: [] });
      await cacheRead;
    });

    expect(history.result.current.claims).toEqual([
      claim('claim-open'),
      claim('claim-retry'),
    ]);
  });

  it('treats a page without results as an empty list', async () => {
    mockEngineCall.mockResolvedValue({});
    const { result } = renderClaims(() => PROFILE_A);

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(result.current.claims).toEqual([]);
  });

  it('skips the fetch and clears claims when there is no profile', async () => {
    let profileId: string | undefined = PROFILE_A;
    const { result, rerender } = renderClaims(() => profileId);

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    profileId = undefined;
    rerender(undefined);

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(result.current.claims).toEqual([]);
  });

  it('keeps the last list when a refresh fails', async () => {
    const { result } = renderClaims(() => PROFILE_A);

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    mockEngineCall.mockRejectedValue(new Error('offline'));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.claims).toEqual([claim('claim-open')]);
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: {
        feature: 'rewards-money',
        context: 'inFlightClaims.fetch_failed',
      },
    });
  });

  it('publishes a cache page that was already in flight when a fresh refresh fails', async () => {
    const store = configureStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store } as never, children);
    const history = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });
    const earnings = renderHook(() => useInFlightClaims(PROFILE_A), {
      wrapper,
    });

    mockEngineCall.mockResolvedValue({ results: [claim('claim-before')] });
    await act(async () => {
      await history.result.current.refresh();
    });

    let resolveCache: (page: { results: ClaimDto[] }) => void = () => undefined;
    let rejectFresh: (error: Error) => void = () => undefined;
    mockEngineCall.mockImplementation(
      (_action: string, params: { forceFresh?: boolean }) =>
        new Promise((resolve, reject) => {
          if (params.forceFresh) {
            rejectFresh = reject;
            return;
          }
          resolveCache = resolve;
        }),
    );

    let cacheRead: Promise<void> = Promise.resolve();
    let freshRead: Promise<void> = Promise.resolve();
    act(() => {
      cacheRead = history.result.current.refresh();
      freshRead = earnings.result.current.refresh({ forceFresh: true });
    });

    await act(async () => {
      rejectFresh(new Error('offline'));
      await freshRead;
    });

    expect(history.result.current.claims).toEqual([claim('claim-before')]);

    await act(async () => {
      resolveCache({ results: [claim('claim-open')] });
      await cacheRead;
    });

    expect(history.result.current.claims).toEqual([claim('claim-open')]);
    expect(earnings.result.current.claims).toEqual([claim('claim-open')]);
  });

  it('reads past the cache when a claim just opened', async () => {
    const { result } = renderClaims(() => PROFILE_A);

    await act(async () => {
      await result.current.refresh({ forceFresh: true });
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getClaimHistory',
      { forceFresh: true },
    );
  });

  it('refetches once after Retry-After and does not schedule another', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    zeroJitter();
    try {
      mockEngineCall.mockRejectedValue(
        new RewardsMoneyHttpError('busy', 503, undefined, 2),
      );

      renderClaims(() => PROFILE_A);
      await act(async () => {
        focusEffect?.();
        await flushPromises();
      });
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(captureException).not.toHaveBeenCalled();

      mockEngineCall.mockResolvedValue({ results: [claim('claim-open')] });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();

      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(mockEngineCall).toHaveBeenLastCalledWith(
        'RewardsMoneyController:getClaimHistory',
        { forceFresh: true },
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();
      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(captureException).not.toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
      jest.useRealTimers();
    }
  });

  it('reports a short busy read only when the refetch fails', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    zeroJitter();
    try {
      const busy = new RewardsMoneyHttpError('busy', 503, undefined, 2);
      mockEngineCall.mockRejectedValue(busy);

      renderClaims(() => PROFILE_A);
      await act(async () => {
        focusEffect?.();
        await flushPromises();
      });

      expect(captureException).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      await flushPromises();

      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(busy, {
        tags: {
          feature: 'rewards-money',
          context: 'inFlightClaims.fetch_failed',
        },
      });
    } finally {
      jest.restoreAllMocks();
      jest.useRealTimers();
    }
  });
});
