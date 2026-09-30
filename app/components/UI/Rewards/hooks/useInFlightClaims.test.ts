/**
 * History views mock this hook. The behavior is the focus fetch and what
 * happens when it fails, so this stays a hook unit test.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { ClaimDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useInFlightClaims } from './useInFlightClaims';

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

  it('loads claims on focus', async () => {
    const { result } = renderHook(() => useInFlightClaims(PROFILE_A));

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getClaimHistory',
      { forceFresh: true },
    );
    expect(result.current.claims).toEqual([claim('claim-open')]);
  });

  it('treats a page without results as an empty list', async () => {
    mockEngineCall.mockResolvedValue({});
    const { result } = renderHook(() => useInFlightClaims(PROFILE_A));

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(result.current.claims).toEqual([]);
  });

  it('skips the fetch and clears claims when there is no profile', async () => {
    const { result, rerender } = renderHook(
      ({ profileId }: { profileId: string | undefined }) =>
        useInFlightClaims(profileId),
      { initialProps: { profileId: PROFILE_A as string | undefined } },
    );

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    rerender({ profileId: undefined });

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    expect(mockEngineCall).toHaveBeenCalledTimes(1);
    expect(result.current.claims).toEqual([]);
  });

  it('keeps the last list when a refresh fails', async () => {
    const { result } = renderHook(() => useInFlightClaims(PROFILE_A));

    await act(async () => {
      focusEffect?.();
      await flushPromises();
    });

    mockEngineCall.mockRejectedValue(new Error('offline'));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.claims).toEqual([claim('claim-open')]);
  });
});
