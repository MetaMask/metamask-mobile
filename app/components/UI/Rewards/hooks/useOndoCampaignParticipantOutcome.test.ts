import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignParticipantStatus } from '../../../../reducers/rewards/selectors';
import { useOndoCampaignParticipantOutcome } from './useOndoCampaignParticipantOutcome';
import type { OndoGmCampaignParticipantOutcomeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignParticipantStatus: jest.fn(),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectCampaignParticipantStatus =
  selectCampaignParticipantStatus as jest.MockedFunction<
    typeof selectCampaignParticipantStatus
  >;

const CAMPAIGN_ID = 'campaign-123';
const SUBSCRIPTION_ID = 'sub-456';

const MOCK_OUTCOME: OndoGmCampaignParticipantOutcomeDto = {
  subscriptionId: SUBSCRIPTION_ID,
  outcomeStatus: 'pending',
  winnerVerificationCode: 'WINNER-XYZ',
};

function setupSelectors({
  subscriptionId = SUBSCRIPTION_ID,
  isOptedIn = true,
}: {
  subscriptionId?: string | null;
  isOptedIn?: boolean;
} = {}) {
  const participantStatusSelector = jest
    .fn()
    .mockReturnValue(isOptedIn ? { optedIn: true } : null);
  mockSelectCampaignParticipantStatus.mockReturnValue(
    participantStatusSelector,
  );
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    if (selector === participantStatusSelector)
      return isOptedIn ? { optedIn: true } : null;
    return undefined;
  });
}

describe('useOndoCampaignParticipantOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null outcome and no loading when campaignId is undefined', async () => {
    setupSelectors();
    const { result } = renderHook(() =>
      useOndoCampaignParticipantOutcome(undefined),
    );
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.outcome).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns null outcome when subscriptionId is missing', async () => {
    setupSelectors({ subscriptionId: null });
    const { result } = renderHook(() =>
      useOndoCampaignParticipantOutcome(CAMPAIGN_ID),
    );
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.outcome).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns null outcome when user is not opted in', async () => {
    setupSelectors({ isOptedIn: false });
    const { result } = renderHook(() =>
      useOndoCampaignParticipantOutcome(CAMPAIGN_ID),
    );
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.outcome).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches outcome and returns it when all conditions are met', async () => {
    setupSelectors();
    mockCall.mockResolvedValue(MOCK_OUTCOME);

    const { result } = renderHook(() =>
      useOndoCampaignParticipantOutcome(CAMPAIGN_ID),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.outcome).toEqual(MOCK_OUTCOME);
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignParticipantOutcome',
      CAMPAIGN_ID,
      SUBSCRIPTION_ID,
    );
    expect(result.current.hasError).toBe(false);
  });

  it('sets hasError and clears outcome when the fetch throws', async () => {
    setupSelectors();
    mockCall.mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(() =>
      useOndoCampaignParticipantOutcome(CAMPAIGN_ID),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.outcome).toBeNull();
    expect(result.current.hasError).toBe(true);
  });
});
