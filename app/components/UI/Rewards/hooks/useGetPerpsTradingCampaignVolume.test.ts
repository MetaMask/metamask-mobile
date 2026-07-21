import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetPerpsTradingCampaignVolume } from './useGetPerpsTradingCampaignVolume';
import Engine from '../../../../core/Engine';
import {
  setPerpsTradingCampaignVolume,
  setPerpsTradingCampaignVolumeLoading,
  setPerpsTradingCampaignVolumeError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { PerpsTradingCampaignVolumeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
    setPerpsTradingCampaignVolume: jest.fn((payload) => ({
      type: 'rewards/setPerpsTradingCampaignVolume',
      payload,
    })),
    setPerpsTradingCampaignVolumeLoading: jest.fn((payload) => ({
      type: 'rewards/setPerpsTradingCampaignVolumeLoading',
      payload,
    })),
    setPerpsTradingCampaignVolumeError: jest.fn((payload) => ({
      type: 'rewards/setPerpsTradingCampaignVolumeError',
      payload,
    })),
  };
});

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

const CAMPAIGN_ID = 'campaign-123';
const MOCK_VOLUME: PerpsTradingCampaignVolumeDto = {
  totalUsdVolume: '5000000',
};

function setupSelectors(rewardsOverrides: Partial<RewardsState>) {
  const mockRootState = {
    rewards: { ...initialState, ...rewardsOverrides },
  } as RootState;
  mockUseSelector.mockImplementation((selector) => selector(mockRootState));
}

function createVolumeCache(
  campaignId: string,
  overrides: {
    data?: PerpsTradingCampaignVolumeDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    perpsTradingCampaignVolumes: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetPerpsTradingCampaignVolume', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createVolumeCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', async () => {
    renderHook(() => useGetPerpsTradingCampaignVolume(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches volume and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_VOLUME as never);

    renderHook(() => useGetPerpsTradingCampaignVolume(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeError({
        campaignId: CAMPAIGN_ID,
        error: false,
      }),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPerpsTradingCampaignVolume',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolume({
        campaignId: CAMPAIGN_ID,
        volume: MOCK_VOLUME,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches error action on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetPerpsTradingCampaignVolume(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeError({
        campaignId: CAMPAIGN_ID,
        error: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('returns volume data from selector', () => {
    setupSelectors(createVolumeCache(CAMPAIGN_ID, { data: MOCK_VOLUME }));

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignVolume(CAMPAIGN_ID),
    );

    expect(result.current.volume).toEqual(MOCK_VOLUME);
  });

  it('returns loading state from selector', () => {
    setupSelectors(createVolumeCache(CAMPAIGN_ID, { loading: true }));

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignVolume(CAMPAIGN_ID),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from selector', () => {
    setupSelectors(createVolumeCache(CAMPAIGN_ID, { error: true }));

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignVolume(CAMPAIGN_ID),
    );

    expect(result.current.hasError).toBe(true);
  });

  it('refetch function re-fetches the volume', async () => {
    mockCall.mockResolvedValue(MOCK_VOLUME as never);

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignVolume(CAMPAIGN_ID),
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
      setPerpsTradingCampaignVolumeLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
  });
});
