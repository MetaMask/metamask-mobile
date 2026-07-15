import { renderHook } from '@testing-library/react-hooks';
import { useGetPredictThePitchOutcome } from './useGetPredictThePitchOutcome';
import { useCampaignParticipantOutcome } from './useCampaignParticipantOutcome';

jest.mock('./useCampaignParticipantOutcome', () => ({
  useCampaignParticipantOutcome: jest.fn(),
}));

const mockUseCampaignParticipantOutcome =
  useCampaignParticipantOutcome as jest.MockedFunction<
    typeof useCampaignParticipantOutcome
  >;

describe('useGetPredictThePitchOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCampaignParticipantOutcome.mockReturnValue({
      outcome: null,
      isLoading: false,
      hasError: false,
    });
  });

  it('uses the Predict The Pitch participant outcome messenger action', () => {
    renderHook(() => useGetPredictThePitchOutcome('predict-campaign-1'));

    expect(mockUseCampaignParticipantOutcome).toHaveBeenCalledWith(
      'predict-campaign-1',
      {
        messengerAction:
          'RewardsController:getPredictThePitchParticipantOutcome',
      },
    );
  });
});
