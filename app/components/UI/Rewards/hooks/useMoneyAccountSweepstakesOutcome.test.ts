import { renderHook } from '@testing-library/react-hooks';
import { useMoneyAccountSweepstakesOutcome } from './useMoneyAccountSweepstakesOutcome';
import { useCampaignParticipantOutcome } from './useCampaignParticipantOutcome';

jest.mock('./useCampaignParticipantOutcome', () => ({
  useCampaignParticipantOutcome: jest.fn(),
}));

const mockUseCampaignParticipantOutcome = jest.mocked(
  useCampaignParticipantOutcome,
);

describe('useMoneyAccountSweepstakesOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCampaignParticipantOutcome.mockReturnValue({
      outcome: null,
      isLoading: false,
      hasError: false,
    });
  });

  it('uses the Money Account Sweepstakes participant outcome messenger action', () => {
    renderHook(() => useMoneyAccountSweepstakesOutcome('mas-campaign-1'));

    expect(mockUseCampaignParticipantOutcome).toHaveBeenCalledWith(
      'mas-campaign-1',
      {
        messengerAction:
          'RewardsController:getMoneyAccountSweepstakesParticipantOutcome',
      },
    );
  });

  it('returns the shared outcome result unchanged', () => {
    const outcome = {
      subscriptionId: 'sub-1',
      outcomeStatus: 'pending' as const,
      winnerVerificationCode: 'MAS-WIN-42',
      prizeAmountUsd: 250,
    };
    mockUseCampaignParticipantOutcome.mockReturnValue({
      outcome,
      isLoading: true,
      hasError: false,
    });

    const { result } = renderHook(() =>
      useMoneyAccountSweepstakesOutcome('mas-campaign-1'),
    );

    expect(result.current).toEqual({
      outcome,
      isLoading: true,
      hasError: false,
    });
  });
});
