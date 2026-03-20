import { renderHook } from '@testing-library/react-hooks';
import { useOndoLeaderboardPosition } from './useOndoLeaderboardPosition';
import { useGetCampaignLeaderboardPosition } from './useGetCampaignLeaderboardPosition';
import type { CampaignLeaderboardPositionDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('./useGetCampaignLeaderboardPosition');

const mockUseGetCampaignLeaderboardPosition =
  useGetCampaignLeaderboardPosition as jest.MockedFunction<
    typeof useGetCampaignLeaderboardPosition
  >;

const CAMPAIGN_ID = 'campaign-123';

const MOCK_POSITION: CampaignLeaderboardPositionDto = {
  projected_tier: 'MID',
  rank: 5,
  total_in_tier: 150,
  rate_of_return: 0.15,
  current_usd_value: 12500.5,
  total_usd_deposited: 10000.0,
  net_deposit: 8500.0,
  computed_at: '2024-03-20T12:00:00.000Z',
};

const mockRefetch = jest.fn();

describe('useOndoLeaderboardPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null positionData when no position is loaded', () => {
    mockUseGetCampaignLeaderboardPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() =>
      useOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(result.current.positionData).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('maps position data to OndoLeaderboardPositionData shape', () => {
    mockUseGetCampaignLeaderboardPosition.mockReturnValue({
      position: MOCK_POSITION,
      isLoading: false,
      hasError: false,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() =>
      useOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(result.current.positionData).toEqual({
      rank: 5,
      projected_tier: 'MID',
      rate_of_return: 0.15,
      total_usd_deposited: 10000.0,
      current_usd_value: 12500.5,
      computed_at: '2024-03-20T12:00:00.000Z',
    });
  });

  it('forwards isLoading state', () => {
    mockUseGetCampaignLeaderboardPosition.mockReturnValue({
      position: null,
      isLoading: true,
      hasError: false,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() =>
      useOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('forwards hasError state', () => {
    mockUseGetCampaignLeaderboardPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: true,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() =>
      useOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(result.current.hasError).toBe(true);
  });

  it('forwards refetch function', () => {
    mockUseGetCampaignLeaderboardPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() =>
      useOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(result.current.refetch).toBe(mockRefetch);
  });

  it('passes campaignId to useGetCampaignLeaderboardPosition', () => {
    mockUseGetCampaignLeaderboardPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      refetch: mockRefetch,
    });

    renderHook(() => useOndoLeaderboardPosition(CAMPAIGN_ID));

    expect(mockUseGetCampaignLeaderboardPosition).toHaveBeenCalledWith(
      CAMPAIGN_ID,
    );
  });

  it('passes undefined campaignId through', () => {
    mockUseGetCampaignLeaderboardPosition.mockReturnValue({
      position: null,
      isLoading: false,
      hasError: false,
      refetch: mockRefetch,
    });

    renderHook(() => useOndoLeaderboardPosition(undefined));

    expect(mockUseGetCampaignLeaderboardPosition).toHaveBeenCalledWith(
      undefined,
    );
  });
});
