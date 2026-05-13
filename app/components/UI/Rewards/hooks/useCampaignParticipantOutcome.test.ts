import { renderHook, act } from '@testing-library/react-hooks';
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

    const { result, waitForNextUpdate } = renderHook(() =>
      useCampaignParticipantOutcome(CAMPAIGN_ID, CONFIG),
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(mockCall).toHaveBeenCalledWith(
      MESSENGER_ACTION,
      CAMPAIGN_ID,
      SUBSCRIPTION_ID,
    );
    expect(result.current.outcome).toEqual(MOCK_OUTCOME);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('returns null outcome when campaignId is undefined', async () => {
    setupSelectors();
    const { result, waitForNextUpdate } = renderHook(() =>
      useCampaignParticipantOutcome(undefined, CONFIG),
    );
    await act(async () => {
      await waitForNextUpdate().catch(() => undefined);
    });
    expect(result.current.outcome).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns null outcome when subscriptionId is missing', async () => {
    setupSelectors({ subscriptionId: null });
    const { result, waitForNextUpdate } = renderHook(() =>
      useCampaignParticipantOutcome(CAMPAIGN_ID, CONFIG),
    );
    await act(async () => {
      await waitForNextUpdate().catch(() => undefined);
    });
    expect(result.current.outcome).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns null outcome when user is not opted in', async () => {
    setupSelectors({ isOptedIn: false });
    const { result, waitForNextUpdate } = renderHook(() =>
      useCampaignParticipantOutcome(CAMPAIGN_ID, CONFIG),
    );
    await act(async () => {
      await waitForNextUpdate().catch(() => undefined);
    });
    expect(result.current.outcome).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('sets hasError and clears outcome when the fetch throws', async () => {
    setupSelectors();
    mockCall.mockRejectedValue(new Error('fetch failed'));

    const { result, waitForNextUpdate } = renderHook(() =>
      useCampaignParticipantOutcome(CAMPAIGN_ID, CONFIG),
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.outcome).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(true);
  });

  it('resets state when campaignId changes to undefined', async () => {
    setupSelectors();
    mockCall.mockResolvedValue(MOCK_OUTCOME);

    const initialProps: { id: string | undefined } = { id: CAMPAIGN_ID };
    const { result, waitForNextUpdate, rerender } = renderHook(
      ({ id }: { id: string | undefined }) =>
        useCampaignParticipantOutcome(id, CONFIG),
      { initialProps },
    );

    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.outcome).toEqual(MOCK_OUTCOME);

    rerender({ id: undefined });
    await act(async () => {
      await waitForNextUpdate().catch(() => undefined);
    });
    expect(result.current.outcome).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });
});
