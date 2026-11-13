import { act, renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { setEarningsHistory } from '../../../../reducers/rewardsMoney';
import { useEarningsHistory } from './useEarningsHistory';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
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
const earning = {
  type: 'earning' as const,
  id: 'earn-1',
  earning_origin_type: 'REFERRAL_REV_SHARE' as const,
  musd_amount: '1000000',
  voided_musd_amount: '0',
  fee_amount_usd: '1',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  claim_status: 'unclaimed',
  claimable_at: '2026-09-02T00:00:00.000Z',
  swaps_source: null,
  perps_source: null,
  predict_source: null,
};
const claim = {
  type: 'claim' as const,
  id: 'claim-1',
  route: 'REFERRAL_REV_SHARE',
  gross_amount: '1000000',
  net_amount: '900000',
  withholding_rate_bps: 1000,
  status: 'SETTLED',
  ledger_timestamp: '2026-09-02T00:00:00.000Z',
  settled_at: '2026-09-02T00:00:00.000Z',
  payout_method: 'VOUCHER',
};

describe('useEarningsHistory', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const flushPromises = () => new Promise(process.nextTick);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockReturnValue(undefined);
    mockEngineCall.mockResolvedValue({
      results: [earning, claim],
      has_more: false,
      cursor: null,
      window: null,
    });
  });

  it('keeps earnings and settled claims in one feed', async () => {
    const { result } = renderHook(() => useEarningsHistory(PROFILE_A));

    await waitFor(() => {
      expect(result.current.items).toEqual([earning, claim]);
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsLedger',
      {
        cursor: undefined,
        includeClaims: true,
        forceFresh: false,
      },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setEarningsHistory({ profileId: PROFILE_A, items: [earning, claim] }),
    );
  });

  it('does not fetch when disabled', async () => {
    renderHook(() => useEarningsHistory(PROFILE_A, { enabled: false }));
    await flushPromises();

    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('asks for a failed later page again only once', async () => {
    (useFocusEffect as jest.Mock).mockImplementation((effect: () => void) => {
      effect();
    });
    mockEngineCall.mockResolvedValueOnce({
      results: [earning],
      has_more: true,
      cursor: 'cursor-2',
      window: null,
    });

    const { result } = renderHook(() => useEarningsHistory(PROFILE_A));

    await waitFor(() => {
      expect(result.current.items).not.toBeNull();
    });

    mockEngineCall.mockRejectedValue(new Error('boom'));
    jest.useFakeTimers();
    try {
      await act(async () => {
        result.current.loadMore();
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(60_000);
      });

      expect(mockEngineCall).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not fetch without a profile', async () => {
    renderHook(() => useEarningsHistory(undefined));
    await flushPromises();

    expect(mockEngineCall).not.toHaveBeenCalled();
  });
});
