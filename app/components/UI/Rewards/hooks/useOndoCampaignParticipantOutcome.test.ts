import { renderHook } from '@testing-library/react-hooks';
import { useOndoCampaignParticipantOutcome } from './useOndoCampaignParticipantOutcome';
import { useCampaignParticipantOutcome } from './useCampaignParticipantOutcome';

jest.mock('./useCampaignParticipantOutcome', () => ({
  useCampaignParticipantOutcome: jest.fn(),
}));

const mockUseCampaignParticipantOutcome =
  useCampaignParticipantOutcome as jest.MockedFunction<
    typeof useCampaignParticipantOutcome
  >;

const CAMPAIGN_ID = 'campaign-123';

describe('useOndoCampaignParticipantOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCampaignParticipantOutcome.mockReturnValue({
      outcome: null,
      isLoading: false,
      hasError: false,
    });
  });

  it('delegates to useCampaignParticipantOutcome with the Ondo messenger action', () => {
    renderHook(() => useOndoCampaignParticipantOutcome(CAMPAIGN_ID));

    expect(mockUseCampaignParticipantOutcome).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      {
        messengerAction: 'RewardsController:getOndoCampaignParticipantOutcome',
      },
    );
  });

  it('passes undefined campaignId through to the generic hook', () => {
    renderHook(() => useOndoCampaignParticipantOutcome(undefined));

    expect(mockUseCampaignParticipantOutcome).toHaveBeenCalledWith(undefined, {
      messengerAction: 'RewardsController:getOndoCampaignParticipantOutcome',
    });
  });

  it('returns the result from the generic hook', () => {
    const mockOutcome = {
      subscriptionId: 'sub-1',
      outcomeStatus: 'pending' as const,
      winnerVerificationCode: 'CODE',
    };
    mockUseCampaignParticipantOutcome.mockReturnValue({
      outcome: mockOutcome,
      isLoading: false,
      hasError: false,
    });

    const { result } = renderHook(() =>
      useOndoCampaignParticipantOutcome(CAMPAIGN_ID),
    );

    expect(result.current.outcome).toEqual(mockOutcome);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });
});
