import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetCampaignParticipantStatus } from './useGetCampaignParticipantStatus';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignParticipantStatus } from '../../../../reducers/rewards/selectors';
import { setCampaignParticipantStatus } from '../../../../reducers/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import type { CampaignParticipantStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
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

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignParticipantStatus: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setCampaignParticipantStatus: jest.fn(),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseInvalidateByRewardEvents =
  useInvalidateByRewardEvents as jest.MockedFunction<
    typeof useInvalidateByRewardEvents
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSetCampaignParticipantStatus =
  setCampaignParticipantStatus as unknown as jest.MockedFunction<
    (payload: { subscriptionId: string; campaignId: string; status: CampaignParticipantStatusDto }) => {
      type: string;
      payload: { subscriptionId: string; campaignId: string; status: CampaignParticipantStatusDto };
    }
  >;
const mockSelectCampaignParticipantStatus =
  selectCampaignParticipantStatus as jest.MockedFunction<
    typeof selectCampaignParticipantStatus
  >;

const SUB_ID = 'sub-123';
const CAMPAIGN_ID = 'camp-456';
const STATUS = { optedIn: true, participantCount: 42 };

const mockDispatch = jest.fn();
const mockParticipantStatusSelector = jest.fn();

function setupSelectors(
  subscriptionId: string | null,
  participantStatus: CampaignParticipantStatusDto | null = null,
) {
  mockParticipantStatusSelector.mockReturnValue(participantStatus);
  mockSelectCampaignParticipantStatus.mockReturnValue(
    mockParticipantStatusSelector,
  );

  let currentStatus = participantStatus;

  mockDispatch.mockImplementation((action) => {
    if (
      action?.type === 'rewards/setCampaignParticipantStatus' &&
      action.payload?.status
    ) {
      currentStatus = action.payload.status;
      mockParticipantStatusSelector.mockReturnValue(currentStatus);
    }
  });

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    if (selector === mockParticipantStatusSelector) return currentStatus;
    return undefined;
  });
}

describe('useGetCampaignParticipantStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockSetCampaignParticipantStatus.mockImplementation((payload) => ({
      type: 'rewards/setCampaignParticipantStatus',
      payload,
    }));
  });

  it('fetches and dispatches status on mount', async () => {
    setupSelectors(SUB_ID);
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
    expect(mockDispatch).toHaveBeenCalledWith(
      mockSetCampaignParticipantStatus({
        subscriptionId: SUB_ID,
        campaignId: CAMPAIGN_ID,
        status: STATUS,
      }),
    );
    expect(result.current.status).toEqual(STATUS);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('sets hasError on failure', async () => {
    setupSelectors(SUB_ID);
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
    setupSelectors(SUB_ID);
    mockCall.mockResolvedValue({
      optedIn: false,
      participantCount: 0,
    } as never);

    renderHook(() => useGetCampaignParticipantStatus(CAMPAIGN_ID));

    expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
      expect.arrayContaining(['RewardsController:campaignOptedIn']),
      expect.any(Function),
    );
  });

  it('allows manual refetch', async () => {
    const INITIAL_STATUS = { optedIn: false, participantCount: 0 };
    setupSelectors(SUB_ID);
    mockCall
      .mockResolvedValueOnce(INITIAL_STATUS as never)
      .mockResolvedValueOnce(STATUS as never);

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetCampaignParticipantStatus(CAMPAIGN_ID),
    );
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.status).toEqual(INITIAL_STATUS);

    await act(async () => {
      result.current.refetch();
      await waitForNextUpdate();
    });
    expect(result.current.status).toEqual(STATUS);
  });

  it('skips fetch when subscriptionId is missing', async () => {
    setupSelectors(null);
    const { result } = renderHook(() =>
      useGetCampaignParticipantStatus(CAMPAIGN_ID),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.status).toBeNull();
  });
});
