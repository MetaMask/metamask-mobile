import { renderHook } from '@testing-library/react-hooks';
import { usePerpsTradingCampaignParticipantOutcome } from './usePerpsTradingCampaignParticipantOutcome';
import { useCampaignParticipantOutcome } from './useCampaignParticipantOutcome';

jest.mock('./useCampaignParticipantOutcome', () => ({
  useCampaignParticipantOutcome: jest.fn(),
}));

const mockUseCampaignParticipantOutcome =
  useCampaignParticipantOutcome as jest.MockedFunction<
    typeof useCampaignParticipantOutcome
  >;

const CAMPAIGN_ID = 'campaign-xyz';

describe('usePerpsTradingCampaignParticipantOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCampaignParticipantOutcome.mockReturnValue({
      outcome: null,
      isLoading: false,
      hasError: false,
    });
  });

  it('delegates to useCampaignParticipantOutcome with the Perps messenger action', () => {
    renderHook(() => usePerpsTradingCampaignParticipantOutcome(CAMPAIGN_ID));

    expect(mockUseCampaignParticipantOutcome).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      {
        messengerAction:
          'RewardsController:getPerpsTradingCampaignParticipantOutcome',
      },
    );
  });

  it('passes undefined campaignId through to the generic hook', () => {
    renderHook(() => usePerpsTradingCampaignParticipantOutcome(undefined));

    expect(mockUseCampaignParticipantOutcome).toHaveBeenCalledWith(undefined, {
      messengerAction:
        'RewardsController:getPerpsTradingCampaignParticipantOutcome',
    });
  });

  it('returns the result from the generic hook', () => {
    const mockOutcome = {
      subscriptionId: 'sub-1',
      outcomeStatus: 'pending' as const,
      winnerVerificationCode: 'CODE',
      rank: 3,
    };
    mockUseCampaignParticipantOutcome.mockReturnValue({
      outcome: mockOutcome,
      isLoading: false,
      hasError: false,
    });

    const { result } = renderHook(() =>
      usePerpsTradingCampaignParticipantOutcome(CAMPAIGN_ID),
    );

    expect(result.current.outcome).toEqual(mockOutcome);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });
});
