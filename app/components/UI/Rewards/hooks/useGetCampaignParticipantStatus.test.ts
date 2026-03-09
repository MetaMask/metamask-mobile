import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useGetCampaignParticipantStatus } from './useGetCampaignParticipantStatus';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/rewards', () => ({
  selectCampaignsRewardsEnabledFlag: jest.fn(),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseInvalidateByRewardEvents =
  useInvalidateByRewardEvents as jest.MockedFunction<
    typeof useInvalidateByRewardEvents
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const SUB_ID = 'sub-123';
const CAMPAIGN_ID = 'camp-456';
const STATUS = { optedIn: true };

function setupSelectors(
  subscriptionId: string | null,
  campaignsEnabled: boolean,
) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    if (selector === selectCampaignsRewardsEnabledFlag) return campaignsEnabled;
    return undefined;
  });
}

describe('useGetCampaignParticipantStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips fetch and returns null status when feature flag is disabled', async () => {
    setupSelectors(SUB_ID, false);
    const { result } = renderHook(() =>
      useGetCampaignParticipantStatus(CAMPAIGN_ID),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.status).toBeNull();
  });

  it('fetches and returns status on mount', async () => {
    setupSelectors(SUB_ID, true);
    mockCall.mockResolvedValueOnce(STATUS as never);

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetCampaignParticipantStatus(CAMPAIGN_ID),
    );
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getCampaignParticipantStatus',
      CAMPAIGN_ID,
      SUB_ID,
    );
    expect(result.current.status).toEqual(STATUS);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('sets hasError on failure', async () => {
    setupSelectors(SUB_ID, true);
    mockCall.mockRejectedValueOnce(new Error('fail') as never);

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetCampaignParticipantStatus(CAMPAIGN_ID),
    );
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.status).toBeNull();
  });

  it('subscribes to RewardsController:campaignOptedIn to auto-refetch', () => {
    setupSelectors(SUB_ID, true);
    mockCall.mockResolvedValue({ optedIn: false } as never);

    renderHook(() => useGetCampaignParticipantStatus(CAMPAIGN_ID));

    expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
      expect.arrayContaining(['RewardsController:campaignOptedIn']),
      expect.any(Function),
    );
  });

  it('allows manual refetch', async () => {
    setupSelectors(SUB_ID, true);
    mockCall
      .mockResolvedValueOnce({ optedIn: false } as never)
      .mockResolvedValueOnce(STATUS as never);

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetCampaignParticipantStatus(CAMPAIGN_ID),
    );
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.status).toEqual({ optedIn: false });

    await act(async () => {
      result.current.refetch();
      await waitForNextUpdate();
    });
    expect(result.current.status).toEqual(STATUS);
  });
});
