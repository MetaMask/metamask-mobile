import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { setCommissions } from '../../../../reducers/rewardsMoney';
import {
  FOLLOW_TRADE_COMMISSIONS_ORIGIN,
  useCommissions,
} from './useCommissions';

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
const page = {
  results: [
    {
      id: 'SOCIAL_FOLLOW_TRADE:2026-09-01:perps:BTC',
      earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
      day: '2026-09-01',
      token: { key: 'perps:BTC', symbol: 'BTC', source: 'PERPS' },
      musd_amount: '2500000',
      fee_amount_usd: '10.00000000',
      fill_count: 3,
      copied_times: 2,
    },
  ],
  mechanisms: {
    REFERRAL_REV_SHARE: {
      claim_open: false,
      reason: 'MECHANISM_NOT_CLAIMABLE',
    },
    SOCIAL_FOLLOW_TRADE: {
      claim_open: false,
      reason: 'MECHANISM_NOT_CLAIMABLE',
    },
  },
  has_more: false,
  cursor: null,
};

describe('useCommissions', () => {
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
    mockEngineCall.mockResolvedValue(page);
  });

  it('fetches follow-trade commissions and caches the first page', async () => {
    const { result } = renderHook(() => useCommissions(PROFILE_A));

    await waitFor(() => {
      expect(result.current.items).toEqual(page.results);
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getCommissions',
      {
        originType: FOLLOW_TRADE_COMMISSIONS_ORIGIN,
        cursor: undefined,
        forceFresh: false,
      },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCommissions({ profileId: PROFILE_A, items: page.results }),
    );
  });

  it('does not fetch when disabled', async () => {
    renderHook(() => useCommissions(PROFILE_A, { enabled: false }));
    await flushPromises();

    expect(mockEngineCall).not.toHaveBeenCalled();
  });
});
