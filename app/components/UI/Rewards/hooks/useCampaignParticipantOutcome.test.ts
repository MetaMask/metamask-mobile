import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignParticipantOptedIn } from '../../../../reducers/rewards/selectors';
import { useCampaignParticipantOutcome } from './useCampaignParticipantOutcome';
import type { BaseCampaignParticipantOutcomeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
  selectCampaignParticipantOptedIn: jest.fn(),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectCampaignParticipantOptedIn =
  selectCampaignParticipantOptedIn as jest.MockedFunction<
    typeof selectCampaignParticipantOptedIn
  >;

const CAMPAIGN_ID = 'campaign-123';
const SUBSCRIPTION_ID = 'sub-456';
const MESSENGER_ACTION = 'RewardsController:getOndoCampaignParticipantOutcome';
const CONFIG = { messengerAction: MESSENGER_ACTION };

const MOCK_OUTCOME: BaseCampaignParticipantOutcomeDto = {
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
  const participantOptedInSelector = jest.fn().mockReturnValue(isOptedIn);
  mockSelectCampaignParticipantOptedIn.mockReturnValue(
    participantOptedInSelector,
  );
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    if (selector === participantOptedInSelector) return isOptedIn;
    return undefined;
  });
}

describe('useCampaignParticipantOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and returns outcome when subscriptionId, campaignId, and isOptedIn are truthy', async () => {
    setupSelectors();
    mockCall.mockResolvedValue(MOCK_OUTCOME);

    const { result } = renderHook(() =>
      useCampaignParticipantOutcome(CAMPAIGN_ID, CONFIG),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.outcome).toEqual(MOCK_OUTCOME);
    });

    expect(mockCall).toHaveBeenCalledWith(
      MESSENGER_ACTION,
      CAMPAIGN_ID,
      SUBSCRIPTION_ID,
    );
    expect(result.current.hasError).toBe(false);
  });

  it('returns null outcome when campaignId is undefined', async () => {
    setupSelectors();
    const { result } = renderHook(() =>
      useCampaignParticipantOutcome(undefined, CONFIG),
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
      useCampaignParticipantOutcome(CAMPAIGN_ID, CONFIG),
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
      useCampaignParticipantOutcome(CAMPAIGN_ID, CONFIG),
    );
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.outcome).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('sets hasError and clears outcome when the fetch throws', async () => {
    setupSelectors();
    mockCall.mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(() =>
      useCampaignParticipantOutcome(CAMPAIGN_ID, CONFIG),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(true);
    });

    expect(result.current.outcome).toBeNull();
  });

  it('resets state when campaignId changes to undefined', async () => {
    setupSelectors();
    mockCall.mockResolvedValue(MOCK_OUTCOME);

    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) =>
        useCampaignParticipantOutcome(id, CONFIG),
      { initialProps: { id: CAMPAIGN_ID } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.outcome).toEqual(MOCK_OUTCOME);
    });

    rerender({ id: undefined });

    await waitFor(() => {
      expect(result.current.outcome).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });
  });
});
