import { act, renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { earningRow } from '../../../../../tests/component-view/presets/rewardsMoney';
import { useReferralEarningsLedger } from './useReferralEarningsLedger';

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
  ...earningRow(1),
  earning_origin_type: 'REFERRAL_REV_SHARE' as const,
};
const claim = {
  type: 'claim' as const,
  id: 'claim-1',
  route: 'REFERRAL_REV_SHARE',
  gross_amount: '1',
  net_amount: '1',
  withholding_rate_bps: 0,
  status: 'SETTLED',
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  settled_at: null,
};

describe('useReferralEarningsLedger', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.Mock;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('asks for referral revenue share earnings only, without claims', async () => {
    const { result } = renderHook(() => useReferralEarningsLedger(PROFILE_A));

    await waitFor(() => {
      expect(result.current.items).toEqual([earning]);
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsLedger',
      {
        originTypes: ['REFERRAL_REV_SHARE'],
        cursor: undefined,
        includeClaims: false,
        forceFresh: false,
      },
    );
  });

  it('sends the cursor on the next page', async () => {
    mockEngineCall
      .mockResolvedValueOnce({
        results: [earning],
        has_more: true,
        cursor: 'cursor-2',
        window: null,
      })
      .mockResolvedValueOnce({
        results: [{ ...earning, id: 'earn-2' }],
        has_more: false,
        cursor: null,
        window: null,
      });

    const { result } = renderHook(() => useReferralEarningsLedger(PROFILE_A));

    await waitFor(() => {
      expect(result.current.items).toEqual([earning]);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });
    expect(mockEngineCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:getEarningsLedger',
      expect.objectContaining({
        originTypes: ['REFERRAL_REV_SHARE'],
        cursor: 'cursor-2',
        forceFresh: undefined,
      }),
    );
  });

  it('does not fetch without a profile', () => {
    renderHook(() => useReferralEarningsLedger(undefined));

    expect(mockEngineCall).not.toHaveBeenCalled();
  });
});
