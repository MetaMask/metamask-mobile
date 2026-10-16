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
    React.createElement(Provider, { store }, children);
  return renderHook(() => useInFlightClaims(readProfileId()), { wrapper });
}

describe('useInFlightClaims', () => {
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const flushPromises = () => new Promise(process.nextTick);
  let focusEffect: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    focusEffect = undefined;
    mockUseFocusEffect.mockImplementation((effect) => {
      focusEffect = effect;
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
      React.createElement(Provider, { store }, children);
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
      React.createElement(Provider, { store }, children);
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
});
