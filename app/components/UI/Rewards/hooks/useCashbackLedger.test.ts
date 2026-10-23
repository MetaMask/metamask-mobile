import { act, renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { setCashbackLedger } from '../../../../reducers/rewardsMoney';
import {
  CASHBACK_LEDGER_ORIGIN_TYPES,
  useCashbackLedger,
} from './useCashbackLedger';

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
  earning_origin_type: 'SWAPS_FEE_CASHBACK' as const,
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
  route: 'REFERRAL_TRADE_FEE_CASHBACK',
  gross_amount: '1',
  net_amount: '1',
  withholding_rate_bps: 0,
  status: 'SETTLED',
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  settled_at: null,
};

describe('useCashbackLedger', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const flushPromises = () => new Promise(process.nextTick);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockReturnValue(undefined);
    mockUseFocusEffect.mockImplementation((effect) => {
      effect();
    });
    mockEngineCall.mockResolvedValue({
      results: [earning, claim],
      has_more: false,
      cursor: null,
      window: null,
    });
  });

  it('fetches cashback earnings without claims and drops claim rows', async () => {
    const { result } = renderHook(() => useCashbackLedger(PROFILE_A));

    await waitFor(() => {
      expect(result.current.items).toEqual([earning]);
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsLedger',
      {
        originTypes: CASHBACK_LEDGER_ORIGIN_TYPES,
        cursor: undefined,
        includeClaims: false,
        forceFresh: false,
      },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCashbackLedger({ profileId: PROFILE_A, items: [earning] }),
    );
  });

  it('sends the cursor and origin filter on the next page and drops claim rows', async () => {
    const laterEarning = { ...earning, id: 'earn-2' };
    mockEngineCall
      .mockResolvedValueOnce({
        results: [earning, claim],
        has_more: true,
        cursor: 'cursor-2',
        window: null,
      })
      .mockResolvedValueOnce({
        results: [laterEarning, claim],
        has_more: false,
        cursor: null,
        window: null,
      });

    const { result } = renderHook(() => useCashbackLedger(PROFILE_A));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual([earning]);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.items).toEqual([earning, laterEarning]);
    });

    expect(mockEngineCall).toHaveBeenNthCalledWith(
      2,
      'RewardsMoneyController:getEarningsLedger',
      {
        originTypes: CASHBACK_LEDGER_ORIGIN_TYPES,
        cursor: 'cursor-2',
        includeClaims: false,
        forceFresh: undefined,
      },
    );
  });

  it('does not fetch when disabled', async () => {
    renderHook(() => useCashbackLedger(PROFILE_A, { enabled: false }));
    await flushPromises();

    expect(mockEngineCall).not.toHaveBeenCalled();
  });
});
