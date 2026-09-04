import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetPerpsTradingCampaignPrizePool } from './useGetPerpsTradingCampaignPrizePool';
import {
  setPerpsTradingCampaignPrizePool,
  setPerpsTradingCampaignPrizePoolLoading,
  setPerpsTradingCampaignPrizePoolError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { PerpsTradingCampaignPrizePoolDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards', () => {
  const actual = jest.requireActual('../../../../reducers/rewards');
  return {
    ...actual,
    setPerpsTradingCampaignPrizePool: jest.fn((payload) => ({
      type: 'rewards/setPerpsTradingCampaignPrizePool',
      payload,
    })),
    setPerpsTradingCampaignPrizePoolLoading: jest.fn((payload) => ({
      type: 'rewards/setPerpsTradingCampaignPrizePoolLoading',
      payload,
    })),
    setPerpsTradingCampaignPrizePoolError: jest.fn((payload) => ({
      type: 'rewards/setPerpsTradingCampaignPrizePoolError',
      payload,
    })),
  };
});

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const CAMPAIGN_ID = 'perps-campaign-1';
const MOCK_PRIZE_POOL: PerpsTradingCampaignPrizePoolDto = {
  totalVolumeUsd: 7_500_000,
  unlockedPoolUsd: 15_000,
  thresholdsUsd: [0, 5_000_000],
  poolScheduleUsd: [10_000, 15_000],
  computedAt: '2026-07-15T00:00:00.000Z',
};

function setupSelectors(rewardsOverrides: Partial<RewardsState>) {
  const mockRootState = {
    rewards: { ...initialState, ...rewardsOverrides },
  } as RootState;
  mockUseSelector.mockImplementation((selector) => selector(mockRootState));
}

function createPrizePoolCache(
  campaignId: string,
  overrides: {
    data?: PerpsTradingCampaignPrizePoolDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    perpsTradingCampaignPrizePools: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetPerpsTradingCampaignPrizePool', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createPrizePoolCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', () => {
    renderHook(() => useGetPerpsTradingCampaignPrizePool(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches prize pool and dispatches success action', async () => {
    mockCall.mockResolvedValueOnce(MOCK_PRIZE_POOL as never);

    renderHook(() => useGetPerpsTradingCampaignPrizePool(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPerpsTradingCampaignPrizePool',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolError({
        campaignId: CAMPAIGN_ID,
        error: false,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePool({
        campaignId: CAMPAIGN_ID,
        prizePool: MOCK_PRIZE_POOL,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches error on failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    renderHook(() => useGetPerpsTradingCampaignPrizePool(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolError({
        campaignId: CAMPAIGN_ID,
        error: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('returns selector state and refetches', async () => {
    setupSelectors(
      createPrizePoolCache(CAMPAIGN_ID, {
        data: MOCK_PRIZE_POOL,
        loading: true,
        error: true,
      }),
    );
    mockCall.mockResolvedValue(MOCK_PRIZE_POOL as never);

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignPrizePool(CAMPAIGN_ID),
    );

    expect(result.current.prizePool).toEqual(MOCK_PRIZE_POOL);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(true);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
  });
});
