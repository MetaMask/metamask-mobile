import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetPerpsTradingCampaignVolume } from './useGetPerpsTradingCampaignVolume';
import Engine from '../../../../core/Engine';
import {
  selectPerpsTradingCampaignVolume,
  selectPerpsTradingCampaignVolumeLoading,
  selectPerpsTradingCampaignVolumeError,
} from '../../../../reducers/rewards/selectors';
import {
  setPerpsTradingCampaignVolume,
  setPerpsTradingCampaignVolumeLoading,
  setPerpsTradingCampaignVolumeError,
} from '../../../../reducers/rewards';
import type { PerpsTradingCampaignVolumeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectPerpsTradingCampaignVolume: jest.fn(),
  selectPerpsTradingCampaignVolumeLoading: jest.fn(),
  selectPerpsTradingCampaignVolumeError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
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
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

const CAMPAIGN_ID = 'campaign-123';
const MOCK_VOLUME: PerpsTradingCampaignVolumeDto = {
  totalUsdVolume: '5000000',
};

interface SelectorState {
  volume: PerpsTradingCampaignVolumeDto | null;
  isLoading: boolean;
  hasError: boolean;
}

function setupSelectors(state: SelectorState) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPerpsTradingCampaignVolume) return state.volume;
    if (selector === selectPerpsTradingCampaignVolumeLoading)
      return state.isLoading;
    if (selector === selectPerpsTradingCampaignVolumeError)
      return state.hasError;
    return undefined;
  });
}

describe('useGetPerpsTradingCampaignVolume', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({ volume: null, isLoading: false, hasError: false });
  });

  it('does not fetch when campaignId is undefined but resets loading and error', async () => {
    renderHook(() => useGetPerpsTradingCampaignVolume(undefined));

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeLoading(false),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeError(false),
    );
  });

  it('fetches volume and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_VOLUME as never);

    renderHook(() => useGetPerpsTradingCampaignVolume(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeLoading(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeError(false),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPerpsTradingCampaignVolume',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolume(MOCK_VOLUME),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeLoading(false),
    );
  });

  it('dispatches error action on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetPerpsTradingCampaignVolume(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeError(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignVolumeLoading(false),
    );
  });

  it('returns volume data from selector', () => {
    setupSelectors({
      volume: MOCK_VOLUME,
      isLoading: false,
      hasError: false,
    });

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignVolume(CAMPAIGN_ID),
    );

    expect(result.current.volume).toEqual(MOCK_VOLUME);
  });

  it('returns loading state from selector', () => {
    setupSelectors({ volume: null, isLoading: true, hasError: false });

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignVolume(CAMPAIGN_ID),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from selector', () => {
    setupSelectors({ volume: null, isLoading: false, hasError: true });

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
      setPerpsTradingCampaignVolumeLoading(true),
    );
  });
});
