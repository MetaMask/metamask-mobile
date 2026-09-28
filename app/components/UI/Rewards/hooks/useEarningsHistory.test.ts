import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
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

const PROFILE_A = 'profile-a';
const earning = {
  type: 'earning' as const,
  id: 'earn-1',
  earning_origin_type: 'REFERRAL_REV_SHARE' as const,
  musd_amount: '1000000',
  fee_amount_usd: '1',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  claim_status: 'unclaimed',
  claim_expires_at: null,
  swaps_source: null,
  perps_source: null,
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
});
