import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetPerpsTradingCampaignPrizePool } from './useGetPerpsTradingCampaignPrizePool';
import Engine from '../../../../core/Engine';
import {
  selectPerpsTradingCampaignPrizePool,
  selectPerpsTradingCampaignPrizePoolLoading,
  selectPerpsTradingCampaignPrizePoolError,
} from '../../../../reducers/rewards/selectors';
import {
  setPerpsTradingCampaignPrizePool,
  setPerpsTradingCampaignPrizePoolLoading,
  setPerpsTradingCampaignPrizePoolError,
} from '../../../../reducers/rewards';
import type { PerpsTradingCampaignPrizePoolDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectPerpsTradingCampaignPrizePool: jest.fn(),
  selectPerpsTradingCampaignPrizePoolLoading: jest.fn(),
  selectPerpsTradingCampaignPrizePoolError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
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
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

const CAMPAIGN_ID = 'campaign-123';
const MOCK_PRIZE_POOL: PerpsTradingCampaignPrizePoolDto = {
  currentNotionalVolume: '5000000',
  currentPrize: 15000,
  maxPrize: 50000,
  milestones: [
    { notionalVolume: 0, prize: 10000 },
    { notionalVolume: 5_000_000, prize: 15000 },
    { notionalVolume: 40_000_000, prize: 50000 },
  ],
};

interface SelectorState {
  prizePool: PerpsTradingCampaignPrizePoolDto | null;
  isLoading: boolean;
  hasError: boolean;
}

function setupSelectors(state: SelectorState) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPerpsTradingCampaignPrizePool)
      return state.prizePool;
    if (selector === selectPerpsTradingCampaignPrizePoolLoading)
      return state.isLoading;
    if (selector === selectPerpsTradingCampaignPrizePoolError)
      return state.hasError;
    return undefined;
  });
}

describe('useGetPerpsTradingCampaignPrizePool', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({ prizePool: null, isLoading: false, hasError: false });
  });

  it('does not fetch when campaignId is undefined but resets loading and error', async () => {
    renderHook(() => useGetPerpsTradingCampaignPrizePool(undefined));

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolLoading(false),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolError(false),
    );
  });

  it('fetches prize pool and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_PRIZE_POOL as never);

    renderHook(() => useGetPerpsTradingCampaignPrizePool(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolLoading(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolError(false),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPerpsTradingCampaignPrizePool',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePool(MOCK_PRIZE_POOL),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolLoading(false),
    );
  });

  it('dispatches error action on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetPerpsTradingCampaignPrizePool(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolError(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolLoading(false),
    );
  });

  it('returns prize pool data from selector', () => {
    setupSelectors({
      prizePool: MOCK_PRIZE_POOL,
      isLoading: false,
      hasError: false,
    });

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignPrizePool(CAMPAIGN_ID),
    );

    expect(result.current.prizePool).toEqual(MOCK_PRIZE_POOL);
  });

  it('returns loading state from selector', () => {
    setupSelectors({ prizePool: null, isLoading: true, hasError: false });

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignPrizePool(CAMPAIGN_ID),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from selector', () => {
    setupSelectors({ prizePool: null, isLoading: false, hasError: true });

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignPrizePool(CAMPAIGN_ID),
    );

    expect(result.current.hasError).toBe(true);
  });

  it('refetch function re-fetches the prize pool', async () => {
    mockCall.mockResolvedValue(MOCK_PRIZE_POOL as never);

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignPrizePool(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    mockDispatch.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignPrizePoolLoading(true),
    );
  });
});
