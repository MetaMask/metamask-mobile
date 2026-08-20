import { renderHook } from '@testing-library/react-hooks';
import { useCampaignOutcomeToast } from './useCampaignOutcomeToast';
import { useGetPredictThePitchOutcomeToast } from './useGetPredictThePitchOutcomeToast';
import { useGetPredictThePitchOutcome } from './useGetPredictThePitchOutcome';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('./useCampaignOutcomeToast', () => ({
  useCampaignOutcomeToast: jest.fn(),
}));

jest.mock('./useGetPredictThePitchOutcome', () => ({
  useGetPredictThePitchOutcome: jest.fn(),
}));

const mockUseCampaignOutcomeToast =
  useCampaignOutcomeToast as jest.MockedFunction<
    typeof useCampaignOutcomeToast
  >;

const CAMPAIGN_ID = 'predict-campaign-1';
const CAMPAIGN_NAME = 'Predict The Pitch';

const makeCampaign = (id = CAMPAIGN_ID, name = CAMPAIGN_NAME): CampaignDto => ({
  id,
  name,
  type: CampaignType.PREDICT_THE_PITCH,
  endDate: '2026-07-01',
  startDate: '2026-06-01',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: false,
  showUpcomingDate: false,
});

describe('useGetPredictThePitchOutcomeToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useCampaignOutcomeToast with PREDICT_THE_PITCH campaign type', () => {
    renderHook(() => useGetPredictThePitchOutcomeToast());

    expect(mockUseCampaignOutcomeToast).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignType: CampaignType.PREDICT_THE_PITCH,
      }),
    );
  });

  it('passes useGetPredictThePitchOutcome as the outcome hook', () => {
    renderHook(() => useGetPredictThePitchOutcomeToast());

    expect(mockUseCampaignOutcomeToast).toHaveBeenCalledWith(
      expect.objectContaining({
        useOutcome: useGetPredictThePitchOutcome,
      }),
    );
  });

  it('routes winners to the Predict The Pitch winning view', () => {
    renderHook(() => useGetPredictThePitchOutcomeToast());

    const { getWinnerNavigation } =
      mockUseCampaignOutcomeToast.mock.calls[0][0];

    expect(getWinnerNavigation(makeCampaign())).toEqual({
      route: Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW,
      params: { campaignId: CAMPAIGN_ID, campaignName: CAMPAIGN_NAME },
    });
  });

  it('routes non-winners to the Predict The Pitch details view', () => {
    renderHook(() => useGetPredictThePitchOutcomeToast());

    const { getNonWinnerNavigation } =
      mockUseCampaignOutcomeToast.mock.calls[0][0];

    expect(getNonWinnerNavigation(makeCampaign())).toEqual({
      route: Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: CAMPAIGN_ID },
    });
  });
});
